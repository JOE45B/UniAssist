import type { ReactNode } from 'react'
import Icon from './Icon'
import type { IconName } from './Icon'
import { capitalize } from '../utils/format'

const TONES = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
  sky: 'bg-sky-50 text-sky-700 ring-sky-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  rose: 'bg-rose-50 text-rose-700 ring-rose-200',
  teal: 'bg-teal-50 text-teal-700 ring-teal-200',
} as const
export type Tone = keyof typeof TONES

const STATUS_TONE: Record<string, Tone> = {
  pending: 'amber', processing: 'sky', ready: 'violet', completed: 'teal', rejected: 'rose', cancelled: 'slate',
  overdue: 'rose', scheduled: 'indigo', confirmed: 'indigo', active: 'teal', upcoming: 'sky', expired: 'slate', ongoing: 'violet', past: 'slate',
  high: 'rose', medium: 'amber', low: 'slate', student: 'indigo', faculty: 'violet', admin: 'rose', inactive: 'slate',
}

export function Badge({ children, tone = 'slate', dot }: { children: ReactNode; tone?: Tone; dot?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset whitespace-nowrap ${TONES[tone]}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

/** Badge whose colour is derived from a status / priority / role keyword. */
export function StatusBadge({ value, label }: { value: string; label?: string }) {
  return <Badge tone={STATUS_TONE[value] ?? 'slate'} dot>{label ?? capitalize(value)}</Badge>
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h1 className="text-2xl sm:text-[1.75rem]">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function StatCard({ label, value, hint, icon, tone = 'indigo' }: { label: string; value: ReactNode; hint?: string; icon: IconName; tone?: Tone }) {
  return (
    <div className="card flex items-start gap-3 p-4">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1 ring-inset ${TONES[tone]}`}><Icon name={icon} /></span>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <p className="font-display text-2xl font-bold tabular-nums text-navy-900">{value}</p>
        {hint && <p className="truncate text-xs text-slate-500">{hint}</p>}
      </div>
    </div>
  )
}

export function Section({ title, action, children, className = '' }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card p-5 ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

const BAR = { indigo: 'bg-indigo-500', violet: 'bg-violet-500', rose: 'bg-rose-500', amber: 'bg-amber-500', teal: 'bg-teal-500', sky: 'bg-sky-500', slate: 'bg-slate-400' } as const

/** Horizontal bar chart drawn from live counts. */
export function BarList({ items, tone = 'indigo' }: { items: { label: string; value: number; tone?: Tone }[]; tone?: Tone }) {
  const max = Math.max(...items.map((i) => i.value), 1)
  if (!items.length) return <p className="text-sm text-slate-500">No data yet.</p>
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item.label} className="grid grid-cols-[minmax(0,9rem)_1fr_2rem] items-center gap-3 text-sm">
          <span className="truncate text-slate-600" title={item.label}>{item.label}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <span className={`block h-full rounded-full ${BAR[item.tone ?? tone]}`} style={{ width: `${item.value ? Math.max((item.value / max) * 100, 4) : 0}%` }} />
          </span>
          <span className="text-right font-semibold tabular-nums text-navy-900">{item.value}</span>
        </li>
      ))}
    </ul>
  )
}

export function Progress({ value, tone = 'indigo' }: { value: number; tone?: Tone }) {
  return (
    <span className="block h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <span className={`block h-full rounded-full ${BAR[tone]}`} style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }} />
    </span>
  )
}

/** Search box + filters row used above lists. */
export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center [&>*]:lg:w-auto [&>*]:lg:min-w-40">{children}</div>
}

export function SearchInput({ value, onChange, placeholder = 'Search…' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="relative block lg:!min-w-64 lg:flex-1">
      <span className="sr-only">{placeholder}</span>
      <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input type="search" className="input pl-9" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  )
}

export function Select({ value, onChange, options, all, label }: { value: string; onChange: (v: string) => void; options: readonly (string | { value: string; label: string })[]; all?: string; label: string }) {
  return (
    <select className="input" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
      {all !== undefined && <option value="">{all}</option>}
      {options.map((o) => typeof o === 'string' ? <option key={o} value={o}>{capitalize(o)}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

/** Label + control + per-field validation message. */
export function Field({ label, error, hint, children, className = '' }: { label: string; error?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs font-medium text-rose-600" role="alert">{error}</span> : hint ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null}
    </label>
  )
}

/** Responsive table shell: scrolls inside its own card instead of the page. */
export function TableCard({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse">
          <thead className="border-b border-slate-200 bg-slate-50/70"><tr>{head}</tr></thead>
          <tbody className="divide-y divide-slate-100">{children}</tbody>
        </table>
      </div>
    </div>
  )
}
