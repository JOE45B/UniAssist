import { useState } from 'react'
import { Link } from 'react-router-dom'
import api, { cleanParams } from '../services/api'
import { useFetch } from '../hooks/useFetch'
import { useDebounce } from '../hooks/useDebounce'
import { useToast } from '../hooks/useToast'
import DataState, { EmptyBlock } from '../components/DataState'
import Modal, { ConfirmDialog } from '../components/Modal'
import RequestForm from '../components/RequestForm'
import Icon from '../components/Icon'
import { PageHeader, SearchInput, Select, StatCard, StatusBadge, TableCard, Toolbar } from '../components/ui'
import type { RequestStats, ServiceRequest } from '../types'
import { PRIORITIES, REQUEST_CATEGORIES, REQUEST_STATUSES } from '../utils/constants'
import { formatDate } from '../utils/format'

export default function ServiceRequests() {
  const toast = useToast()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [category, setCategory] = useState('')
  const [priority, setPriority] = useState('')
  const [from, setFrom] = useState('')
  const search = useDebounce(q)
  const list = useFetch<ServiceRequest[]>('/service-requests', cleanParams({ mine: true, q: search, status, category, priority, from }))
  const stats = useFetch<RequestStats>('/service-requests/statistics', { mine: true })
  const [form, setForm] = useState<{ open: boolean; editing: ServiceRequest | null }>({ open: false, editing: null })
  const [confirm, setConfirm] = useState<{ kind: 'cancel' | 'delete'; item: ServiceRequest } | null>(null)
  const [busy, setBusy] = useState(false)
  const filtered = Boolean(search || status || category || priority || from)
  const refresh = () => { list.reload(); stats.reload() }
  const clear = () => { setQ(''); setStatus(''); setCategory(''); setPriority(''); setFrom('') }

  const runConfirm = async () => {
    if (!confirm) return
    setBusy(true)
    try {
      if (confirm.kind === 'cancel') await api.patch(`/service-requests/${confirm.item._id}/status`, { status: 'cancelled', note: 'Cancelled by requester' })
      else await api.delete(`/service-requests/${confirm.item._id}`)
      toast.success(confirm.kind === 'cancel' ? 'Request cancelled' : 'Request deleted')
      setConfirm(null); refresh()
    } catch (err) { toast.error(err) } finally { setBusy(false) }
  }
  const s = stats.data

  return (
    <>
      <PageHeader eyebrow="My campus" title="Service requests" description="File a concern with a university office and follow it from submission to completion."
        actions={<button type="button" className="btn-primary" onClick={() => setForm({ open: true, editing: null })}><Icon name="plus" className="h-4 w-4" />New request</button>} />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Open" value={s ? s.open : '–'} hint="Pending, processing or ready" icon="inbox" tone="amber" />
        <StatCard label="Ready for release" value={s ? s.byStatus.ready : '–'} hint="Waiting for you" icon="check" tone="violet" />
        <StatCard label="Completed" value={s ? s.byStatus.completed : '–'} hint={s ? `${s.resolutionRate}% of all requests` : ''} icon="chart" tone="teal" />
        <StatCard label="Total filed" value={s ? s.total : '–'} hint={s?.averageResolutionHours != null ? `Avg. ${Math.round(s.averageResolutionHours / 24 * 10) / 10} days to resolve` : ''} icon="clock" />
      </div>
      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Search requests" />
        <Select value={status} onChange={setStatus} options={REQUEST_STATUSES} all="All statuses" label="Filter by status" />
        <Select value={category} onChange={setCategory} options={REQUEST_CATEGORIES} all="All categories" label="Filter by category" />
        <Select value={priority} onChange={setPriority} options={PRIORITIES} all="All priorities" label="Filter by priority" />
        <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Submitted on or after" title="Submitted on or after" />
      </Toolbar>
      <DataState state={list} loadingLabel="Loading requests…" isEmpty={(rows) => rows.length === 0}
        empty={<EmptyBlock title={filtered ? 'No requests match your filters' : 'You have not filed any requests'} hint={filtered ? 'Try clearing a filter.' : 'Need a document, an ID fix or IT help? Start a request.'}
          action={filtered ? <button type="button" className="btn-secondary" onClick={clear}>Clear filters</button> : <button type="button" className="btn-primary" onClick={() => setForm({ open: true, editing: null })}>New request</button>} />}>
        {(rows) => (
          <TableCard head={<><th className="th">Request</th><th className="th">Category</th><th className="th">Priority</th><th className="th">Status</th><th className="th">Submitted</th><th className="th text-right">Actions</th></>}>
            {rows.map((r) => (
              <tr key={r._id} className="hover:bg-slate-50/60">
                <td className="td max-w-xs"><Link to={`/service-requests/${r._id}`} className="font-semibold text-navy-900 hover:text-indigo-600 hover:underline">{r.title}</Link>{r.isOverdue && <span className="ml-2 text-xs font-semibold text-rose-600">Past needed-by date</span>}</td>
                <td className="td text-slate-600">{r.category}</td>
                <td className="td"><StatusBadge value={r.priority} /></td>
                <td className="td"><StatusBadge value={r.status} /></td>
                <td className="td whitespace-nowrap text-slate-600">{formatDate(r.submittedAt)}</td>
                <td className="td">
                  <div className="flex justify-end gap-1">
                    <Link to={`/service-requests/${r._id}`} className="btn-ghost btn-sm">View</Link>
                    {r.status === 'pending' && <button type="button" className="btn-ghost btn-sm" onClick={() => setForm({ open: true, editing: r })}>Edit</button>}
                    {r.allowedTransitions.includes('cancelled') && <button type="button" className="btn-ghost btn-sm text-rose-600" onClick={() => setConfirm({ kind: 'cancel', item: r })}>Cancel</button>}
                    {(r.status === 'pending' || r.status === 'cancelled') && <button type="button" className="btn-ghost btn-sm text-rose-600" onClick={() => setConfirm({ kind: 'delete', item: r })}>Delete</button>}
                  </div>
                </td>
              </tr>
            ))}
          </TableCard>
        )}
      </DataState>

      <Modal open={form.open} title={form.editing ? 'Edit request' : 'New service request'} onClose={() => setForm({ open: false, editing: null })}>
        <RequestForm key={form.editing?._id ?? 'new'} editing={form.editing} onCancel={() => setForm({ open: false, editing: null })} onDone={() => { setForm({ open: false, editing: null }); refresh() }} />
      </Modal>
      <ConfirmDialog open={Boolean(confirm)} busy={busy} onCancel={() => setConfirm(null)} onConfirm={runConfirm}
        title={confirm?.kind === 'cancel' ? 'Cancel this request?' : 'Delete this request?'} confirmLabel={confirm?.kind === 'cancel' ? 'Cancel request' : 'Delete'}
        message={<>“<b>{confirm?.item.title}</b>” will be {confirm?.kind === 'cancel' ? 'marked as cancelled. This cannot be undone.' : 'permanently removed.'}</>} />
    </>
  )
}
