import { Link } from 'react-router-dom'
import Logo from '../components/Logo'

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center bg-surface px-4">
      <div className="card max-w-md p-8 text-center">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <p className="eyebrow">Error 404</p>
        <h1 className="mt-1 text-2xl">This page doesn’t exist</h1>
        <p className="mt-2 text-sm text-slate-500">The link may be outdated, or the page may have been moved.</p>
        <div className="mt-6 flex justify-center gap-2">
          <Link to="/" className="btn-secondary">Home</Link>
          <Link to="/dashboard" className="btn-primary">Go to dashboard</Link>
        </div>
      </div>
    </div>
  )
}
