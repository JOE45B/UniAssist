import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import api, { cleanParams } from '../../services/api'
import { useAuth } from '../../hooks/useAuth'
import { useFetch } from '../../hooks/useFetch'
import { useDebounce } from '../../hooks/useDebounce'
import { useToast } from '../../hooks/useToast'
import DataState, { EmptyBlock } from '../../components/DataState'
import Modal, { ConfirmDialog, FormActions } from '../../components/Modal'
import Icon from '../../components/Icon'
import { Field, PageHeader, SearchInput, Select, StatusBadge, TableCard, Toolbar } from '../../components/ui'
import { userCreateSchema, userEditSchema } from '../../schemas'
import type { UserValues } from '../../schemas'
import type { User } from '../../types'
import { ROLES } from '../../utils/constants'
import { capitalize, formatDate } from '../../utils/format'

function UserForm({ editing, onDone, onCancel }: { editing: User | null; onDone: () => void; onCancel: () => void }) {
  const toast = useToast()
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<UserValues>({
    resolver: zodResolver(editing ? userEditSchema : userCreateSchema),
    defaultValues: editing
      ? { name: editing.name, email: editing.email, role: editing.role, idNumber: editing.idNumber ?? '', department: editing.department ?? '', program: editing.program ?? '', isActive: editing.isActive, password: '' }
      : { name: '', email: '', role: 'student', idNumber: '', department: '', program: '', isActive: true, password: '' },
  })
  const onSubmit = async (values: UserValues) => {
    try {
      if (editing) await api.put(`/users/${editing._id}`, values); else await api.post('/users', values)
      toast.success(editing ? 'User updated' : 'User created')
      onDone()
    } catch (err) {
      const res = (err as { response?: { status?: number; data?: { message?: string } } }).response
      if (res?.status === 409) setError(res.data?.message?.includes('idNumber') ? 'idNumber' : 'email', { message: res.data?.message })
      toast.error(err)
    }
  }
  const cls = (bad: unknown) => `input ${bad ? 'input-error' : ''}`
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
      <Field label="Full name" error={errors.name?.message} className="sm:col-span-2"><input className={cls(errors.name)} {...register('name')} /></Field>
      <Field label="Email" error={errors.email?.message} className="sm:col-span-2"><input type="email" className={cls(errors.email)} {...register('email')} /></Field>
      <Field label="Role" error={errors.role?.message}><select className={cls(errors.role)} {...register('role')}>{ROLES.map((r) => <option key={r} value={r}>{capitalize(r)}</option>)}</select></Field>
      <Field label="ID number" error={errors.idNumber?.message} hint="Optional"><input className={cls(errors.idNumber)} {...register('idNumber')} /></Field>
      <Field label="Department" error={errors.department?.message} hint="For faculty and staff"><input className={cls(errors.department)} {...register('department')} /></Field>
      <Field label="Program" error={errors.program?.message} hint="For students"><input className={cls(errors.program)} {...register('program')} /></Field>
      <Field label={editing ? 'New password' : 'Password'} error={errors.password?.message} hint={editing ? 'Leave blank to keep the current password' : 'At least 8 characters'} className="sm:col-span-2"><input type="password" autoComplete="new-password" className={cls(errors.password)} {...register('password')} /></Field>
      <label className="flex items-center gap-2 text-sm font-semibold text-navy-900 sm:col-span-2"><input type="checkbox" className="h-4 w-4 accent-indigo-600" {...register('isActive')} />Account is active (can sign in)</label>
      <div className="sm:col-span-2"><FormActions onCancel={onCancel} busy={isSubmitting} label={editing ? 'Save changes' : 'Create user'} /></div>
    </form>
  )
}

