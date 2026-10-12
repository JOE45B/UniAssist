import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { getErrorMessage } from '../services/api'

type ToastKind = 'success' | 'error'
interface Toast { id: number; kind: ToastKind; message: string }
interface ToastContextValue { success: (message: string) => void; error: (error: unknown) => void }

const ToastContext = createContext<ToastContextValue | null>(null)
let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), [])
  const push = useCallback((kind: ToastKind, message: string) => {
    const id = nextId++
    setToasts((list) => [...list.slice(-3), { id, kind, message }])
    setTimeout(() => dismiss(id), kind === 'error' ? 7000 : 4000)
  }, [dismiss])
  const value = useMemo<ToastContextValue>(() => ({
    success: (message) => push('success', message),
    error: (error) => push('error', typeof error === 'string' ? error : getErrorMessage(error)),
  }), [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-6" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} role={t.kind === 'error' ? 'alert' : 'status'}
            className={`animate-pop pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${t.kind === 'error' ? 'border-rose-200 bg-rose-50 text-rose-900' : 'border-indigo-200 bg-white text-navy-900'}`}>
            <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${t.kind === 'error' ? 'bg-rose-500' : 'bg-indigo-500'}`} />
            <span className="flex-1">{t.message}</span>
            <button type="button" onClick={() => dismiss(t.id)} className="text-slate-400 hover:text-slate-700" aria-label="Dismiss">✕</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
