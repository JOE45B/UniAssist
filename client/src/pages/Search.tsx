import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useFetch } from '../hooks/useFetch'
import DataState, { EmptyBlock } from '../components/DataState'
import { PageHeader, Section, StatusBadge } from '../components/ui'
import type { SearchResponse } from '../types'
import { formatDateTime, formatRange, formatWeekday } from '../utils/format'

function Group<T extends { _id: string }>({ title, items, to, render }: { title: string; items?: T[]; to: (item: T) => string; render: (item: T) => ReactNode }) {
  if (!items?.length) return null
  return (
    <Section title={`${title} (${items.length})`}>
      <ul className="divide-y divide-slate-100">
        {items.map((item) => <li key={item._id}><Link to={to(item)} className="-mx-2 flex flex-wrap items-center justify-between gap-2 rounded-lg px-2 py-2.5 hover:bg-slate-50">{render(item)}</Link></li>)}
      </ul>
    </Section>
  )
}
const Line = ({ title, sub }: { title: string; sub: string }) => <span className="min-w-0"><span className="block truncate font-semibold text-navy-900">{title}</span><span className="block truncate text-xs text-slate-500">{sub}</span></span>

export default function SearchPage() {
  const [params] = useSearchParams()
  const q = (params.get('q') ?? '').trim()
  const state = useFetch<SearchResponse>(q.length >= 2 ? '/search' : null, { q, limit: 8 })

  return (
    <>
      <PageHeader eyebrow="Search" title={q ? `Results for “${q}”` : 'Search UniAssist'} description="Searches your tasks, classes and requests, plus campus events and announcements." />
      {q.length < 2 ? <EmptyBlock icon="search" title="Type at least 2 characters" hint="Use the search box at the top of the page." /> : (
        <DataState state={state} loadingLabel="Searching…" isEmpty={(d) => d.total === 0} empty={<EmptyBlock icon="search" title={`Nothing found for “${q}”`} hint="Check the spelling or try a shorter keyword." />}>
          {(d) => (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <Group title="Tasks" items={d.results.tasks} to={() => '/tasks'} render={(t) => <><Line title={t.title} sub={`${t.subject} · Due ${formatDateTime(t.dueDate)}`} /><StatusBadge value={t.effectiveStatus} /></>} />
              <Group title="Classes" items={d.results.schedules} to={() => '/schedule'} render={(s) => <Line title={`${s.courseCode} · ${s.courseName}`} sub={`${s.day} ${formatRange(s.startTime, s.endTime)} · ${s.room}`} />} />
              <Group title="Service requests" items={d.results.requests} to={(r) => `/service-requests/${r._id}`} render={(r) => <><Line title={r.title} sub={r.category} /><StatusBadge value={r.status} /></>} />
              <Group title="Events" items={d.results.events} to={() => '/events'} render={(e) => <><Line title={e.title} sub={`${formatWeekday(e.date)} · ${e.location}`} /><StatusBadge value={e.isFull ? 'rejected' : 'active'} label={e.isFull ? 'Full' : `${e.remainingSlots} left`} /></>} />
              <Group title="Announcements" items={d.results.announcements} to={() => '/announcements'} render={(a) => <><Line title={a.title} sub={a.category} /><StatusBadge value={a.state} /></>} />
            </div>
          )}
        </DataState>
      )}
    </>
  )
}
