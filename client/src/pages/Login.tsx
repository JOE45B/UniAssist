import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema } from '../schemas'
import type { LoginValues } from '../schemas'
import { useAuth } from '../hooks/useAuth'
import { getErrorMessage } from '../services/api'
import { Field } from '../components/ui'
import { Spinner } from '../components/DataState'

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'
  const [serverError, setServerError] = useState<string | null>(null)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })

  if (user) return <Navigate to={from} replace />

  const onSubmit = async (values: LoginValues) => {
    setServerError(null)
    try { await login(values.email, values.password); navigate(from, { replace: true }) } catch (err) { setServerError(getErrorMessage(err)) }
  }

  return (
    <div className="mx-auto grid grid-cols-1 max-w-md gap-6 px-4 py-12 sm:py-16">
      <div className="text-center">
        <p className="eyebrow">Welcome back</p>
        <h1 className="mt-1 text-3xl">Sign in to UniAssist</h1>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4 p-6" noValidate>
        {serverError && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800" role="alert">{serverError}</p>}
        <Field label="Email" error={errors.email?.message}>
          <input type="email" autoComplete="email" className={`input ${errors.email ? 'input-error' : ''}`} placeholder="you@student.uniassist.edu" {...register('email')} />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <input type="password" autoComplete="current-password" className={`input ${errors.password ? 'input-error' : ''}`} {...register('password')} />
        </Field>
        <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>{isSubmitting && <Spinner className="h-4 w-4" />}Sign in</button>
        <p className="text-center text-sm text-slate-500">New here? <Link to="/register" className="font-semibold text-indigo-600 hover:underline">Create a student account</Link></p>
      </form>
    </div>
  )
}
