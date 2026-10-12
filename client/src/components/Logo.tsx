import { Link } from 'react-router-dom'
import Icon from './Icon'

export default function Logo({ to = '/', light }: { to?: string; light?: boolean }) {
  return (
    <Link to={to} className="inline-flex items-center gap-2.5" aria-label="UniAssist home">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm"><Icon name="cap" /></span>
      <span className={`font-display text-lg font-bold tracking-tight ${light ? 'text-white' : 'text-navy-900'}`}>Uni<span className={light ? 'text-violet-300' : 'text-indigo-600'}>Assist</span></span>
    </Link>
  )
}
