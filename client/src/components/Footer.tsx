import { Link } from 'react-router-dom'
import Logo from './Logo'
import Icon from './Icon'
import type { IconName } from './Icon'
import { useAuth } from '../hooks/useAuth'
import { useFetch } from '../hooks/useFetch'
import { capitalize } from '../utils/format'

const YEAR = new Date().getFullYear()
const TAGLINE = 'Everything you need. One university assistant.'

const SERVICES: { to: string; label: string; icon: IconName }[] = [
  { to: '/schedule', label: 'Class schedule', icon: 'calendar' },
  { to: '/tasks', label: 'Tasks and deadlines', icon: 'check' },
  { to: '/service-requests', label: 'Service requests', icon: 'inbox' },
  { to: '/appointments', label: 'Appointments', icon: 'clock' },
  { to: '/reservations', label: 'Facility reservations', icon: 'building' },
  { to: '/events', label: 'Events', icon: 'ticket' },
]

/** Live status from GET /api/health, which pings MongoDB: green only when the API and database both answer. */
function StatusPill({ dark }: { dark?: boolean }) {
  const { data, loading, error } = useFetch<{ status: string; database: string }>('/health')
  const ok = !error && data?.status === 'ok' && data.database === 'connected'
  const tone = loading ? 'bg-slate-400' : ok ? 'bg-emerald-500' : 'bg-amber-500'
  const label = loading ? 'Checking status…'
    : ok ? 'All systems operational · Database connected'
    : error?.startsWith('Cannot reach') ? 'Server unreachable' : 'Database offline'
  return (
    <span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${dark ? 'bg-white/5 text-slate-200 ring-white/10' : 'bg-slate-50 text-slate-600 ring-slate-200'}`} role="status">
      <span className="relative flex h-2 w-2">
        {ok && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${tone}`} />
      </span>
      {label}
    </span>
  )
}

function BackToTop({ dark }: { dark?: boolean }) {
  return (
    <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={`group inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${dark ? 'text-slate-300 hover:bg-white/10 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-navy-900'}`}>
      Back to top<Icon name="arrow" className="h-3.5 w-3.5 -rotate-90 transition group-hover:-translate-y-0.5" />
    </button>
  )
}

/** Gradient hairline shared by both footers. */
const Glow = () => <div className="h-px bg-gradient-to-r from-transparent via-violet-500/70 to-transparent" aria-hidden="true" />

/** Compact footer under every signed-in page. */
export function AppFooter() {
  const { user, isStaff } = useAuth()
  const links = [
    { to: '/schedule', label: 'Schedule' },
    { to: '/tasks', label: 'Tasks' },
    { to: '/events', label: 'Events' },
    { to: '/announcements', label: 'Announcements' },
    ...(isStaff ? [{ to: '/admin', label: 'Analytics' }] : []),
  ]
  return (
    <footer className="mt-8 border-t border-slate-200/80 bg-white">
      <Glow />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <Logo to="/dashboard" />
          <p className="text-sm text-slate-500">{TAGLINE}</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-slate-600">
          {links.map((l) => <Link key={l.to} to={l.to} className="transition hover:text-indigo-600">{l.label}</Link>)}
        </nav>
        <StatusPill />
      </div>
      <div className="border-t border-slate-100">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {YEAR} UniAssist · University Student Services and Campus Assistant · Academic project</p>
          <div className="flex items-center gap-3">
            {user && <span>Signed in as <b className="font-semibold text-slate-700">{capitalize(user.role)}</b></span>}
            <BackToTop />
          </div>
        </div>
      </div>
    </footer>
  )
}

/** Large footer for the public landing and about pages. */
export function PublicFooter() {
  const { user } = useAuth()
  return (
    <footer className="relative overflow-hidden bg-navy-950 text-slate-300">
      <div className="pointer-events-none absolute -left-24 -top-32 h-80 w-80 rounded-full bg-indigo-600/25 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-40 right-0 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl" aria-hidden="true" />
      <Glow />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col gap-5 border-b border-white/10 py-10 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-display text-2xl font-semibold text-white sm:text-3xl">Campus life, <span className="bg-gradient-to-r from-indigo-300 to-violet-300 bg-clip-text text-transparent">simplified.</span></p>
            <p className="mt-1 text-sm text-slate-400">Classes, deadlines, requests, bookings and events in one place.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {user
              ? <Link to="/dashboard" className="btn-primary">Open dashboard<Icon name="arrow" className="h-4 w-4" /></Link>
              : <>
                  <Link to="/register" className="btn-primary">Create account<Icon name="arrow" className="h-4 w-4" /></Link>
                  <Link to="/login" className="btn border border-white/20 text-white hover:bg-white/10">Sign in</Link>
                </>}
          </div>
        </div>

        <div className="grid gap-10 py-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1.2fr]">
          <div className="space-y-4">
            <Logo light />
            <p className="max-w-xs text-sm leading-relaxed text-slate-400">{TAGLINE} Built for students, faculty and staff, with every number calculated from live records.</p>
            <StatusPill dark />
          </div>
          <div>
            <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-indigo-200/60">Explore</h2>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/" className="transition hover:text-white">Home</Link></li>
              <li><Link to="/about" className="transition hover:text-white">About UniAssist</Link></li>
              {user
                ? <li><Link to="/dashboard" className="transition hover:text-white">Dashboard</Link></li>
                : <>
                    <li><Link to="/login" className="transition hover:text-white">Sign in</Link></li>
                    <li><Link to="/register" className="transition hover:text-white">Create a student account</Link></li>
                  </>}
            </ul>
          </div>
          <div>
            <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-indigo-200/60">Student services</h2>
            <ul className="grid gap-2.5 text-sm">
              {SERVICES.map((s) => (
                <li key={s.to}>
                  <Link to={s.to} className="group inline-flex items-center gap-2.5 transition hover:text-white">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/5 text-indigo-300 ring-1 ring-white/10 transition group-hover:bg-indigo-500/20 group-hover:text-white"><Icon name={s.icon} className="h-4 w-4" /></span>
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {YEAR} UniAssist · University Student Services and Campus Assistant · Academic project</p>
          <BackToTop dark />
        </div>
      </div>
    </footer>
  )
}
