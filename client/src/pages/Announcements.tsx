import { useState } from 'react'
import { cleanParams } from '../services/api'
import { useFetch } from '../hooks/useFetch'
import { useDebounce } from '../hooks/useDebounce'
import DataState, { EmptyBlock } from '../components/DataState'
import { Badge, PageHeader, SearchInput, Select, StatusBadge, Toolbar } from '../components/ui'
import type { Announcement } from '../types'
import { ANNOUNCEMENT_CATEGORIES, PRIORITIES } from '../utils/constants'
import { capitalize, formatDate, timeAgo } from '../utils/format'

export default function Announcements() {
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [priority, setPriority] = useState('')
  const search = useDebounce(q)
  const list = useFetch<Announcement[]>('/announcements/active', cleanParams({ q: search, category, priority }))
  const filtered = Boolean(search || category || priority)

  return (
    <>
      <PageHeader eyebrow="My campus" title="Announcements" description="The active feed: announcements that are published and have not expired. High-priority items come first." />
      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Search announcements" />
        <Select value={category} onChange={setCategory} options={ANNOUNCEMENT_CATEGORIES} all="All categories" label="Filter by category" />
        <Select value={priority} onChange={setPriority} options={PRIORITIES} all="All priorities" label="Filter by priority" />
      </Toolbar>
      <DataState state={list} loadingLabel="Loading announcements…" isEmpty={(rows) => rows.length === 0}
        empty={<EmptyBlock icon="megaphone" title={filtered ? 'No announcements match your filters' : 'No active announcements'} hint={filtered ? 'Try clearing a filter.' : 'You’re all caught up.'}
          action={filtered ? <button type="button" className="btn-secondary" onClick={() => { setQ(''); setCategory(''); setPriority('') }}>Clear filters</button> : undefined} />}>
        {(rows) => (
          <ul className="space-y-3">
            {rows.map((a) => (
              <li key={a._id} className={`card p-5 ${a.priority === 'high' ? 'border-l-4 border-l-rose-500' : ''}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="indigo">{a.category}</Badge>
                  <StatusBadge value={a.priority} label={`${capitalize(a.priority)} priority`} />
                  <span className="text-xs text-slate-500">Posted {timeAgo(a.publishDate)}{a.createdBy?.name ? ` by ${a.createdBy.name}` : ''}</span>
                </div>
                <h2 className="mt-2 text-lg">{a.title}</h2>
                <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{a.content}</p>
                <p className="mt-3 text-xs text-slate-500">Visible until {formatDate(a.expiryDate)}</p>
              </li>
            ))}
          </ul>
        )}
      </DataState>
    </>
  )
}
