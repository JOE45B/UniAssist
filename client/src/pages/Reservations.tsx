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
import { reservationSchema } from '../schemas'
import type { ReservationValues } from '../schemas'
import type { Facility, FacilityAvailability, Reservation } from '../types'
import { FACILITY_HOURS, FACILITY_TYPES } from '../utils/constants'
import { formatRange, formatWeekday, timeOptions, toDateInput } from '../utils/format'

const TIMES = timeOptions(FACILITY_HOURS.open, FACILITY_HOURS.close)
const STATUSES = ['confirmed', 'completed', 'cancelled']
interface AvailabilityResponse { date: string; facilities: FacilityAvailability[] }

function ReservationForm({ editing, onDone, onCancel }: { editing: Reservation | null; onDone: () => void; onCancel: () => void }) {
  const toast = useToast()
  const facilities = useFetch<Facility[]>('/reservations/facilities')
  const { register, handleSubmit, control, setValue, setError, formState: { errors, isSubmitting } } = useForm<ReservationValues>({
    resolver: zodResolver(reservationSchema),
    defaultValues: editing
      ? { facility: editing.facility, date: editing.date, startTime: editing.startTime, endTime: editing.endTime, purpose: editing.purpose }
      : { facility: '', date: '', startTime: '13:00', endTime: '14:00', purpose: '' },
  })
  const [facility, date, startTime] = useWatch({ control, name: ['facility', 'date', 'startTime'] })
  const ready = Boolean(facility && /^\d{4}-\d{2}-\d{2}$/.test(date))
  const availability = useFetch<AvailabilityResponse>(ready ? '/reservations/availability' : null, { facility, date })
  const current = availability.data?.facilities[0]
  const booked = (current?.booked ?? []).filter((b) => !(editing && editing.date === date && editing.facility === facility && b.startTime === editing.startTime))

  const onSubmit = async (values: ReservationValues) => {
    try {
      if (editing) await api.put(`/reservations/${editing._id}`, values); else await api.post('/reservations', values)
      toast.success(editing ? 'Reservation updated' : 'Facility reserved')
      onDone()
    } catch (err) {
      const res = (err as { response?: { status?: number; data?: { message?: string } } }).response
      if (res?.status === 409) { setError('startTime', { message: res.data?.message ?? 'That time is already reserved' }); availability.reload() }
      toast.error(err)
    }
  }
  const cls = (bad: unknown) => `input ${bad ? 'input-error' : ''}`

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
      <Field label="Facility" error={errors.facility?.message ?? (facilities.error ? `Could not load facilities: ${facilities.error}` : undefined)}>
        <select className={cls(errors.facility)} {...register('facility')} disabled={facilities.loading}>
          <option value="">{facilities.loading ? 'Loading facilities…' : 'Choose a facility'}</option>
          {FACILITY_TYPES.map((type) => (
            <optgroup key={type} label={type}>
              {(facilities.data ?? []).filter((f) => f.type === type).map((f) => <option key={f.name} value={f.name}>{f.name} (seats {f.capacity})</option>)}
            </optgroup>
          ))}
        </select>
      </Field>
      <Field label="Date" error={errors.date?.message}><input type="date" min={toDateInput()} className={cls(errors.date)} {...register('date')} /></Field>
      <div className="sm:col-span-2">
        <SlotPicker ready={ready} loading={availability.loading} error={availability.error} booked={booked} free={current?.freeSlots ?? []} selectedStart={startTime}
          prompt="Choose a facility and a date to see when it is free."
          onPick={(s) => { setValue('startTime', s.startTime, { shouldValidate: true }); setValue('endTime', TIMES[Math.min(TIMES.indexOf(s.startTime) + 4, TIMES.length - 1)], { shouldValidate: true }) }} />
      </div>
      <Field label="Start time" error={errors.startTime?.message}><select className={cls(errors.startTime)} {...register('startTime')}>{TIMES.slice(0, -1).map((t) => <option key={t}>{t}</option>)}</select></Field>
      <Field label="End time" error={errors.endTime?.message}><select className={cls(errors.endTime)} {...register('endTime')}>{TIMES.slice(1).map((t) => <option key={t}>{t}</option>)}</select></Field>
      <Field label="Purpose" error={errors.purpose?.message} className="sm:col-span-2"><textarea rows={3} className={cls(errors.purpose)} placeholder="e.g. Group study for midterms" {...register('purpose')} /></Field>
      <div className="sm:col-span-2"><FormActions onCancel={onCancel} busy={isSubmitting} label={editing ? 'Save changes' : 'Reserve facility'} /></div>
    </form>
  )
}

