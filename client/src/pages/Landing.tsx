import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import type { IconName } from '../components/Icon'
import { useAuth } from '../hooks/useAuth'
import { useFetch } from '../hooks/useFetch'
import { Spinner } from '../components/DataState'
import { Progress, StatusBadge } from '../components/ui'
import type { Announcement, CampusEvent } from '../types'
import { formatRange, formatWeekday, timeAgo } from '../utils/format'

const FEATURES: { icon: IconName; title: string; text: string; to: string }[] = [
  { icon: 'calendar', title: 'Class schedule', text: 'A weekly timetable that warns you the moment two classes overlap.', to: '/schedule' },
  { icon: 'check', title: 'Tasks and deadlines', text: 'Overdue, due today and due soon are worked out for you from each due date.', to: '/tasks' },
  { icon: 'inbox', title: 'Service requests', text: 'File registrar, IT and ID concerns and follow every status change.', to: '/service-requests' },
  { icon: 'clock', title: 'Appointments', text: 'See a staff member’s free slots and book one without double-booking.', to: '/appointments' },
  { icon: 'building', title: 'Facility reservations', text: 'Reserve study rooms, labs and courts with live availability checks.', to: '/reservations' },
  { icon: 'ticket', title: 'Events', text: 'Register while seats last. Remaining slots update with every sign-up.', to: '/events' },
]

function PreviewShell({ title, to, children }: { title: string; to: string; children: ReactNode }) {
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base">{title}</h3>
        <Link to={to} className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:underline">View all<Icon name="arrow" className="h-4 w-4" /></Link>
      </div>
      {children}
    </div>
  )
}

function PreviewState({ loading, error, empty, onRetry }: { loading: boolean; error: string | null; empty: boolean; onRetry: () => void }) {
  if (loading) return <div className="flex items-center gap-2 py-6 text-sm text-slate-500"><Spinner className="h-4 w-4" />Loading live data…</div>
  if (error) return <div className="py-4 text-sm text-slate-500">Live preview is unavailable right now. <button type="button" className="font-semibold text-indigo-600 hover:underline" onClick={onRetry}>Retry</button></div>
  if (empty) return <p className="py-4 text-sm text-slate-500">Nothing posted yet.</p>
  return null
}

