import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import api, { cleanParams } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import { useFetch } from '../hooks/useFetch'
import { useToast } from '../hooks/useToast'
import DataState, { EmptyBlock } from '../components/DataState'
import Modal, { ConfirmDialog, FormActions } from '../components/Modal'
import SlotPicker from '../components/SlotPicker'
import Icon from '../components/Icon'
import { Field, PageHeader, Select, StatusBadge, TableCard, Toolbar } from '../components/ui'
import { appointmentSchema } from '../schemas'
import type { AppointmentValues } from '../schemas'
import type { Appointment, AppointmentAvailability, UserRef } from '../types'
import { DEPARTMENTS, OFFICE_HOURS } from '../utils/constants'
import { formatRange, formatWeekday, timeOptions, toDateInput } from '../utils/format'

const TIMES = timeOptions(OFFICE_HOURS.open, OFFICE_HOURS.close)
const STATUSES = ['scheduled', 'completed', 'cancelled']

function AppointmentForm({ editing, onDone, onCancel }: { editing: Appointment | null; onDone: () => void; onCancel: () => void }) {
  const toast = useToast()
  const { user } = useAuth()
  const staff = useFetch<UserRef[]>('/users/staff')
  const { register, handleSubmit, control, setValue, setError, formState: { errors, isSubmitting } } = useForm<AppointmentValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: editing
      ? { department: editing.department as AppointmentValues['department'], staff: editing.staff._id, date: editing.date, startTime: editing.startTime, endTime: editing.endTime, purpose: editing.purpose }
      : { department: 'Registrar', staff: '', date: '', startTime: '09:00', endTime: '09:30', purpose: '' },
  })
  const [staffId, date, startTime] = useWatch({ control, name: ['staff', 'date', 'startTime'] })
  const ready = Boolean(staffId && /^\d{4}-\d{2}-\d{2}$/.test(date))
  const availability = useFetch<AppointmentAvailability>(ready ? '/appointments/availability' : null, { staff: staffId, date })
  // When rescheduling, the appointment's own slot should not be shown as taken.
  const booked = (availability.data?.booked ?? []).filter((b) => !(editing && editing.date === date && editing.staff._id === staffId && b.startTime === editing.startTime))

  const onSubmit = async (values: AppointmentValues) => {
    try {
      if (editing) await api.put(`/appointments/${editing._id}`, values); else await api.post('/appointments', values)
      toast.success(editing ? 'Appointment rescheduled' : 'Appointment booked')
      onDone()
    } catch (err) {
      const res = (err as { response?: { status?: number; data?: { message?: string } } }).response
      if (res?.status === 409) { setError('startTime', { message: res.data?.message ?? 'That time is already booked' }); availability.reload() }
      toast.error(err)
    }
  }
  const cls = (bad: unknown) => `input ${bad ? 'input-error' : ''}`
  const options = (staff.data ?? []).filter((s) => s._id !== user?._id)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
      <Field label="Department" error={errors.department?.message}>
        <select className={cls(errors.department)} {...register('department')}>{DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}</select>
      </Field>
      <Field label="Staff member" error={errors.staff?.message ?? (staff.error ? `Could not load staff: ${staff.error}` : undefined)}>
        <select className={cls(errors.staff)} {...register('staff')} disabled={staff.loading}>
          <option value="">{staff.loading ? 'Loading staff…' : 'Choose a staff member'}</option>
          {options.map((s) => <option key={s._id} value={s._id}>{s.name}{s.department ? ` — ${s.department}` : ''}</option>)}
        </select>
      </Field>
      <Field label="Date" error={errors.date?.message} className="sm:col-span-2"><input type="date" min={toDateInput()} className={cls(errors.date)} {...register('date')} /></Field>
      <div className="sm:col-span-2">
        <SlotPicker ready={ready} loading={availability.loading} error={availability.error} booked={booked} free={availability.data?.freeSlots ?? []} selectedStart={startTime}
          prompt="Choose a staff member and a date to see free 30-minute slots."
          onPick={(s) => { setValue('startTime', s.startTime, { shouldValidate: true }); setValue('endTime', s.endTime, { shouldValidate: true }) }} />
      </div>
      <Field label="Start time" error={errors.startTime?.message}><select className={cls(errors.startTime)} {...register('startTime')}>{TIMES.slice(0, -1).map((t) => <option key={t}>{t}</option>)}</select></Field>
      <Field label="End time" error={errors.endTime?.message}><select className={cls(errors.endTime)} {...register('endTime')}>{TIMES.slice(1).map((t) => <option key={t}>{t}</option>)}</select></Field>
      <Field label="Purpose" error={errors.purpose?.message} className="sm:col-span-2"><textarea rows={3} className={cls(errors.purpose)} placeholder="What would you like to discuss?" {...register('purpose')} /></Field>
      <div className="sm:col-span-2"><FormActions onCancel={onCancel} busy={isSubmitting} label={editing ? 'Save changes' : 'Book appointment'} /></div>
    </form>
  )
}

