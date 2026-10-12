import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import api, { cleanParams } from '../services/api'
import { useFetch } from '../hooks/useFetch'
import { useDebounce } from '../hooks/useDebounce'
import { useToast } from '../hooks/useToast'
import DataState, { EmptyBlock } from '../components/DataState'
import Modal, { ConfirmDialog, FormActions } from '../components/Modal'
import Icon from '../components/Icon'
import { Field, PageHeader, SearchInput, Select, StatCard, StatusBadge, Toolbar } from '../components/ui'
import { taskSchema } from '../schemas'
import type { TaskValues } from '../schemas'
import type { Task, TaskStats } from '../types'
import { PRIORITIES } from '../utils/constants'
import { formatDateTime, toDateTimeInput } from '../utils/format'

const LABEL_TONE: Record<string, string> = { Overdue: 'overdue', 'Due today': 'high', 'Due tomorrow': 'pending', 'Due soon': 'processing', Upcoming: 'low', Completed: 'completed' }
const SORTS = [{ value: 'dueDate', label: 'Sort: due date' }, { value: 'priority', label: 'Sort: priority' }, { value: 'title', label: 'Sort: title' }, { value: 'createdAt', label: 'Sort: newest' }]

function TaskForm({ editing, onDone, onCancel }: { editing: Task | null; onDone: () => void; onCancel: () => void }) {
  const toast = useToast()
  const tomorrow = new Date(Date.now() + 86400000); tomorrow.setHours(17, 0, 0, 0)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<TaskValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: editing
      ? { title: editing.title, subject: editing.subject, description: editing.description ?? '', dueDate: toDateTimeInput(editing.dueDate), priority: editing.priority, status: editing.status }
      : { title: '', subject: '', description: '', dueDate: toDateTimeInput(tomorrow), priority: 'medium', status: 'pending' },
  })
  const onSubmit = async (values: TaskValues) => {
    const payload = { ...values, dueDate: new Date(values.dueDate).toISOString() }
    try {
      if (editing) await api.put(`/tasks/${editing._id}`, payload); else await api.post('/tasks', payload)
      toast.success(editing ? 'Task updated' : 'Task created')
      onDone()
    } catch (err) { toast.error(err) }
  }
  const cls = (bad: unknown) => `input ${bad ? 'input-error' : ''}`
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
      <Field label="Title" error={errors.title?.message} className="sm:col-span-2"><input className={cls(errors.title)} placeholder="e.g. Submit lab report" {...register('title')} /></Field>
      <Field label="Subject" error={errors.subject?.message}><input className={cls(errors.subject)} placeholder="ITE301" {...register('subject')} /></Field>
      <Field label="Due date and time" error={errors.dueDate?.message}><input type="datetime-local" className={cls(errors.dueDate)} {...register('dueDate')} /></Field>
      <Field label="Priority" error={errors.priority?.message}>
        <select className={cls(errors.priority)} {...register('priority')}>{PRIORITIES.map((p) => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}</select>
      </Field>
      <Field label="Status" error={errors.status?.message} hint="Overdue is calculated automatically.">
        <select className={cls(errors.status)} {...register('status')}><option value="pending">Pending</option><option value="completed">Completed</option></select>
      </Field>
      <Field label="Description" error={errors.description?.message} hint="Optional" className="sm:col-span-2"><textarea rows={3} className={cls(errors.description)} {...register('description')} /></Field>
      <div className="sm:col-span-2"><FormActions onCancel={onCancel} busy={isSubmitting} label={editing ? 'Save changes' : 'Create task'} /></div>
    </form>
  )
}

