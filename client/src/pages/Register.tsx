import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema } from '../schemas'
import type { RegisterValues } from '../schemas'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { getErrorMessage } from '../services/api'
import { Field } from '../components/ui'
import { Spinner } from '../components/DataState'

export default function Register() {
  const { user, register: signUp } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [serverError, setServerError] = useState<string | null>(null)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', idNumber: '', program: '', password: '', confirmPassword: '' },
  })

  if (user) return <Navigate to="/dashboard" replace />

  const onSubmit = async ({ confirmPassword: _confirm, ...values }: RegisterValues) => {
    setServerError(null)
    try { await signUp(values); toast.success('Account created. Welcome to UniAssist!'); navigate('/dashboard', { replace: true }) } catch (err) { setServerError(getErrorMessage(err)) }
  }
  const cls = (bad: unknown) => `input ${bad ? 'input-error' : ''}`

  return (
    <div className="mx-auto grid grid-cols-1 max-w-lg gap-6 px-4 py-12 sm:py-16">
      <div className="text-center">
        <p className="eyebrow">Students</p>
        <h1 className="mt-1 text-3xl">Create your account</h1>
        <p className="mt-2 text-sm text-slate-500">Faculty and admin accounts are created by an administrator.</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="card grid grid-cols-1 gap-4 p-6 sm:grid-cols-2" noValidate>
        {serverError && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800 sm:col-span-2" role="alert">{serverError}</p>}
        <Field label="Full name" error={errors.name?.message} className="sm:col-span-2"><input className={cls(errors.name)} autoComplete="name" {...register('name')} /></Field>
        <Field label="Email" error={errors.email?.message} className="sm:col-span-2"><input type="email" className={cls(errors.email)} autoComplete="email" {...register('email')} /></Field>
        <Field label="Student ID number" error={errors.idNumber?.message} hint="Optional"><input className={cls(errors.idNumber)} placeholder="2024-0001" {...register('idNumber')} /></Field>
        <Field label="Program" error={errors.program?.message} hint="Optional"><input className={cls(errors.program)} placeholder="BS Information Technology" {...register('program')} /></Field>
        <Field label="Password" error={errors.password?.message}><input type="password" className={cls(errors.password)} autoComplete="new-password" {...register('password')} /></Field>
        <Field label="Confirm password" error={errors.confirmPassword?.message}><input type="password" className={cls(errors.confirmPassword)} autoComplete="new-password" {...register('confirmPassword')} /></Field>
        <button type="submit" className="btn-primary sm:col-span-2" disabled={isSubmitting}>{isSubmitting && <Spinner className="h-4 w-4" />}Create account</button>
        <p className="text-center text-sm text-slate-500 sm:col-span-2">Already registered? <Link to="/login" className="font-semibold text-indigo-600 hover:underline">Sign in</Link></p>
      </form>
    </div>
  )
}
