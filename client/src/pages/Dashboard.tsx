import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useFetch } from '../hooks/useFetch'
import DataState from '../components/DataState'
import Icon from '../components/Icon'
import type { IconName } from '../components/Icon'
import { PageHeader, Progress, Section, StatCard, StatusBadge } from '../components/ui'
import type { DashboardData } from '../types'
import { formatDateTime, formatRange, formatWeekday, timeAgo } from '../utils/format'

const QUICK: { to: string; label: string; icon: IconName }[] = [
  { to: '/tasks', label: 'Add a task', icon: 'check' },
  { to: '/service-requests', label: 'File a request', icon: 'inbox' },
  { to: '/appointments', label: 'Book appointment', icon: 'clock' },
  { to: '/reservations', label: 'Reserve a room', icon: 'building' },
]
const ACTIVITY_ICON: Record<string, IconName> = { task: 'check', request: 'inbox', appointment: 'clock', reservation: 'building' }
const More = ({ to }: { to: string }) => <Link to={to} className="text-sm font-semibold text-indigo-600 hover:underline">View all</Link>
const Empty = ({ children }: { children: string }) => <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">{children}</p>

export default function Dashboard() {
  const { user } = useAuth()
  const state = useFetch<DashboardData>('/dashboard/statistics')
  const firstName = (user?.name ?? '').replace(/^(Prof\.|Mr\.|Ms\.)\s*/, '').split(' ')[0]

  return (
    <>
      <PageHeader eyebrow="Dashboard" title={`Good to see you, ${firstName}`} description="Your classes, deadlines and campus services at a glance. Every number here is calculated from live records."
        actions={<button type="button" className="btn-secondary" onClick={state.reload}><Icon name="refresh" className="h-4 w-4" />Refresh</button>} />
      <DataState state={state} loadingLabel="Loading your dashboard…">
        {(d) => (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Classes today" value={d.todayClasses.length} hint={d.dayName} icon="calendar" />
              <StatCard label="Pending tasks" value={d.tasks.pending} hint={`${d.tasks.dueToday} due today`} icon="check" tone="amber" />
              <StatCard label="Overdue tasks" value={d.tasks.overdue} hint={d.tasks.overdue ? 'Needs attention' : 'All caught up'} icon="alert" tone="rose" />
              <StatCard label="Open requests" value={d.serviceRequests.open} hint={`${d.serviceRequests.total} total`} icon="inbox" tone="violet" />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {QUICK.map((q) => <Link key={q.to} to={q.to} className="btn-secondary justify-start"><Icon name={q.icon} className="h-4 w-4 text-indigo-600" />{q.label}</Link>)}
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <Section title={`Today’s classes · ${d.dayName}`} action={<More to="/schedule" />} className="lg:col-span-2">
                {d.todayClasses.length === 0 ? <Empty>No classes scheduled today.</Empty> : (
                  <ul className="space-y-2">
                    {d.todayClasses.map((c) => (
                      <li key={c._id} className="flex items-center gap-4 rounded-xl border border-slate-200 px-4 py-3">
                        <span className="w-24 shrink-0 text-xs font-semibold text-indigo-700 sm:w-36 sm:text-sm">{formatRange(c.startTime, c.endTime)}</span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-navy-900">{c.courseCode} · {c.courseName}</p>
                          <p className="truncate text-xs text-slate-500">{c.room} · {c.instructor}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section title="Task progress" action={<More to="/tasks" />}>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-extrabold tabular-nums text-navy-900">{d.tasks.completionRate}%</p>
                  <p className="text-xs text-slate-500">{d.tasks.completed} of {d.tasks.total} completed</p>
                </div>
                <div className="mt-2"><Progress value={d.tasks.completionRate} tone="teal" /></div>
                <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {([['Pending', d.tasks.pending, 'text-amber-700'], ['Completed', d.tasks.completed, 'text-teal-700'], ['Overdue', d.tasks.overdue, 'text-rose-700']] as const).map(([label, value, color]) => (
                    <div key={label} className="rounded-xl bg-slate-50 px-2 py-3">
                      <dd className={`text-xl font-extrabold tabular-nums ${color}`}>{value}</dd>
                      <dt className="text-xs text-slate-500">{label}</dt>
                    </div>
                  ))}
                </dl>
              </Section>

              <Section title="Due in the next 7 days" action={<More to="/tasks" />} className="lg:col-span-2">
                {d.tasks.upcoming.length === 0 ? <Empty>Nothing due this week.</Empty> : (
                  <ul className="divide-y divide-slate-100">
                    {d.tasks.upcoming.map((t) => (
                      <li key={t._id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 first:pt-0 last:pb-0">
                        <div className="min-w-0 flex-1 basis-48">
                          <p className="truncate font-semibold text-navy-900">{t.title}</p>
                          <p className="text-xs text-slate-500">{t.subject} · {formatDateTime(t.dueDate)}</p>
                        </div>
                        <StatusBadge value={t.priority} />
                        <StatusBadge value={t.deadlineLabel === 'Due today' ? 'overdue' : 'pending'} label={t.deadlineLabel} />
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section title="Service requests" action={<More to="/service-requests" />}>
                <ul className="space-y-2 text-sm">
                  {(Object.entries(d.serviceRequests.byStatus)).map(([status, count]) => (
                    <li key={status} className="flex items-center justify-between"><StatusBadge value={status} /><span className="font-bold tabular-nums text-navy-900">{count}</span></li>
                  ))}
                </ul>
                {d.serviceRequests.overdue > 0 && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800">{d.serviceRequests.overdue} open request(s) past the needed-by date.</p>}
              </Section>

              <Section title="Upcoming appointments" action={<More to="/appointments" />}>
                {d.upcomingAppointments.length === 0 ? <Empty>No upcoming appointments.</Empty> : (
                  <ul className="space-y-3">
                    {d.upcomingAppointments.map((a) => (
                      <li key={a._id}>
                        <p className="font-semibold text-navy-900">{a.department} · {a.staff?.name}</p>
                        <p className="text-xs text-slate-500">{formatWeekday(a.date)} · {formatRange(a.startTime, a.endTime)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section title="Upcoming events" action={<More to="/events" />}>
                {d.upcomingEvents.length === 0 ? <Empty>No upcoming events.</Empty> : (
                  <ul className="space-y-3">
                    {d.upcomingEvents.map((e) => (
                      <li key={e._id}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-navy-900">{e.title}</p>
                          {e.isRegistered && <StatusBadge value="active" label="Going" />}
                        </div>
                        <p className="text-xs text-slate-500">{formatWeekday(e.date)} · {e.isFull ? 'Full' : `${e.remainingSlots} of ${e.capacity} slots left`}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section title="Active announcements" action={<More to="/announcements" />}>
                {d.activeAnnouncements.length === 0 ? <Empty>No active announcements.</Empty> : (
                  <ul className="space-y-3">
                    {d.activeAnnouncements.map((a) => (
                      <li key={a._id}>
                        <p className="font-semibold text-navy-900">{a.title}</p>
                        <p className="text-xs text-slate-500">{a.category} · posted {timeAgo(a.publishDate)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section title="Recent activity" className="lg:col-span-3">
                {d.recentActivity.length === 0 ? <Empty>Your recent updates will show up here.</Empty> : (
                  <ul className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                    {d.recentActivity.map((a) => (
                      <li key={`${a.type}-${a.id}`}>
                        <Link to={a.link} className="flex items-center gap-3 rounded-xl p-1 hover:bg-slate-50">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-600"><Icon name={ACTIVITY_ICON[a.type] ?? 'check'} className="h-4 w-4" /></span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-navy-900">{a.title}</span>
                            <span className="block truncate text-xs text-slate-500">{a.detail}</span>
                          </span>
                          <span className="shrink-0 text-xs text-slate-400">{timeAgo(a.at)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            </div>
          </div>
        )}
      </DataState>
    </>
  )
}
