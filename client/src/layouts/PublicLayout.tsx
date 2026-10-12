import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import Logo from '../components/Logo'
import Icon from '../components/Icon'
import { useAuth } from '../hooks/useAuth'

const LINKS = [{ to: '/', label: 'Home' }, { to: '/about', label: 'About' }]

export default function PublicLayout() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const linkClass = ({ isActive }: { isActive: boolean }) => `rounded-lg px-3 py-2 text-sm font-semibold ${isActive ? 'text-indigo-700' : 'text-slate-600 hover:text-navy-900'}`
  const cta = user
    ? <Link to="/dashboard" className="btn-primary" onClick={() => setOpen(false)}>Open dashboard</Link>
    : <><Link to="/login" className="btn-secondary" onClick={() => setOpen(false)}>Sign in</Link><Link to="/register" className="btn-primary" onClick={() => setOpen(false)}>Create account</Link></>

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {LINKS.map((l) => <NavLink key={l.to} to={l.to} end className={linkClass}>{l.label}</NavLink>)}
          </nav>
          <div className="hidden items-center gap-2 md:flex">{cta}</div>
          <button type="button" className="btn-ghost px-2 md:hidden" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label="Toggle menu"><Icon name={open ? 'close' : 'menu'} /></button>
        </div>
        {open && (
          <div className="border-t border-slate-200 px-4 py-3 md:hidden">
            <nav className="flex flex-col" aria-label="Mobile">
              {LINKS.map((l) => <NavLink key={l.to} to={l.to} end className={linkClass} onClick={() => setOpen(false)}>{l.label}</NavLink>)}
            </nav>
            <div className="mt-3 flex flex-col gap-2">{cta}</div>
          </div>
        )}
      </header>
      <main className="flex-1"><Outlet /></main>
      <footer className="border-t border-slate-200 bg-navy-950 text-slate-300">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Logo light />
          <p className="text-sm text-slate-400">University Student Services and Campus Assistant · Academic project</p>
          <div className="flex gap-4 text-sm">
            <Link to="/about" className="hover:text-white">About</Link>
            <Link to="/login" className="hover:text-white">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