export default function Landing() {
  const { user } = useAuth()
  const announcements = useFetch<Announcement[]>('/announcements/active')
  const events = useFetch<CampusEvent[]>('/events', { state: 'upcoming' })
  const start = user ? '/dashboard' : '/register'

  return (
    <>
      <section className="relative overflow-hidden bg-navy-950 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_85%_10%,rgba(139,92,246,0.35),transparent_60%),radial-gradient(50%_70%_at_0%_100%,rgba(79,70,229,0.35),transparent_60%)]" />
        <div className="relative mx-auto grid grid-cols-1 max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-indigo-100"><span className="h-1.5 w-1.5 rounded-full bg-violet-400" />UniAssist · Student services, in one place</p>
            <h1 className="mt-5 text-4xl leading-[1.08] text-white sm:text-5xl lg:text-[3.4rem]">Everything You Need. <span className="bg-gradient-to-r from-indigo-300 to-violet-300 bg-clip-text text-transparent">One University Assistant.</span></h1>
            <p className="mt-5 max-w-xl text-base text-indigo-100/80 sm:text-lg">Classes, deadlines, service requests, appointments, room reservations, events and announcements — managed from a single dashboard built for campus life.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to={start} className="btn bg-white text-navy-900 hover:bg-indigo-50">{user ? 'Open my dashboard' : 'Get started'}<Icon name="arrow" className="h-4 w-4" /></Link>
              {!user && <Link to="/login" className="btn border border-white/25 text-white hover:bg-white/10">Sign in</Link>}
              <a href="#features" className="btn text-indigo-100 hover:bg-white/10">See the features</a>
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur sm:p-5" aria-label="Live campus preview">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-indigo-200/70">Happening on campus</p>
            <div className="space-y-2.5">
              {events.loading && <div className="flex items-center gap-2 py-8 text-sm text-indigo-100/70"><Spinner className="h-4 w-4" />Loading live events…</div>}
              {events.error && <p className="py-6 text-sm text-indigo-100/70">Live preview is unavailable right now. Sign in to see campus events.</p>}
              {events.data?.length === 0 && <p className="py-6 text-sm text-indigo-100/70">No upcoming events have been posted yet.</p>}
              {events.data?.slice(0, 3).map((e) => (
                <div key={e._id} className="rounded-2xl bg-white p-4 text-ink">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-navy-900">{e.title}</p>
                    <StatusBadge value={e.isFull ? 'rejected' : 'active'} label={e.isFull ? 'Full' : `${e.remainingSlots} left`} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{formatWeekday(e.date)} · {formatRange(e.startTime, e.endTime)} · {e.location}</p>
                  <div className="mt-3"><Progress value={e.fillRate} tone={e.isFull ? 'rose' : 'violet'} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
        <p className="eyebrow">What you can do</p>
        <h2 className="mt-1 max-w-2xl text-3xl">Six everyday campus errands, handled without a single queue</h2>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Link key={f.title} to={user ? f.to : '/login'} state={user ? undefined : { from: f.to }} className="card group p-5 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white"><Icon name={f.icon} /></span>
              <h3 className="mt-4 text-lg">{f.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{f.text}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600">Open<Icon name="arrow" className="h-4 w-4" /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-surface">
        <div className="mx-auto grid grid-cols-1 max-w-6xl gap-5 px-4 py-16 sm:px-6 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <p className="eyebrow">Live from the database</p>
            <h2 className="mt-1 text-3xl">What’s new right now</h2>
          </div>
          <PreviewShell title="Active announcements" to={user ? '/announcements' : '/login'}>
            <PreviewState loading={announcements.loading} error={announcements.error} empty={announcements.data?.length === 0} onRetry={announcements.reload} />
            <ul className="divide-y divide-slate-100">
              {announcements.data?.slice(0, 4).map((a) => (
                <li key={a._id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2"><StatusBadge value={a.priority} label={`${a.priority} priority`} /><span className="text-xs text-slate-500">{a.category} · {timeAgo(a.publishDate)}</span></div>
                  <p className="mt-1 font-semibold text-navy-900">{a.title}</p>
                  <p className="line-clamp-2 text-sm text-slate-600">{a.content}</p>
                </li>
              ))}
            </ul>
          </PreviewShell>
          <PreviewShell title="Upcoming events" to={user ? '/events' : '/login'}>
            <PreviewState loading={events.loading} error={events.error} empty={events.data?.length === 0} onRetry={events.reload} />
            <ul className="divide-y divide-slate-100">
              {events.data?.slice(0, 4).map((e) => (
                <li key={e._id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-navy-900">{e.title}</p>
                    <p className="text-xs text-slate-500">{formatWeekday(e.date)} · {e.location}</p>
                  </div>
                  <span className="shrink-0 text-right text-sm"><b className="tabular-nums text-navy-900">{e.registeredCount}</b><span className="text-slate-500"> / {e.capacity}</span></span>
                </li>
              ))}
            </ul>
          </PreviewShell>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-700 px-6 py-12 text-center text-white sm:px-12">
          <h2 className="text-3xl text-white">Ready to stop juggling five different portals?</h2>
          <p className="mx-auto mt-3 max-w-xl text-indigo-100">Create a student account in under a minute, or sign in to pick up where you left off.</p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to={start} className="btn bg-white text-navy-900 hover:bg-indigo-50">{user ? 'Open my dashboard' : 'Create account'}</Link>
            <Link to="/about" className="btn border border-white/30 text-white hover:bg-white/10">Learn how it works</Link>
          </div>
        </div>
      </section>
    </>
  )
}
