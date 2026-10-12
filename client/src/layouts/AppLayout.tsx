import { useState } from 'react'
import type { FormEvent } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import Icon from '../components/Icon'
import type { IconName } from '../components/Icon'
import { useAuth } from '../hooks/useAuth'
import { capitalize } from '../utils/format'

interface NavItem { to: string; label: string; icon: IconName; end?: boolean; adminOnly?: boolean }

const MAIN: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: 'home' },
  { to: '/schedule', label: 'Schedule', icon: 'calendar' },
  { to: '/tasks', label: 'Tasks', icon: 'check' },
  { to: '/service-requests', label: 'Service requests', icon: 'inbox' },
  { to: '/appointments', label: 'Appointments', icon: 'clock' },
  { to: '/reservations', label: 'Reservations', icon: 'building' },
  { to: '/events', label: 'Events', icon: 'ticket' },
  { to: '/announcements', label: 'Announcements', icon: 'megaphone' },
]
const MANAGE: NavItem[] = [
  { to: '/admin', label: 'Analytics', icon: 'chart', end: true },
  { to: '/admin/users', label: 'Users', icon: 'users', adminOnly: true },
  { to: '/admin/requests', label: 'Manage requests', icon: 'inbox' },
  { to: '/admin/appointments', label: 'Manage appointments', icon: 'clock' },
  { to: '/admin/reservations', label: 'Manage reservations', icon: 'building' },
  { to: '/admin/events', label: 'Manage events', icon: 'ticket' },
  { to: '/admin/announcements', label: 'Manage announcements', icon: 'megaphone' },
]

function NavList({ items, onNavigate }: { items: NavItem[]; onNavigate: () => void }) {
  return (
    <ul className="space-y-0.5">
      {items.map((item) => (
        <li key={item.to}>
          <NavLink to={item.to} end={item.end} onClick={onNavigate}
            className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-white/10 text-white shadow-[inset_3px_0_0_0_#a78bfa]' : 'text-indigo-100/70 hover:bg-white/5 hover:text-white'}`}>
            <Icon name={item.icon} />{item.label}
          </NavLink>
        </li>
      ))}
    </ul>
  )
}

export default function AppLayout() {
  const { user, isStaff, isAdmin, logout } = useAuth()
  const navigate = useNavigate()
  const [drawer, setDrawer] = useState(false)
  const [query, setQuery] = useState('')

  const onSearch = (e: FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (q.length >= 2) navigate(`/search?q=${encodeURIComponent(q)}`)
  }
  const signOut = () => { logout(); navigate('/') }
  const manage = MANAGE.filter((i) => !i.adminOnly || isAdmin)
  const initials = (user?.name ?? '').replace(/^(Prof\.|Mr\.|Ms\.)\s*/, '').split(' ').map((p) => p[0]).slice(0, 2).join('')

  const sidebar = (
    <div className="flex h-full flex-col bg-navy-950 bg-[radial-gradient(120%_60%_at_0%_0%,rgba(99,102,241,0.28),transparent_60%)]">
      <div className="flex h-16 items-center justify-between px-5">
        <Logo to="/dashboard" light />
        <button type="button" className="rounded-lg p-2 text-indigo-100 hover:bg-white/10 lg:hidden" onClick={() => setDrawer(false)} aria-label="Close menu"><Icon name="close" /></button>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Sidebar">
        <p className="px-3 pb-2 pt-3 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-indigo-200/50">My campus</p>
        <NavList items={MAIN} onNavigate={() => setDrawer(false)} />
        {isStaff && (
          <>
            <p className="px-3 pb-2 pt-6 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-indigo-200/50">Manage</p>
            <NavList items={manage} onNavigate={() => setDrawer(false)} />
          </>
        )}
      </nav>
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet-500/30 text-sm font-bold text-white">{initials}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
            <p className="truncate text-xs text-indigo-200/70">{capitalize(user?.role ?? '')}</p>
          </div>
          <button type="button" onClick={signOut} className="rounded-lg p-2 text-indigo-100/80 hover:bg-white/10 hover:text-white" aria-label="Sign out" title="Sign out"><Icon name="logout" /></button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-dvh lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{sidebar}</aside>
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/60" onClick={() => setDrawer(false)} />
          <aside className="animate-pop absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-2xl">{sidebar}</aside>
        </div>
      )}

      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur sm:px-6">
        <button type="button" className="btn-ghost -ml-2 px-2 lg:hidden" onClick={() => setDrawer(true)} aria-label="Open menu"><Icon name="menu" /></button>
        <form onSubmit={onSearch} className="relative min-w-0 flex-1 sm:max-w-md" role="search">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input type="search" className="input bg-slate-50 pl-9" placeholder="Search tasks, requests, events…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search UniAssist" minLength={2} />
        </form>
        <div className="ml-auto hidden text-right sm:block">
          <p className="text-sm font-semibold text-navy-900">{user?.name}</p>
          <p className="text-xs text-slate-500">{user?.program || user?.department || capitalize(user?.role ?? '')}</p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8"><Outlet /></main>
    </div>
  )
}
