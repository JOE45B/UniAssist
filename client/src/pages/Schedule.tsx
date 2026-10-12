import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import api from '../services/api'
import { cleanParams } from '../services/api'
import { useFetch } from '../hooks/useFetch'
import { useDebounce } from '../hooks/useDebounce'
import { useToast } from '../hooks/useToast'
import DataState, { EmptyBlock } from '../components/DataState'
import Modal, { ConfirmDialog, FormActions } from '../components/Modal'
import Icon from '../components/Icon'
import { Field, PageHeader, SearchInput, Select, Toolbar } from '../components/ui'
import { scheduleSchema } from '../schemas'
import type { ScheduleValues } from '../schemas'
import type { Schedule } from '../types'
import { DAYS } from '../utils/constants'
import { formatRange } from '../utils/format'

const BLANK: ScheduleValues = { courseCode: '', courseName: '', instructor: '', room: '', day: 'Monday', startTime: '08:00', endTime: '09:30' }

function ScheduleForm({ editing, onDone, onCancel }: { editing: Schedule | null; onDone: () => void; onCancel: () => void }) {
  const toast = useToast()
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<ScheduleValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: editing ? { ...BLANK, ...editing, day: editing.day as ScheduleValues['day'] } : BLANK,
  })
  const onSubmit = async (values: ScheduleValues) => {
    try {
      if (editing) await api.put(`/schedules/${editing._id}`, values); else await api.post('/schedules', values)
      toast.success(editing ? 'Class updated' : 'Class added to your schedule')
      onDone()
    } catch (err) {
      // Overlap conflicts come back from the server; show them on the form as well.
      if ((err as { response?: { status?: number; data?: { message?: string } } }).response?.status === 409) setError('startTime', { message: (err as { response: { data: { message: string } } }).response.data.message })
      toast.error(err)
    }
  }
  const cls = (bad: unknown) => `input ${bad ? 'input-error' : ''}`
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
      <Field label="Course code" error={errors.courseCode?.message}><input className={cls(errors.courseCode)} placeholder="ITE301" {...register('courseCode')} /></Field>
      <Field label="Room" error={errors.room?.message}><input className={cls(errors.room)} placeholder="Lab 402" {...register('room')} /></Field>
      <Field label="Course name" error={errors.courseName?.message} className="sm:col-span-2"><input className={cls(errors.courseName)} {...register('courseName')} /></Field>
      <Field label="Instructor" error={errors.instructor?.message} className="sm:col-span-2"><input className={cls(errors.instructor)} {...register('instructor')} /></Field>
      <Field label="Day" error={errors.day?.message} className="sm:col-span-2">
        <select className={cls(errors.day)} {...register('day')}>{DAYS.map((d) => <option key={d}>{d}</option>)}</select>
      </Field>
      <Field label="Start time" error={errors.startTime?.message}><input type="time" className={cls(errors.startTime)} {...register('startTime')} /></Field>
      <Field label="End time" error={errors.endTime?.message}><input type="time" className={cls(errors.endTime)} {...register('endTime')} /></Field>
      <div className="sm:col-span-2"><FormActions onCancel={onCancel} busy={isSubmitting} label={editing ? 'Save changes' : 'Add class'} /></div>
    </form>
  )
}

export default function SchedulePage() {
  const toast = useToast()
  const [q, setQ] = useState('')
  const [day, setDay] = useState('')
  const search = useDebounce(q)
  const state = useFetch<Schedule[]>('/schedules', cleanParams({ q: search, day }))
  const [form, setForm] = useState<{ open: boolean; editing: Schedule | null }>({ open: false, editing: null })
  const [deleting, setDeleting] = useState<Schedule | null>(null)
  const [busy, setBusy] = useState(false)
  const filtered = Boolean(search || day)

  const remove = async () => {
    if (!deleting) return
    setBusy(true)
    try { await api.delete(`/schedules/${deleting._id}`); toast.success('Class removed'); setDeleting(null); state.reload() } catch (err) { toast.error(err) } finally { setBusy(false) }
  }
  const visibleDays = day ? DAYS.filter((d) => d === day) : DAYS

  return (
    <>
      <PageHeader eyebrow="My campus" title="Class schedule" description="Your weekly timetable. Overlapping classes are detected and blocked when you save."
        actions={<button type="button" className="btn-primary" onClick={() => setForm({ open: true, editing: null })}><Icon name="plus" className="h-4 w-4" />Add class</button>} />
      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Search course, instructor or room" />
        <Select value={day} onChange={setDay} options={DAYS} all="All days" label="Filter by day" />
      </Toolbar>
      <DataState state={state} loadingLabel="Loading your schedule…" isEmpty={(rows) => rows.length === 0}
        empty={<EmptyBlock icon="calendar" title={filtered ? 'No classes match your filters' : 'No classes yet'} hint={filtered ? 'Try a different search or day.' : 'Add your first class to build your weekly timetable.'}
          action={filtered ? <button type="button" className="btn-secondary" onClick={() => { setQ(''); setDay('') }}>Clear filters</button> : <button type="button" className="btn-primary" onClick={() => setForm({ open: true, editing: null })}>Add class</button>} />}>
        {(rows) => (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleDays.map((d) => {
              const classes = rows.filter((r) => r.day === d)
              return (
                <section key={d} className="card p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-base">{d}</h2>
                    <span className="text-xs font-semibold text-slate-500">{classes.length} {classes.length === 1 ? 'class' : 'classes'}</span>
                  </div>
                  {classes.length === 0 ? <p className="rounded-xl bg-slate-50 px-3 py-5 text-center text-sm text-slate-400">Free day</p> : (
                    <ul className="space-y-2">
                      {classes.map((c) => (
                        <li key={c._id} className="rounded-xl border border-slate-200 border-l-4 border-l-indigo-500 p-3">
                          <p className="text-xs font-bold text-indigo-700">{formatRange(c.startTime, c.endTime)}</p>
                          <p className="mt-0.5 font-semibold text-navy-900">{c.courseCode} · {c.courseName}</p>
                          <p className="text-xs text-slate-500">{c.room} · {c.instructor}</p>
                          <div className="mt-2 flex gap-1">
                            <button type="button" className="btn-ghost btn-sm" onClick={() => setForm({ open: true, editing: c })}>Edit</button>
                            <button type="button" className="btn-ghost btn-sm text-rose-600 hover:text-rose-700" onClick={() => setDeleting(c)}>Delete</button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )
            })}
          </div>
        )}
      </DataState>

      <Modal open={form.open} title={form.editing ? 'Edit class' : 'Add class'} onClose={() => setForm({ open: false, editing: null })}>
        <ScheduleForm key={form.editing?._id ?? 'new'} editing={form.editing} onCancel={() => setForm({ open: false, editing: null })} onDone={() => { setForm({ open: false, editing: null }); state.reload() }} />
      </Modal>
      <ConfirmDialog open={Boolean(deleting)} title="Remove this class?" busy={busy} onCancel={() => setDeleting(null)} onConfirm={remove}
        message={<>This removes <b>{deleting?.courseCode} · {deleting?.courseName}</b> ({deleting?.day}) from your schedule.</>} />
    </>
  )
}
