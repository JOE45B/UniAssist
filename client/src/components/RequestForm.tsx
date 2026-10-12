import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import api from '../services/api'
import { useToast } from '../hooks/useToast'
import { FormActions } from './Modal'
import { Field } from './ui'
import { requestSchema } from '../schemas'
import type { RequestValues } from '../schemas'
import type { ServiceRequest } from '../types'
import { PRIORITIES, REQUEST_CATEGORIES } from '../utils/constants'
import { capitalize, toDateInput } from '../utils/format'

export default function RequestForm({ editing, onDone, onCancel }: { editing: ServiceRequest | null; onDone: () => void; onCancel: () => void }) {
  const toast = useToast()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RequestValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: editing
      ? { category: editing.category as RequestValues['category'], title: editing.title, description: editing.description, priority: editing.priority, dueDate: editing.dueDate ? toDateInput(new Date(editing.dueDate)) : '' }
      : { category: 'Registrar', title: '', description: '', priority: 'medium', dueDate: '' },
  })
  const onSubmit = async (values: RequestValues) => {
    // The needed-by date means "by the end of that day".
    const payload = { ...values, dueDate: values.dueDate ? new Date(`${values.dueDate}T23:59:00`).toISOString() : '' }
    try {
      if (editing) await api.put(`/service-requests/${editing._id}`, payload); else await api.post('/service-requests', payload)
      toast.success(editing ? 'Request updated' : 'Request submitted')
      onDone()
    } catch (err) { toast.error(err) }
  }
  const cls = (bad: unknown) => `input ${bad ? 'input-error' : ''}`
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
      <Field label="Category" error={errors.category?.message}>
        <select className={cls(errors.category)} {...register('category')}>{REQUEST_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
      </Field>
      <Field label="Priority" error={errors.priority?.message}>
        <select className={cls(errors.priority)} {...register('priority')}>{PRIORITIES.map((p) => <option key={p} value={p}>{capitalize(p)}</option>)}</select>
      </Field>
      <Field label="Title" error={errors.title?.message} className="sm:col-span-2"><input className={cls(errors.title)} placeholder="e.g. Transcript of Records for internship" {...register('title')} /></Field>
      <Field label="Description" error={errors.description?.message} className="sm:col-span-2"><textarea rows={4} className={cls(errors.description)} placeholder="What do you need, and any details the office should know?" {...register('description')} /></Field>
      <Field label="Needed by" error={errors.dueDate?.message} hint="Optional"><input type="date" min={toDateInput()} className={cls(errors.dueDate)} {...register('dueDate')} /></Field>
      <div className="sm:col-span-2"><FormActions onCancel={onCancel} busy={isSubmitting} label={editing ? 'Save changes' : 'Submit request'} /></div>
    </form>
  )
}
