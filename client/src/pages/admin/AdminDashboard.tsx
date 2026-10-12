import { Link } from 'react-router-dom'
import { useFetch } from '../../hooks/useFetch'
import DataState from '../../components/DataState'
import Icon from '../../components/Icon'
import { BarList, PageHeader, Progress, Section, StatCard } from '../../components/ui'
import type { Analytics } from '../../types'
import { capitalize, formatDate } from '../../utils/format'

export default function AdminDashboard() {
  const state = useFetch<Analytics>('/dashboard/analytics')
  return (
    <>
      <PageHeader eyebrow="Manage" title="Campus analytics" description="Aggregated from live database records every time this page loads."
        actions={<button type="button" className="btn-secondary" onClick={state.reload}><Icon name="refresh" className="h-4 w-4" />Refresh</button>} />
      <DataState state={state} loadingLabel="Crunching the numbers…">
        {(a) => (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Users" value={a.users.total} hint={`${a.users.active} active`} icon="users" />
              <StatCard label="Open requests" value={a.serviceRequests.open} hint={`${a.serviceRequests.overdue} past needed-by date`} icon="inbox" tone="amber" />
              <StatCard label="Scheduled appointments" value={a.appointments.byStatus.scheduled} hint={`${a.appointments.total} total`} icon="clock" tone="violet" />
              <StatCard label="Event fill rate" value={`${a.events.averageFillRate}%`} hint={`${a.events.totalRegistrations} of ${a.events.totalCapacity} slots`} icon="ticket" tone="teal" />
            </div>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
              <Section title="Users by role"><BarList items={Object.entries(a.users.byRole).map(([k, v]) => ({ label: capitalize(k), value: v }))} /></Section>
              <Section title="Requests by status" action={<Link to="/admin/requests" className="text-sm font-semibold text-indigo-600 hover:underline">Open queue</Link>}>
                <BarList tone="violet" items={Object.entries(a.serviceRequests.byStatus).map(([k, v]) => ({ label: capitalize(k), value: v }))} />
              </Section>
              <Section title="Requests by category"><BarList tone="sky" items={Object.entries(a.serviceRequests.byCategory).map(([label, value]) => ({ label, value }))} /></Section>
              <Section title="Student tasks">
                <div className="flex items-end justify-between"><p className="text-3xl font-extrabold tabular-nums text-navy-900">{a.tasks.completionRate}%</p><p className="text-xs text-slate-500">{a.tasks.completed} of {a.tasks.total} completed</p></div>
                <div className="mt-2"><Progress value={a.tasks.completionRate} tone="teal" /></div>
                <div className="mt-4"><BarList items={[{ label: 'Pending', value: a.tasks.pending, tone: 'amber' }, { label: 'Overdue', value: a.tasks.overdue, tone: 'rose' }, { label: 'Completed', value: a.tasks.completed, tone: 'teal' }]} /></div>
              </Section>
              <Section title="Appointments by department" action={<Link to="/admin/appointments" className="text-sm font-semibold text-indigo-600 hover:underline">Manage</Link>}>
                <BarList items={Object.entries(a.appointments.byDepartment).filter(([, v]) => v > 0).map(([label, value]) => ({ label, value }))} />
              </Section>
              <Section title="Reservations by facility type" action={<Link to="/admin/reservations" className="text-sm font-semibold text-indigo-600 hover:underline">Manage</Link>}>
                <BarList tone="violet" items={Object.entries(a.reservations.byFacilityType).map(([label, value]) => ({ label, value }))} />
                <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">Most reserved</p>
                <p className="mt-1 text-sm text-slate-600">{a.reservations.topFacilities.length ? a.reservations.topFacilities.map((f) => `${f.facility} (${f.count})`).join(' · ') : 'No reservations yet.'}</p>
              </Section>
              <Section title="Most popular events" className="lg:col-span-2" action={<Link to="/admin/events" className="text-sm font-semibold text-indigo-600 hover:underline">Manage</Link>}>
                {a.events.mostPopular.length === 0 ? <p className="text-sm text-slate-500">No events yet.</p> : (
                  <ul className="space-y-3">
                    {a.events.mostPopular.map((e) => (
                      <li key={e._id}>
                        <div className="mb-1 flex items-center justify-between gap-3 text-sm"><span className="truncate font-semibold text-navy-900">{e.title}</span><span className="shrink-0 tabular-nums text-slate-500">{e.registeredCount}/{e.capacity} · {formatDate(e.date)}</span></div>
                        <Progress value={e.fillRate} tone={e.fillRate >= 100 ? 'rose' : 'indigo'} />
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
              <Section title="Announcements" action={<Link to="/admin/announcements" className="text-sm font-semibold text-indigo-600 hover:underline">Manage</Link>}>
                <BarList items={[{ label: 'Active', value: a.announcements.active, tone: 'teal' }, { label: 'Upcoming', value: a.announcements.upcoming, tone: 'sky' }, { label: 'Expired', value: a.announcements.expired, tone: 'slate' }]} />
              </Section>
            </div>
          </div>
        )}
      </DataState>
    </>
  )
}