/** `/appointments` shows the signed-in user's bookings; `/admin/appointments` (manage) shows everyone's. */
export default function Appointments({ manage = false }: { manage?: boolean }) {
  const toast = useToast()
  const { isAdmin } = useAuth()
  const [status, setStatus] = useState('')
  const [department, setDepartment] = useState('')
  const [date, setDate] = useState('')
  const list = useFetch<Appointment[]>('/appointments', cleanParams({ mine: manage ? undefined : true, status, department, date, order: 'desc' }))
  const [form, setForm] = useState<{ open: boolean; editing: Appointment | null }>({ open: false, editing: null })
  const [confirm, setConfirm] = useState<{ kind: 'cancel' | 'delete' | 'complete'; item: Appointment } | null>(null)
  const [busy, setBusy] = useState(false)
  const filtered = Boolean(status || department || date)

  const run = async () => {
    if (!confirm) return
    setBusy(true)
    try {
      if (confirm.kind === 'delete') await api.delete(`/appointments/${confirm.item._id}`)
      else await api.patch(`/appointments/${confirm.item._id}/${confirm.kind}`)
      toast.success({ cancel: 'Appointment cancelled. The slot is free again.', delete: 'Appointment deleted', complete: 'Appointment marked as completed' }[confirm.kind])
      setConfirm(null); list.reload()
    } catch (err) { toast.error(err) } finally { setBusy(false) }
  }
  const book = <button type="button" className="btn-primary" onClick={() => setForm({ open: true, editing: null })}><Icon name="plus" className="h-4 w-4" />Book appointment</button>

  return (
    <>
      <PageHeader eyebrow={manage ? 'Manage' : 'My campus'} title={manage ? 'All appointments' : 'Appointments'}
        description={manage ? 'Every appointment on campus. Complete, cancel or reschedule bookings.' : 'Book time with a university office. A staff member can never be double-booked.'} actions={!manage && book} />
      <Toolbar>
        <Select value={status} onChange={setStatus} options={STATUSES} all="All statuses" label="Filter by status" />
        <Select value={department} onChange={setDepartment} options={DEPARTMENTS} all="All departments" label="Filter by department" />
        <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Filter by date" title="Filter by date" />
        {filtered && <button type="button" className="btn-ghost" onClick={() => { setStatus(''); setDepartment(''); setDate('') }}>Clear filters</button>}
      </Toolbar>
      <DataState state={list} loadingLabel="Loading appointments…" isEmpty={(rows) => rows.length === 0}
        empty={<EmptyBlock icon="clock" title={filtered ? 'No appointments match your filters' : 'No appointments yet'} hint={filtered ? 'Try clearing a filter.' : manage ? 'Bookings will appear here.' : 'Book a slot with the registrar, guidance or your adviser.'} action={!manage && !filtered ? book : undefined} />}>
        {(rows) => (
          <TableCard head={<><th className="th">When</th>{manage && <th className="th">Student</th>}<th className="th">With</th><th className="th">Purpose</th><th className="th">Status</th><th className="th text-right">Actions</th></>}>
            {rows.map((a) => (
              <tr key={a._id} className="hover:bg-slate-50/60">
                <td className="td whitespace-nowrap"><p className="font-semibold text-navy-900">{formatWeekday(a.date)}</p><p className="text-xs text-slate-500">{formatRange(a.startTime, a.endTime)}</p></td>
                {manage && <td className="td whitespace-nowrap text-slate-600">{a.user?.name ?? '—'}</td>}
                <td className="td whitespace-nowrap"><p className="font-semibold text-navy-900">{a.staff?.name ?? '—'}</p><p className="text-xs text-slate-500">{a.department}</p></td>
                <td className="td max-w-xs text-slate-600"><span className="line-clamp-2">{a.purpose}</span></td>
                <td className="td"><StatusBadge value={a.status} /></td>
                <td className="td">
                  <div className="flex justify-end gap-1">
                    {a.status === 'scheduled' && <button type="button" className="btn-ghost btn-sm" onClick={() => setForm({ open: true, editing: a })}>Reschedule</button>}
                    {manage && a.status === 'scheduled' && <button type="button" className="btn-ghost btn-sm text-indigo-600" onClick={() => setConfirm({ kind: 'complete', item: a })}>Complete</button>}
                    {a.status === 'scheduled' && <button type="button" className="btn-ghost btn-sm text-rose-600" onClick={() => setConfirm({ kind: 'cancel', item: a })}>Cancel</button>}
                    {(isAdmin || a.status !== 'scheduled') && <button type="button" className="btn-ghost btn-sm text-rose-600" onClick={() => setConfirm({ kind: 'delete', item: a })}>Delete</button>}
                  </div>
                </td>
              </tr>
            ))}
          </TableCard>
        )}
      </DataState>

      <Modal open={form.open} title={form.editing ? 'Reschedule appointment' : 'Book an appointment'} onClose={() => setForm({ open: false, editing: null })}>
        <AppointmentForm key={form.editing?._id ?? 'new'} editing={form.editing} onCancel={() => setForm({ open: false, editing: null })} onDone={() => { setForm({ open: false, editing: null }); list.reload() }} />
      </Modal>
      <ConfirmDialog open={Boolean(confirm)} busy={busy} danger={confirm?.kind !== 'complete'} onCancel={() => setConfirm(null)} onConfirm={run}
        title={{ cancel: 'Cancel this appointment?', delete: 'Delete this appointment?', complete: 'Mark as completed?' }[confirm?.kind ?? 'cancel']}
        confirmLabel={{ cancel: 'Cancel appointment', delete: 'Delete', complete: 'Mark completed' }[confirm?.kind ?? 'cancel']}
        message={confirm && <>{confirm.item.department} with <b>{confirm.item.staff?.name}</b> on {formatWeekday(confirm.item.date)}, {formatRange(confirm.item.startTime, confirm.item.endTime)}.</>} />
    </>
  )
}