/** `/reservations` shows the signed-in user's bookings; `/admin/reservations` (manage) shows everyone's. */
export default function Reservations({ manage = false }: { manage?: boolean }) {
  const toast = useToast()
  const { isAdmin } = useAuth()
  const [status, setStatus] = useState('')
  const [facilityType, setFacilityType] = useState('')
  const [date, setDate] = useState('')
  const list = useFetch<Reservation[]>('/reservations', cleanParams({ mine: manage ? undefined : true, status, facilityType, date, order: 'desc' }))
  const [form, setForm] = useState<{ open: boolean; editing: Reservation | null }>({ open: false, editing: null })
  const [confirm, setConfirm] = useState<{ kind: 'cancel' | 'delete' | 'complete'; item: Reservation } | null>(null)
  const [busy, setBusy] = useState(false)
  const filtered = Boolean(status || facilityType || date)

  const run = async () => {
    if (!confirm) return
    setBusy(true)
    try {
      if (confirm.kind === 'delete') await api.delete(`/reservations/${confirm.item._id}`)
      else await api.patch(`/reservations/${confirm.item._id}/${confirm.kind}`)
      toast.success({ cancel: 'Reservation cancelled. The facility is free again.', delete: 'Reservation deleted', complete: 'Reservation marked as completed' }[confirm.kind])
      setConfirm(null); list.reload()
    } catch (err) { toast.error(err) } finally { setBusy(false) }
  }
  const reserve = <button type="button" className="btn-primary" onClick={() => setForm({ open: true, editing: null })}><Icon name="plus" className="h-4 w-4" />Reserve a facility</button>

  return (
    <>
      <PageHeader eyebrow={manage ? 'Manage' : 'My campus'} title={manage ? 'All reservations' : 'Facility reservations'}
        description={manage ? 'Every facility booking on campus.' : 'Reserve study rooms, computer labs, meeting rooms, library rooms and sports facilities.'} actions={!manage && reserve} />
      <Toolbar>
        <Select value={status} onChange={setStatus} options={STATUSES} all="All statuses" label="Filter by status" />
        <Select value={facilityType} onChange={setFacilityType} options={FACILITY_TYPES} all="All facility types" label="Filter by facility type" />
        <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Filter by date" title="Filter by date" />
        {filtered && <button type="button" className="btn-ghost" onClick={() => { setStatus(''); setFacilityType(''); setDate('') }}>Clear filters</button>}
      </Toolbar>
      <DataState state={list} loadingLabel="Loading reservations…" isEmpty={(rows) => rows.length === 0}
        empty={<EmptyBlock icon="building" title={filtered ? 'No reservations match your filters' : 'No reservations yet'} hint={filtered ? 'Try clearing a filter.' : manage ? 'Bookings will appear here.' : 'Reserve a room for your next study session or meeting.'} action={!manage && !filtered ? reserve : undefined} />}>
        {(rows) => (
          <TableCard head={<><th className="th">Facility</th><th className="th">When</th>{manage && <th className="th">Reserved by</th>}<th className="th">Purpose</th><th className="th">Status</th><th className="th text-right">Actions</th></>}>
            {rows.map((r) => (
              <tr key={r._id} className="hover:bg-slate-50/60">
                <td className="td whitespace-nowrap"><p className="font-semibold text-navy-900">{r.facility}</p><p className="text-xs text-slate-500">{r.facilityType}</p></td>
                <td className="td whitespace-nowrap"><p className="text-navy-900">{formatWeekday(r.date)}</p><p className="text-xs text-slate-500">{formatRange(r.startTime, r.endTime)}</p></td>
                {manage && <td className="td whitespace-nowrap text-slate-600">{r.user?.name ?? '—'}</td>}
                <td className="td max-w-xs text-slate-600"><span className="line-clamp-2">{r.purpose}</span></td>
                <td className="td"><StatusBadge value={r.status} /></td>
                <td className="td">
                  <div className="flex justify-end gap-1">
                    {r.status === 'confirmed' && <button type="button" className="btn-ghost btn-sm" onClick={() => setForm({ open: true, editing: r })}>Edit</button>}
                    {manage && r.status === 'confirmed' && <button type="button" className="btn-ghost btn-sm text-indigo-600" onClick={() => setConfirm({ kind: 'complete', item: r })}>Complete</button>}
                    {r.status === 'confirmed' && <button type="button" className="btn-ghost btn-sm text-rose-600" onClick={() => setConfirm({ kind: 'cancel', item: r })}>Cancel</button>}
                    {(isAdmin || r.status !== 'confirmed') && <button type="button" className="btn-ghost btn-sm text-rose-600" onClick={() => setConfirm({ kind: 'delete', item: r })}>Delete</button>}
                  </div>
                </td>
              </tr>
            ))}
          </TableCard>
        )}
      </DataState>

      <Modal open={form.open} title={form.editing ? 'Edit reservation' : 'Reserve a facility'} onClose={() => setForm({ open: false, editing: null })}>
        <ReservationForm key={form.editing?._id ?? 'new'} editing={form.editing} onCancel={() => setForm({ open: false, editing: null })} onDone={() => { setForm({ open: false, editing: null }); list.reload() }} />
      </Modal>
      <ConfirmDialog open={Boolean(confirm)} busy={busy} danger={confirm?.kind !== 'complete'} onCancel={() => setConfirm(null)} onConfirm={run}
        title={{ cancel: 'Cancel this reservation?', delete: 'Delete this reservation?', complete: 'Mark as completed?' }[confirm?.kind ?? 'cancel']}
        confirmLabel={{ cancel: 'Cancel reservation', delete: 'Delete', complete: 'Mark completed' }[confirm?.kind ?? 'cancel']}
        message={confirm && <><b>{confirm.item.facility}</b> on {formatWeekday(confirm.item.date)}, {formatRange(confirm.item.startTime, confirm.item.endTime)}.</>} />
    </>
  )
}