export default function Tasks() {
  const toast = useToast()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [sort, setSort] = useState('dueDate')
  const search = useDebounce(q)
  const list = useFetch<Task[]>('/tasks', cleanParams({ q: search, status, priority, sort, order: sort === 'createdAt' ? 'desc' : 'asc' }))
  const stats = useFetch<TaskStats>('/tasks/statistics')
  const [form, setForm] = useState<{ open: boolean; editing: Task | null }>({ open: false, editing: null })
  const [deleting, setDeleting] = useState<Task | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const filtered = Boolean(search || status || priority)
  const refresh = () => { list.reload(); stats.reload() }

  const toggle = async (task: Task) => {
    setBusyId(task._id)
    try {
      await api.put(`/tasks/${task._id}`, { status: task.status === 'completed' ? 'pending' : 'completed' })
      toast.success(task.status === 'completed' ? 'Task reopened' : 'Task completed')
      refresh()
    } catch (err) { toast.error(err) } finally { setBusyId(null) }
  }
  const remove = async () => {
    if (!deleting) return
    setBusyId(deleting._id)
    try { await api.delete(`/tasks/${deleting._id}`); toast.success('Task deleted'); setDeleting(null); refresh() } catch (err) { toast.error(err) } finally { setBusyId(null) }
  }
  const s = stats.data

  return (
    <>
      <PageHeader eyebrow="My campus" title="Tasks and deadlines" description="Overdue and due-soon labels are calculated from each due date. Completed tasks are never marked overdue."
        actions={<button type="button" className="btn-primary" onClick={() => setForm({ open: true, editing: null })}><Icon name="plus" className="h-4 w-4" />New task</button>} />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Pending" value={s ? s.pending : '–'} hint={s ? `${s.dueToday} due today · ${s.dueSoon} due soon` : stats.error ? 'Unavailable' : 'Loading…'} icon="clock" tone="amber" />
        <StatCard label="Overdue" value={s ? s.overdue : '–'} hint="Past due, not completed" icon="alert" tone="rose" />
        <StatCard label="Completed" value={s ? s.completed : '–'} hint={s ? `${s.completionRate}% completion rate` : ''} icon="check" tone="teal" />
        <StatCard label="All tasks" value={s ? s.total : '–'} hint={s ? `${s.bySubject.length} subjects` : ''} icon="chart" />
      </div>

      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Search title, subject or notes" />
        <Select value={status} onChange={setStatus} options={['pending', 'overdue', 'completed']} all="All statuses" label="Filter by status" />
        <Select value={priority} onChange={setPriority} options={PRIORITIES} all="All priorities" label="Filter by priority" />
        <Select value={sort} onChange={setSort} options={SORTS} label="Sort tasks" />
      </Toolbar>

      <DataState state={list} loadingLabel="Loading tasks…" isEmpty={(rows) => rows.length === 0}
        empty={<EmptyBlock icon="check" title={filtered ? 'No tasks match your filters' : 'No tasks yet'} hint={filtered ? 'Try clearing a filter.' : 'Create your first task to start tracking deadlines.'}
          action={filtered ? <button type="button" className="btn-secondary" onClick={() => { setQ(''); setStatus(''); setPriority('') }}>Clear filters</button> : <button type="button" className="btn-primary" onClick={() => setForm({ open: true, editing: null })}>New task</button>} />}>
        {(rows) => (
          <ul className="space-y-2">
            {rows.map((t) => (
              <li key={t._id} className={`card flex flex-col gap-3 p-4 sm:flex-row sm:items-center ${t.effectiveStatus === 'overdue' ? 'border-l-4 border-l-rose-500' : ''}`}>
                <button type="button" onClick={() => toggle(t)} disabled={busyId === t._id} aria-label={t.status === 'completed' ? `Reopen ${t.title}` : `Mark ${t.title} as completed`} aria-pressed={t.status === 'completed'}
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 text-xs font-bold transition ${t.status === 'completed' ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300 text-transparent hover:border-indigo-500'}`}>✓</button>
                <div className="min-w-0 flex-1">
                  <p className={`font-semibold ${t.status === 'completed' ? 'text-slate-400 line-through' : 'text-navy-900'}`}>{t.title}</p>
                  <p className="text-xs text-slate-500">{t.subject} · Due {formatDateTime(t.dueDate)}</p>
                  {t.description && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{t.description}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge value={t.priority} label={`${t.priority[0].toUpperCase()}${t.priority.slice(1)} priority`} />
                  <StatusBadge value={LABEL_TONE[t.deadlineLabel] ?? 'low'} label={t.deadlineLabel} />
                  <button type="button" className="btn-ghost btn-sm" onClick={() => setForm({ open: true, editing: t })}>Edit</button>
                  <button type="button" className="btn-ghost btn-sm text-rose-600 hover:text-rose-700" onClick={() => setDeleting(t)}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DataState>

      <Modal open={form.open} title={form.editing ? 'Edit task' : 'New task'} onClose={() => setForm({ open: false, editing: null })}>
        <TaskForm key={form.editing?._id ?? 'new'} editing={form.editing} onCancel={() => setForm({ open: false, editing: null })} onDone={() => { setForm({ open: false, editing: null }); refresh() }} />
      </Modal>
      <ConfirmDialog open={Boolean(deleting)} title="Delete this task?" busy={busyId === deleting?._id} onCancel={() => setDeleting(null)} onConfirm={remove}
        message={<>“<b>{deleting?.title}</b>” will be permanently removed.</>} />
    </>
  )
}