export default function AdminUsers() {
  const toast = useToast()
  const { user: me } = useAuth()
  const [q, setQ] = useState('')
  const [role, setRole] = useState('')
  const [active, setActive] = useState('')
  const search = useDebounce(q)
  const list = useFetch<User[]>('/users', cleanParams({ q: search, role, isActive: active }))
  const [form, setForm] = useState<{ open: boolean; editing: User | null }>({ open: false, editing: null })
  const [deleting, setDeleting] = useState<User | null>(null)
  const [busy, setBusy] = useState(false)
  const filtered = Boolean(search || role || active)

  const remove = async () => {
    if (!deleting) return
    setBusy(true)
    try { await api.delete(`/users/${deleting._id}`); toast.success('User deleted'); setDeleting(null); list.reload() } catch (err) { toast.error(err) } finally { setBusy(false) }
  }

  return (
    <>
      <PageHeader eyebrow="Manage" title="Users" description="Create accounts, change roles and deactivate access. Only administrators can open this page."
        actions={<button type="button" className="btn-primary" onClick={() => setForm({ open: true, editing: null })}><Icon name="plus" className="h-4 w-4" />Add user</button>} />
      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Search name, email, ID or department" />
        <Select value={role} onChange={setRole} options={ROLES} all="All roles" label="Filter by role" />
        <Select value={active} onChange={setActive} options={[{ value: 'true', label: 'Active' }, { value: 'false', label: 'Deactivated' }]} all="Any status" label="Filter by status" />
      </Toolbar>
      <DataState state={list} loadingLabel="Loading users…" isEmpty={(rows) => rows.length === 0}
        empty={<EmptyBlock icon="users" title={filtered ? 'No users match your filters' : 'No users yet'} hint={filtered ? 'Try clearing a filter.' : 'Add the first account.'} />}>
        {(rows) => (
          <>
            <p className="mb-2 text-sm text-slate-500">{rows.length} {rows.length === 1 ? 'user' : 'users'}</p>
            <TableCard head={<><th className="th">Name</th><th className="th">Role</th><th className="th">ID number</th><th className="th">Program / department</th><th className="th">Status</th><th className="th">Joined</th><th className="th text-right">Actions</th></>}>
              {rows.map((u) => (
                <tr key={u._id} className="hover:bg-slate-50/60">
                  <td className="td"><p className="font-semibold text-navy-900">{u.name}{u._id === me?._id && <span className="ml-2 text-xs font-normal text-slate-400">(you)</span>}</p><p className="text-xs text-slate-500">{u.email}</p></td>
                  <td className="td"><StatusBadge value={u.role} /></td>
                  <td className="td whitespace-nowrap text-slate-600">{u.idNumber || '—'}</td>
                  <td className="td text-slate-600">{u.program || u.department || '—'}</td>
                  <td className="td"><StatusBadge value={u.isActive ? 'active' : 'inactive'} label={u.isActive ? 'Active' : 'Deactivated'} /></td>
                  <td className="td whitespace-nowrap text-slate-600">{formatDate(u.createdAt)}</td>
                  <td className="td">
                    <div className="flex justify-end gap-1">
                      <button type="button" className="btn-ghost btn-sm" onClick={() => setForm({ open: true, editing: u })}>Edit</button>
                      <button type="button" className="btn-ghost btn-sm text-rose-600" disabled={u._id === me?._id} title={u._id === me?._id ? 'You cannot delete your own account' : undefined} onClick={() => setDeleting(u)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </TableCard>
          </>
        )}
      </DataState>
      <Modal open={form.open} title={form.editing ? 'Edit user' : 'Add user'} onClose={() => setForm({ open: false, editing: null })}>
        <UserForm key={form.editing?._id ?? 'new'} editing={form.editing} onCancel={() => setForm({ open: false, editing: null })} onDone={() => { setForm({ open: false, editing: null }); list.reload() }} />
      </Modal>
      <ConfirmDialog open={Boolean(deleting)} title="Delete this user?" busy={busy} onCancel={() => setDeleting(null)} onConfirm={remove}
        message={<><b>{deleting?.name}</b> will be removed together with their schedules, tasks, requests, appointments, reservations and event registrations. This cannot be undone.</>} />
    </>
  )
}
