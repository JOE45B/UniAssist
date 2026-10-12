import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import api, { TOKEN_KEY } from '../services/api'
import type { AuthResponse, User } from '../types'

interface AuthContextValue {
  user: User | null
  /** True while the saved session is being checked on first load. */
  checking: boolean
  isStaff: boolean
  isAdmin: boolean
  login: (email: string, password: string) => Promise<User>
  register: (payload: Record<string, unknown>) => Promise<User>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(Boolean(localStorage.getItem(TOKEN_KEY)))

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return
    api.get<User>('/auth/me').then((res) => setUser(res.data)).catch(() => localStorage.removeItem(TOKEN_KEY)).finally(() => setChecking(false))
  }, [])

  useEffect(() => {
    const onUnauthorized = () => setUser(null)
    window.addEventListener('uniassist:unauthorized', onUnauthorized)
    return () => window.removeEventListener('uniassist:unauthorized', onUnauthorized)
  }, [])

  // Every tab shares one saved token. When another tab signs in or out, follow it here too,
  // otherwise this tab keeps showing the old account while sending the new account's token.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== TOKEN_KEY && e.key !== null) return
      if (!localStorage.getItem(TOKEN_KEY)) { setUser(null); return }
      api.get<User>('/auth/me').then((res) => setUser(res.data)).catch(() => setUser(null))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const accept = useCallback((data: AuthResponse) => {
    localStorage.setItem(TOKEN_KEY, data.token)
    setUser(data.user)
    return data.user
  }, [])
  const login = useCallback(async (email: string, password: string) => accept((await api.post<AuthResponse>('/auth/login', { email, password })).data), [accept])
  const register = useCallback(async (payload: Record<string, unknown>) => accept((await api.post<AuthResponse>('/auth/register', payload)).data), [accept])
  const logout = useCallback(() => { localStorage.removeItem(TOKEN_KEY); setUser(null) }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user, checking, login, register, logout,
    isStaff: user?.role === 'faculty' || user?.role === 'admin',
    isAdmin: user?.role === 'admin',
  }), [user, checking, login, register, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
