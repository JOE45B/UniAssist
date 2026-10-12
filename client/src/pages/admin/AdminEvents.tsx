import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import api, { cleanParams } from '../../services/api'
import { useFetch } from '../../hooks/useFetch'
import { useDebounce } from '../../hooks/useDebounce'
import { useToast } from '../../hooks/useToast'
import DataState, { EmptyBlock } from '../../components/DataState'
import Modal, { ConfirmDialog, FormActions } from '../../components/Modal'
import Icon from '../../components/Icon'
import { Field, PageHeader, Progress, SearchInput, Select, StatCard, StatusBadge, TableCard, Toolbar } from '../../components/ui'
import { eventSchema } from '../../schemas'
import type { EventValues } from '../../schemas'
import type { CampusEvent, EventStats, UserRef } from '../../types'
import { EVENT_CATEGORIES } from '../../utils/constants'
import { formatRange, formatWeekday, toDateInput } from '../../utils/format'

interface Attendees { title: string; capacity: number; registeredCount: number; attendees: UserRef[] }

function EventForm({ editing, onDone, onCancel }: { editing: CampusEvent | null; onDone: () => void; onCancel: () => void }) {
  const toast = useToast()
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<EventValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: editing
      ? { title: editing.title, description: editing.description, location: editing.location, date: editing.date, startTime: editing.startTime, endTime: editing.endTime, category: editing.category as EventValues['category'], capacity: editing.capacity }
      : { title: '', description: '', location: '', date: toDateInput(new Date(Date.now() + 7 * 86400000)), startTime: '09:00', endTime: '11:00', category: 'Seminar', capacity: 50 },
  })
  const onSubmit = async (values: EventValues) => {
    try {
      if (editing) await api.put(`/events/${editing._id}`, values); else await api.post('/events', values)
      toast.success(editing ? 'Event updated' : 'Event created')
      onDone()
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      if (message?.startsWith('Capacity')) setError('capacity', { message })
      toast.error(err)
    }
  }
  const cls = (bad: unknown) => `input ${bad ? 'input-error' : ''}`
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
      <Field label="Title" error={errors.title?.message} className="sm:col-span-2"><input className={cls(errors.title)} {...register('title')} /></Field>
      <Field label="Description" error={errors.description?.message} className="sm:col-span-2"><textarea rows={3} className={cls(errors.description)} {...register('description')} /></Field>
      <Field label="Location" error={errors.location?.message}><input className={cls(errors.location)} {...register('location')} /></Field>
      <Field label="Category" error={errors.category?.message}><select className={cls(errors.category)} {...register('category')}>{EVENT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
      <Field label="Date" error={errors.date?.message}><input type="date" className={cls(errors.date)} {...register('date')} /></Field>
      <Field label="Capacity" error={errors.capacity?.message} hint={editing ? `${editing.registeredCount} already registered` : undefined}><input type="number" min={1} inputMode="numeric" className={cls(errors.capacity)} {...register('capacity', { valueAsNumber: true })} /></Field>
      <Field label="Start time" error={errors.startTime?.message}><input type="time" className={cls(errors.startTime)} {...register('startTime')} /></Field>
      <Field label="End time" error={errors.endTime?.message}><input type="time" className={cls(errors.endTime)} {...register('endTime')} /></Field>
      <div className="sm:col-span-2"><FormActions onCancel={onCancel} busy={isSubmitting} label={editing ? 'Save changes' : 'Create event'} /></div>
    </form>
  )
}

function AttendeeList({ eventId }: { eventId: string }) {
  const state = useFetch<Attendees>(`/events/${eventId}/registrations`)
  return (
    <DataState state={state} loadingLabel="Loading attendees…" isEmpty={(d) => d.attendees.length === 0} empty={<EmptyBlock icon="users" title="No one has registered yet" />}>
      {(d) => (
        <>
          <p className="mb-3 text-sm text-slate-600"><b>{d.registeredCount}</b> of {d.capacity} slots taken · {d.capacity - d.registeredCount} remaining</p>
          <ol className="divide-y divide-slate-100">
            {d.attendees.map((u, i) => (
              <li key={u._id} className="flex items-center gap-3 py-2 text-sm">
                <span className="w-6 text-right tabular-nums text-slate-400">{i + 1}</span>
                <span className="min-w-0 flex-1"><span className="block truncate font-semibold text-navy-900">{u.name}</span><span className="block truncate text-xs text-slate-500">{[u.idNumber, u.program].filter(Boolean).join(' · ') || u.email}</span></span>
              </li>
            ))}
          </ol>
        </>
      )}
    </DataState>
  )
}

