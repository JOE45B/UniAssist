import { useState } from 'react'
import api, { cleanParams } from '../services/api'
import { useFetch } from '../hooks/useFetch'
import { useDebounce } from '../hooks/useDebounce'
import { useToast } from '../hooks/useToast'
import DataState, { EmptyBlock, Spinner } from '../components/DataState'
import { ConfirmDialog } from '../components/Modal'
import Icon from '../components/Icon'
import { Badge, PageHeader, Progress, SearchInput, Select, StatusBadge, Toolbar } from '../components/ui'
import type { CampusEvent } from '../types'
import { EVENT_CATEGORIES } from '../utils/constants'
import { formatRange, formatWeekday } from '../utils/format'

const STATES = [{ value: 'upcoming', label: 'Upcoming' }, { value: 'ongoing', label: 'Happening now' }, { value: 'past', label: 'Past' }]
const AVAILABILITY = [{ value: 'open', label: 'Slots available' }, { value: 'full', label: 'Full' }]

export default function Events() {
  const toast = useToast()
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [eventState, setEventState] = useState('upcoming')
  const [availability, setAvailability] = useState('')
  const [mine, setMine] = useState(false)
  const search = useDebounce(q)
  const list = useFetch<CampusEvent[]>('/events', cleanParams({ q: search, category, state: eventState, availability, mine: mine || undefined }))
  const [busyId, setBusyId] = useState<string | null>(null)
  const [leaving, setLeaving] = useState<CampusEvent | null>(null)
  const filtered = Boolean(search || category || availability || mine || eventState !== 'upcoming')

  const register = async (e: CampusEvent) => {
    setBusyId(e._id)
    try { await api.post(`/events/${e._id}/register`); toast.success(`You’re registered for “${e.title}”`) } catch (err) { toast.error(err) } finally { setBusyId(null); list.reload() }
  }
  const unregister = async () => {
    if (!leaving) return
    setBusyId(leaving._id)
    try { await api.delete(`/events/${leaving._id}/register`); toast.success('Registration cancelled'); setLeaving(null) } catch (err) { toast.error(err) } finally { setBusyId(null); list.reload() }
  }

  return (
    <>
      <PageHeader eyebrow="My campus" title="Events" description="Browse campus events and register while slots last. Remaining slots are capacity minus actual registrations." />
      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Search events or locations" />
        <Select value={eventState} onChange={setEventState} options={STATES} all="Any time" label="Filter by time" />
        <Select value={category} onChange={setCategory} options={EVENT_CATEGORIES} all="All categories" label="Filter by category" />
        <Select value={availability} onChange={setAvailability} options={AVAILABILITY} all="Any availability" label="Filter by availability" />
        <label className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-navy-900">
          <input type="checkbox" className="h-4 w-4 accent-indigo-600" checked={mine} onChange={(e) => setMine(e.target.checked)} />My registrations
        </label>
      </Toolbar>
      <DataState state={list} loadingLabel="Loading events…" isEmpty={(rows) => rows.length === 0}
        empty={<EmptyBlock icon="ticket" title={filtered ? 'No events match your filters' : 'No upcoming events'} hint={filtered ? 'Try a different filter.' : 'New events will be posted here.'}
          action={filtered ? <button type="button" className="btn-secondary" onClick={() => { setQ(''); setCategory(''); setAvailability(''); setMine(false); setEventState('upcoming') }}>Reset filters</button> : undefined} />}>
        {(rows) => (
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((e) => (
              <li key={e._id} className="card flex flex-col p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="violet">{e.category}</Badge>
                  {e.state !== 'upcoming' && <StatusBadge value={e.state} label={e.state === 'ongoing' ? 'Happening now' : 'Ended'} />}
                  {e.isRegistered && <StatusBadge value="active" label="You’re going" />}
                </div>
                <h2 className="mt-3 text-lg">{e.title}</h2>
                <p className="mt-1 line-clamp-3 text-sm text-slate-600">{e.description}</p>
                <dl className="mt-4 space-y-1.5 text-sm text-slate-600">
                  <div className="flex items-center gap-2"><Icon name="calendar" className="h-4 w-4 text-indigo-500" /><dd>{formatWeekday(e.date)} · {formatRange(e.startTime, e.endTime)}</dd></div>
                  <div className="flex items-center gap-2"><Icon name="pin" className="h-4 w-4 text-indigo-500" /><dd>{e.location}</dd></div>
                </dl>
                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-semibold text-navy-900">{e.registeredCount} / {e.capacity} registered</span>
                    <span className={e.isFull ? 'font-bold text-rose-600' : 'text-slate-500'}>{e.isFull ? 'Full' : `${e.remainingSlots} ${e.remainingSlots === 1 ? 'slot' : 'slots'} left`}</span>
                  </div>
                  <Progress value={e.fillRate} tone={e.isFull ? 'rose' : e.fillRate >= 80 ? 'amber' : 'indigo'} />
                </div>
                <div className="mt-5 flex-1" />
                {e.state === 'past' ? <button type="button" className="btn-secondary" disabled>Event ended</button>
                  : e.isRegistered ? <button type="button" className="btn-secondary" disabled={busyId === e._id} onClick={() => setLeaving(e)}>Cancel my registration</button>
                    : <button type="button" className="btn-primary" disabled={e.isFull || busyId === e._id} onClick={() => register(e)}>{busyId === e._id && <Spinner className="h-4 w-4" />}{e.isFull ? 'No slots left' : 'Register'}</button>}
              </li>
            ))}
          </ul>
        )}
      </DataState>
      <ConfirmDialog open={Boolean(leaving)} title="Cancel your registration?" confirmLabel="Cancel registration" busy={busyId === leaving?._id} onCancel={() => setLeaving(null)} onConfirm={unregister}
        message={<>Your slot for “<b>{leaving?.title}</b>” will be released to another student.</>} />
    </>
  )
}
