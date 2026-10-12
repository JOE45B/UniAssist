import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import api, { cleanParams } from '../../services/api'
import { useFetch } from '../../hooks/useFetch'
import { useDebounce } from '../../hooks/useDebounce'
import { useToast } from '../../hooks/useToast'
import DataState, { EmptyBlock } from '../../components/DataState'
import Modal, { ConfirmDialog, FormActions } from '../../components/Modal'
import Icon from '../../components/Icon'
import { Field, PageHeader, SearchInput, Select, StatusBadge, TableCard, Toolbar } from '../../components/ui'
import { announcementSchema } from '../../schemas'
import type { AnnouncementValues } from '../../schemas'
import type { Announcement } from '../../types'
import { ANNOUNCEMENT_CATEGORIES, PRIORITIES } from '../../utils/constants'
import { capitalize, formatDateTime, toDateTimeInput } from '../../utils/format'

function AnnouncementForm({ editing, onDone, onCancel }: { editing: Announcement | null; onDone: () => void; onCancel: () => void }) {
  const toast = useToast()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<AnnouncementValues>({
    resolver: zodResolver(announcementSchema),
    defaultValues: editing
      ? { title: editing.title, content: editing.content, category: editing.category as AnnouncementValues['category'], priority: editing.priority, publishDate: toDateTimeInput(editing.publishDate), expiryDate: toDateTimeInput(editing.expiryDate) }
      : { title: '', content: '', category: 'General', priority: 'medium', publishDate: toDateTimeInput(new Date()), expiryDate: toDateTimeInput(new Date(Date.now() + 14 * 86400000)) },
  })
  const onSubmit = async (values: AnnouncementValues) => {
    const payload = { ...values, publishDate: new Date(values.publishDate).toISOString(), expiryDate: new Date(values.expiryDate).toISOString() }
    try {
      if (editing) await api.put(`/announcements/${editing._id}`, payload); else await api.post('/announcements', payload)
      toast.success(editing ? 'Announcement updated' : 'Announcement saved')
      onDone()
    } catch (err) { toast.error(err) }
  }
  const cls = (bad: unknown) => `input ${bad ? 'input-error' : ''}`
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
      <Field label="Title" error={errors.title?.message} className="sm:col-span-2"><input className={cls(errors.title)} {...register('title')} /></Field>
      <Field label="Content" error={errors.content?.message} className="sm:col-span-2"><textarea rows={4} className={cls(errors.content)} {...register('content')} /></Field>
      <Field label="Category" error={errors.category?.message}><select className={cls(errors.category)} {...register('category')}>{ANNOUNCEMENT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
      <Field label="Priority" error={errors.priority?.message}><select className={cls(errors.priority)} {...register('priority')}>{PRIORITIES.map((p) => <option key={p} value={p}>{capitalize(p)}</option>)}</select></Field>
      <Field label="Publish on" error={errors.publishDate?.message} hint="A future date keeps it hidden until then"><input type="datetime-local" className={cls(errors.publishDate)} {...register('publishDate')} /></Field>
      <Field label="Expires on" error={errors.expiryDate?.message}><input type="datetime-local" className={cls(errors.expiryDate)} {...register('expiryDate')} /></Field>
      <div className="sm:col-span-2"><FormActions onCancel={onCancel} busy={isSubmitting} label={editing ? 'Save changes' : 'Save announcement'} /></div>
    </form>
  )
}

export default function AdminAnnouncements() {
  const toast = useToast()
  const [q, setQ] = useState('')
  const [state, setState] = useState('')
  const [category, setCategory] = useState('')
  const [priority, setPriority] = useState('')
  const search = useDebounce(q)
  const list = useFetch<Announcement[]>('/announcements', cleanParams({ q: search, state, category, priority }))
  const [form, setForm] = useState<{ open: boolean; editing: Announcement | null }>({ open: false, editing: null })
  const [deleting, setDeleting] = useState<Announcement | null>(null)
  const [busy, setBusy] = useState(false)
  const filtered = Boolean(search || state || category || priority)

  const remove = async () => {
    if (!deleting) return
    setBusy(true)
    try { await api.delete(`/announcements/${deleting._id}`); toast.success('Announcement deleted'); setDeleting(null); list.reload() } catch (err) { toast.error(err) } finally { setBusy(false) }
  }
  const add = <button type="button" className="btn-primary" onClick={() => setForm({ open: true, editing: null })}><Icon name="plus" className="h-4 w-4" />New announcement</button>

  return (
    <>
      <PageHeader eyebrow="Manage" title="Announcements" description="Upcoming, active and expired are calculated from the publish and expiry dates. Students only see active ones." actions={add} />
      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Search announcements" />
        <Select value={state} onChange={setState} options={['upcoming', 'active', 'expired']} all="All states" label="Filter by state" />
        <Select value={category} onChange={setCategory} options={ANNOUNCEMENT_CATEGORIES} all="All categories" label="Filter by category" />
        <Select value={priority} onChange={setPriority} options={PRIORITIES} all="All priorities" label="Filter by priority" />
      </Toolbar>
      <DataState state={list} loadingLabel="Loading announcements…" isEmpty={(rows) => rows.length === 0}
        empty={<EmptyBlock icon="megaphone" title={filtered ? 'No announcements match your filters' : 'No announcements yet'} hint={filtered ? 'Try clearing a filter.' : 'Post the first announcement.'} action={!filtered ? add : undefined} />}>
        {(rows) => (
          <TableCard head={<><th className="th">Announcement</th><th className="th">Category</th><th className="th">Priority</th><th className="th">State</th><th className="th">Publish</th><th className="th">Expires</th><th className="th text-right">Actions</th></>}>
            {rows.map((a) => (
              <tr key={a._id} className="hover:bg-slate-50/60">
                <td className="td max-w-72"><p className="font-semibold text-navy-900">{a.title}</p><p className="line-clamp-1 text-xs text-slate-500">{a.content}</p></td>
                <td className="td whitespace-nowrap text-slate-600">{a.category}</td>
                <td className="td"><StatusBadge value={a.priority} /></td>
                <td className="td"><StatusBadge value={a.state} /></td>
                <td className="td whitespace-nowrap text-slate-600">{formatDateTime(a.publishDate)}</td>
                <td className="td whitespace-nowrap text-slate-600">{formatDateTime(a.expiryDate)}</td>
                <td className="td">
                  <div className="flex justify-end gap-1">
                    <button type="button" className="btn-ghost btn-sm" onClick={() => setForm({ open: true, editing: a })}>Edit</button>
                    <button type="button" className="btn-ghost btn-sm text-rose-600" onClick={() => setDeleting(a)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </TableCard>
        )}
      </DataState>
      <Modal open={form.open} wide title={form.editing ? 'Edit announcement' : 'New announcement'} onClose={() => setForm({ open: false, editing: null })}>
        <AnnouncementForm key={form.editing?._id ?? 'new'} editing={form.editing} onCancel={() => setForm({ open: false, editing: null })} onDone={() => { setForm({ open: false, editing: null }); list.reload() }} />
      </Modal>
      <ConfirmDialog open={Boolean(deleting)} title="Delete this announcement?" busy={busy} onCancel={() => setDeleting(null)} onConfirm={remove}
        message={<>“<b>{deleting?.title}</b>” will be permanently removed.</>} />
    </>
  )
}
