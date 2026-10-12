import { useState } from 'react'
import { Link } from 'react-router-dom'
import api, { cleanParams } from '../../services/api'
import { useAuth } from '../../hooks/useAuth'
import { useFetch } from '../../hooks/useFetch'
import { useDebounce } from '../../hooks/useDebounce'
import { useToast } from '../../hooks/useToast'
import DataState, { EmptyBlock } from '../../components/DataState'
import { ConfirmDialog } from '../../components/Modal'
import { BarList, PageHeader, SearchInput, Section, Select, StatCard, StatusBadge, TableCard, Toolbar } from '../../components/ui'
import type { RequestStats, RequestStatus, ServiceRequest } from '../../types'
import { PRIORITIES, REQUEST_CATEGORIES, REQUEST_STATUSES } from '../../utils/constants'
import { capitalize, formatDate } from '../../utils/format'

export default function AdminRequests() {
  const toast = useToast()
  const { isAdmin } = useAuth()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [category, setCategory] = useState('')
  const [priority, setPriority] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const search = useDebounce(q)
  const list = useFetch<ServiceRequest[]>('/service-requests', cleanParams({ q: search, status, category, priority, from, to }))
  const stats = useFetch<RequestStats>('/service-requests/statistics')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<ServiceRequest | null>(null)
  const filtered = Boolean(search || status || category || priority || from || to)
  const refresh = () => { list.reload(); stats.reload() }

  const move = async (r: ServiceRequest, next: string) => {
    if (!next) return
    setBusyId(r._id)
    try { await api.patch(`/service-requests/${r._id}/status`, { status: next }); toast.success(`“${r.title}” moved to ${next}`); refresh() } catch (err) { toast.error(err) } finally { setBusyId(null) }
  }
  const remove = async () => {
    if (!deleting) return
    setBusyId(deleting._id)
    try { await api.delete(`/service-requests/${deleting._id}`); toast.success('Request deleted'); setDeleting(null); refresh() } catch (err) { toast.error(err) } finally { setBusyId(null) }
  }
  const s = stats.data

  return (
    <>
      <PageHeader eyebrow="Manage" title="Service request queue" description="Process requests from every student. Each row only offers the status moves its workflow allows." />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Open" value={s ? s.open : '–'} hint={s ? `${s.byStatus.pending} waiting to start` : ''} icon="inbox" tone="amber" />
        <StatCard label="Past needed-by date" value={s ? s.overdue : '–'} hint="Open and overdue" icon="alert" tone="rose" />
        <StatCard label="Resolution rate" value={s ? `${s.resolutionRate}%` : '–'} hint={s ? `${s.byStatus.completed} completed` : ''} icon="check" tone="teal" />
        <StatCard label="Avg. time to resolve" value={s?.averageResolutionHours != null ? `${Math.round(s.averageResolutionHours / 24 * 10) / 10}d` : '–'} hint="Submission to completion" icon="clock" />
      </div>
      {s && (
        <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Section title="By status"><BarList items={REQUEST_STATUSES.map((k) => ({ label: capitalize(k), value: s.byStatus[k as RequestStatus] }))} /></Section>
          <Section title="By category"><BarList tone="violet" items={Object.entries(s.byCategory).map(([label, value]) => ({ label, value }))} /></Section>
        </div>
      )}
      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Search title or description" />
        <Select value={status} onChange={setStatus} options={REQUEST_STATUSES} all="All statuses" label="Filter by status" />
        <Select value={category} onChange={setCategory} options={REQUEST_CATEGORIES} all="All categories" label="Filter by category" />
        <Select value={priority} onChange={setPriority} options={PRIORITIES} all="All priorities" label="Filter by priority" />
        <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Submitted from" title="Submitted from" />
        <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Submitted to" title="Submitted to" />
      </Toolbar>
      <DataState state={list} loadingLabel="Loading the queue…" isEmpty={(rows) => rows.length === 0}
        empty={<EmptyBlock title={filtered ? 'No requests match your filters' : 'The queue is empty'} hint={filtered ? 'Try clearing a filter.' : 'New requests from students will appear here.'} />}>
        {(rows) => (
          <TableCard head={<><th className="th">Request</th><th className="th">Student</th><th className="th">Category</th><th className="th">Priority</th><th className="th">Status</th><th className="th">Submitted</th><th className="th">Move to</th><th className="th" /></>}>
            {rows.map((r) => (
              <tr key={r._id} className="hover:bg-slate-50/60">
                <td className="td max-w-64"><Link to={`/service-requests/${r._id}`} className="font-semibold text-navy-900 hover:text-indigo-600 hover:underline">{r.title}</Link>{r.isOverdue && <span className="block text-xs font-semibold text-rose-600">Past needed-by date</span>}</td>
                <td className="td whitespace-nowrap text-slate-600">{typeof r.user === 'string' ? '—' : r.user.name}</td>
                <td className="td whitespace-nowrap text-slate-600">{r.category}</td>
                <td className="td"><StatusBadge value={r.priority} /></td>
                <td className="td"><StatusBadge value={r.status} /></td>
                <td className="td whitespace-nowrap text-slate-600">{formatDate(r.submittedAt)}</td>
                <td className="td">
                  {r.allowedTransitions.length === 0 ? <span className="text-xs text-slate-400">Final</span> : (
                    <select className="input min-w-32 py-1.5 text-xs" value="" disabled={busyId === r._id} onChange={(e) => move(r, e.target.value)} aria-label={`Change status of ${r.title}`}>
                      <option value="">Choose…</option>
                      {r.allowedTransitions.map((t) => <option key={t} value={t}>{capitalize(t)}</option>)}
                    </select>
                  )}
                </td>
                <td className="td text-right">{isAdmin && <button type="button" className="btn-ghost btn-sm text-rose-600" onClick={() => setDeleting(r)}>Delete</button>}</td>
              </tr>
            ))}
          </TableCard>
        )}
      </DataState>
      <ConfirmDialog open={Boolean(deleting)} title="Delete this request?" busy={busyId === deleting?._id} onCancel={() => setDeleting(null)} onConfirm={remove}
        message={<>“<b>{deleting?.title}</b>” and its history will be permanently removed.</>} />
    </>
  )
}
