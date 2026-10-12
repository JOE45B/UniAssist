import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../hooks/useAuth'
import { useFetch } from '../hooks/useFetch'
import { useToast } from '../hooks/useToast'
import DataState, { Spinner } from '../components/DataState'
import Modal from '../components/Modal'
import RequestForm from '../components/RequestForm'
import Icon from '../components/Icon'
import { Section, StatusBadge } from '../components/ui'
import type { RequestStatus, ServiceRequest } from '../types'
import { capitalize, formatDateTime } from '../utils/format'

const FLOW: RequestStatus[] = ['pending', 'processing', 'ready', 'completed']
const ACTION_LABEL: Record<RequestStatus, string> = { pending: 'Pending', processing: 'Start processing', ready: 'Mark as ready', completed: 'Mark as completed', rejected: 'Reject', cancelled: 'Cancel request' }

export default function ServiceRequestDetail() {
  const { id } = useParams()
  const { user, isStaff } = useAuth()
  const toast = useToast()
  const state = useFetch<ServiceRequest>(`/service-requests/${id}`)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<RequestStatus | null>(null)
  const [editing, setEditing] = useState(false)

  const move = async (status: RequestStatus) => {
    setBusy(status)
    try {
      await api.patch(`/service-requests/${id}/status`, { status, note })
      toast.success(`Request moved to ${status}`)
      setNote(''); state.reload()
    } catch (err) { toast.error(err) } finally { setBusy(null) }
  }

  return (
    <>
      <Link to={isStaff ? '/admin/requests' : '/service-requests'} className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:underline"><Icon name="arrow" className="h-4 w-4 rotate-180" />Back to requests</Link>
      <DataState state={state} loadingLabel="Loading request…">
        {(r) => {
          const owner = typeof r.user === 'string' ? null : r.user
          const isOwner = (owner?._id ?? r.user) === user?._id
          const actions = r.allowedTransitions.filter((s) => isStaff || s === 'cancelled')
          const step = FLOW.indexOf(r.status)
          return (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <div className="space-y-5 lg:col-span-2">
                <section className="card p-5 sm:p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge value={r.status} /><StatusBadge value={r.priority} label={`${capitalize(r.priority)} priority`} />
                    <span className="text-sm text-slate-500">{r.category}</span>
                  </div>
                  <h1 className="mt-3 text-2xl">{r.title}</h1>
                  <p className="mt-3 whitespace-pre-line text-slate-700">{r.description}</p>
                  {isOwner && r.status === 'pending' && <button type="button" className="btn-secondary mt-5" onClick={() => setEditing(true)}>Edit request</button>}
                </section>

                <Section title="Progress">
                  {step === -1 ? (
                    <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">This request was <b>{r.status}</b> and is closed.</p>
                  ) : (
                    <ol className="grid grid-cols-4 gap-2">
                      {FLOW.map((s, i) => (
                        <li key={s} className="text-center">
                          <span className={`mx-auto grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${i <= step ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{i < step ? '✓' : i + 1}</span>
                          <span className={`mt-1.5 block text-xs font-semibold ${i <= step ? 'text-navy-900' : 'text-slate-400'}`}>{capitalize(s)}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </Section>

                <Section title="Status history">
                  <ol className="space-y-4 border-l-2 border-slate-200 pl-5">
                    {[...r.history].reverse().map((h) => (
                      <li key={`${h.status}-${h.at}`} className="relative">
                        <span className="absolute -left-[1.72rem] top-1 h-3 w-3 rounded-full border-2 border-white bg-indigo-500" />
                        <div className="flex flex-wrap items-center gap-2"><StatusBadge value={h.status} /><span className="text-xs text-slate-500">{formatDateTime(h.at)}</span></div>
                        <p className="mt-1 text-sm text-slate-600">{h.note || 'No note'}{typeof h.changedBy !== 'string' && h.changedBy?.name ? ` — ${h.changedBy.name}` : ''}</p>
                      </li>
                    ))}
                  </ol>
                </Section>
              </div>

              <div className="space-y-5">
                <Section title="Details">
                  <dl className="space-y-3 text-sm">
                    {owner && <div><dt className="text-xs font-semibold text-slate-500">Requested by</dt><dd className="font-semibold text-navy-900">{owner.name}{owner.idNumber ? ` · ${owner.idNumber}` : ''}</dd></div>}
                    <div><dt className="text-xs font-semibold text-slate-500">Submitted</dt><dd>{formatDateTime(r.submittedAt)}</dd></div>
                    <div><dt className="text-xs font-semibold text-slate-500">Needed by</dt><dd className={r.isOverdue ? 'font-semibold text-rose-600' : ''}>{r.dueDate ? formatDateTime(r.dueDate) : 'Not specified'}{r.isOverdue ? ' (past due)' : ''}</dd></div>
                    <div><dt className="text-xs font-semibold text-slate-500">Completed</dt><dd>{r.completedAt ? formatDateTime(r.completedAt) : '—'}</dd></div>
                  </dl>
                </Section>

                <Section title="Update status">
                  {actions.length === 0 ? (
                    <p className="text-sm text-slate-500">{r.allowedTransitions.length === 0 ? `A ${r.status} request is final. No further changes are possible.` : 'The office handling this request updates its status.'}</p>
                  ) : (
                    <>
                      <label className="block">
                        <span className="label">Note <span className="font-normal text-slate-400">(optional)</span></span>
                        <textarea rows={2} maxLength={300} className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Shown in the status history" />
                      </label>
                      <div className="mt-3 flex flex-col gap-2">
                        {actions.map((s) => (
                          <button key={s} type="button" disabled={busy !== null} onClick={() => move(s)} className={s === 'rejected' || s === 'cancelled' ? 'btn-secondary text-rose-600' : 'btn-primary'}>
                            {busy === s && <Spinner className="h-4 w-4" />}{ACTION_LABEL[s]}
                          </button>
                        ))}
                      </div>
                      <p className="mt-3 text-xs text-slate-500">Only moves allowed by the workflow are offered. The server validates every change.</p>
                    </>
                  )}
                </Section>
              </div>

              <Modal open={editing} title="Edit request" onClose={() => setEditing(false)}>
                <RequestForm editing={r} onCancel={() => setEditing(false)} onDone={() => { setEditing(false); state.reload() }} />
              </Modal>
            </div>
          )
        }}
      </DataState>
    </>
  )
}