export default function AdminEvents() {
  const toast = useToast()
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [eventState, setEventState] = useState('')
  const search = useDebounce(q)
  const list = useFetch<CampusEvent[]>('/events', cleanParams({ q: search, category, state: eventState }))
  const stats = useFetch<EventStats>('/events/statistics')
  const [form, setForm] = useState<{ open: boolean; editing: CampusEvent | null }>({ open: false, editing: null })
  const [viewing, setViewing] = useState<CampusEvent | null>(null)
  const [deleting, setDeleting] = useState<CampusEvent | null>(null)
  const [busy, setBusy] = useState(false)
  const filtered = Boolean(search || category || eventState)
  const refresh = () => { list.reload(); stats.reload() }

  const remove = async () => {
    if (!deleting) return
    setBusy(true)
    try { await api.delete(`/events/${deleting._id}`); toast.success('Event deleted'); setDeleting(null); refresh() } catch (err) { toast.error(err) } finally { setBusy(false) }
  }
  const s = stats.data
  const add = <button type="button" className="btn-primary" onClick={() => setForm({ open: true, editing: null })}><Icon name="plus" className="h-4 w-4" />New event</button>

  return (
    <>
      <PageHeader eyebrow="Manage" title="Events" description="Create events, set capacity and see who registered." actions={add} />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Upcoming events" value={s ? s.upcoming : '–'} hint={s ? `${s.total} total` : ''} icon="ticket" />
        <StatCard label="Registrations" value={s ? s.totalRegistrations : '–'} hint={s ? `of ${s.totalCapacity} total slots` : ''} icon="users" tone="violet" />
        <StatCard label="Slots remaining" value={s ? s.remainingSlots : '–'} hint={s ? `${s.averageFillRate}% filled overall` : ''} icon="chart" tone="teal" />
        <StatCard label="Full events" value={s ? s.full : '–'} hint="At capacity" icon="alert" tone="rose" />
      </div>
      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Search events" />
        <Select value={category} onChange={setCategory} options={EVENT_CATEGORIES} all="All categories" label="Filter by category" />
        <Select value={eventState} onChange={setEventState} options={['upcoming', 'ongoing', 'past']} all="Any time" label="Filter by time" />
      </Toolbar>
      <DataState state={list} loadingLabel="Loading events…" isEmpty={(rows) => rows.length === 0}
        empty={<EmptyBlock icon="ticket" title={filtered ? 'No events match your filters' : 'No events yet'} hint={filtered ? 'Try clearing a filter.' : 'Create the first campus event.'} action={!filtered ? add : undefined} />}>
        {(rows) => (
          <TableCard head={<><th className="th">Event</th><th className="th">When</th><th className="th">Category</th><th className="th">Registrations</th><th className="th">State</th><th className="th text-right">Actions</th></>}>
            {rows.map((e) => (
              <tr key={e._id} className="hover:bg-slate-50/60">
                <td className="td max-w-64"><p className="font-semibold text-navy-900">{e.title}</p><p className="truncate text-xs text-slate-500">{e.location}</p></td>
                <td className="td whitespace-nowrap"><p className="text-navy-900">{formatWeekday(e.date)}</p><p className="text-xs text-slate-500">{formatRange(e.startTime, e.endTime)}</p></td>
                <td className="td whitespace-nowrap text-slate-600">{e.category}</td>
                <td className="td min-w-40">
                  <p className="mb-1 text-xs"><b className="tabular-nums text-navy-900">{e.registeredCount}/{e.capacity}</b> <span className={e.isFull ? 'font-semibold text-rose-600' : 'text-slate-500'}>· {e.isFull ? 'Full' : `${e.remainingSlots} left`}</span></p>
                  <Progress value={e.fillRate} tone={e.isFull ? 'rose' : 'indigo'} />
                </td>
                <td className="td"><StatusBadge value={e.state} /></td>
                <td className="td">
                  <div className="flex justify-end gap-1">
                    <button type="button" className="btn-ghost btn-sm" onClick={() => setViewing(e)}>Attendees</button>
                    <button type="button" className="btn-ghost btn-sm" onClick={() => setForm({ open: true, editing: e })}>Edit</button>
                    <button type="button" className="btn-ghost btn-sm text-rose-600" onClick={() => setDeleting(e)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </TableCard>
        )}
      </DataState>
      <Modal open={form.open} wide title={form.editing ? 'Edit event' : 'New event'} onClose={() => setForm({ open: false, editing: null })}>
        <EventForm key={form.editing?._id ?? 'new'} editing={form.editing} onCancel={() => setForm({ open: false, editing: null })} onDone={() => { setForm({ open: false, editing: null }); refresh() }} />
      </Modal>
      <Modal open={Boolean(viewing)} title={viewing ? `Attendees · ${viewing.title}` : 'Attendees'} onClose={() => setViewing(null)}>
        {viewing && <AttendeeList eventId={viewing._id} />}
      </Modal>
      <ConfirmDialog open={Boolean(deleting)} title="Delete this event?" busy={busy} onCancel={() => setDeleting(null)} onConfirm={remove}
        message={<>“<b>{deleting?.title}</b>” and its {deleting?.registeredCount} registration(s) will be permanently removed.</>} />
    </>
  )
}
