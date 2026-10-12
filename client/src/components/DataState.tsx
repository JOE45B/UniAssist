import type { ReactNode } from 'react'
import Icon from './Icon'
import type { IconName } from './Icon'

export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return <span className={`inline-block animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600 ${className}`} role="status" aria-label="Loading" />
}

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-3 px-6 py-14 text-sm text-slate-500">
      <Spinner className="h-7 w-7" />
      {label}
    </div>
  )
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card flex flex-col items-center gap-3 border-rose-200 bg-rose-50/60 px-6 py-10 text-center" role="alert">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-rose-100 text-rose-600"><Icon name="alert" /></span>
      <div>
        <p className="font-semibold text-rose-900">We couldn’t load this</p>
        <p className="mt-1 max-w-md text-sm text-rose-800">{message}</p>
      </div>
      {onRetry && <button type="button" className="btn-secondary" onClick={onRetry}><Icon name="refresh" className="h-4 w-4" />Try again</button>}
    </div>
  )
}

export function EmptyBlock({ icon = 'inbox', title, hint, action }: { icon?: IconName; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-3 border-dashed px-6 py-12 text-center">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-indigo-50 text-indigo-600"><Icon name={icon} /></span>
      <div>
        <p className="font-semibold text-navy-900">{title}</p>
        {hint && <p className="mt-1 max-w-md text-sm text-slate-500">{hint}</p>}
      </div>
      {action}
    </div>
  )
}

interface DataStateProps<T> {
  state: { data: T | null; loading: boolean; error: string | null; reload: () => void }
  /** Decides whether loaded data counts as empty. */
  isEmpty?: (data: T) => boolean
  empty?: ReactNode
  loadingLabel?: string
  children: (data: T) => ReactNode
}

/** Renders exactly one of: loading, error (with retry), empty, or the data. */
export default function DataState<T>({ state, isEmpty, empty, loadingLabel, children }: DataStateProps<T>) {
  if (state.loading && state.data === null) return <LoadingBlock label={loadingLabel} />
  if (state.error && state.data === null) return <ErrorBlock message={state.error} onRetry={state.reload} />
  if (state.data === null) return <LoadingBlock label={loadingLabel} />
  return (
    <>
      {state.error && <div className="mb-3"><ErrorBlock message={state.error} onRetry={state.reload} /></div>}
      {isEmpty?.(state.data) ? (empty ?? <EmptyBlock title="Nothing here yet" />) : children(state.data)}
    </>
  )
}
