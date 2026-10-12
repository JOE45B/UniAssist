import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { LoadingBlock } from '../components/DataState'
import type { Role } from '../types'

/**
 * Client-side route guard. This only decides what to render: every API route is
 * protected again on the server, which is what actually enforces access.
 */
export default function ProtectedRoute({ roles }: { roles?: Role[] }) {
  const { user, checking } = useAuth()
  const location = useLocation()
  if (checking) return <div className="mx-auto max-w-md p-10"><LoadingBlock label="Checking your session…" /></div>
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
