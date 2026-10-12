import { useEffect } from 'react'
import type { ReactNode } from 'react'
import Icon from './Icon'
import { Spinner } from './DataState'

interface ModalProps { open: boolean; title: string; onClose: () => void; children: ReactNode; wide?: boolean }

export default function Modal({ open, title, onClose, children, wide }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`animate-pop flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'}`}>
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg">{title}</h2>
          <button type="button" onClick={onClose} className="btn-ghost -mr-2 px-2" aria-label="Close"><Icon name="close" /></button>
        </div>
        <div className="overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  )
}

interface ConfirmProps { open: boolean; title: string; message: ReactNode; confirmLabel?: string; busy?: boolean; danger?: boolean; onConfirm: () => void; onCancel: () => void }

/** Asks before destructive actions such as delete or cancel. */
export function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', busy, danger = true, onConfirm, onCancel }: ConfirmProps) {
  return (
    <Modal open={open} title={title} onClose={onCancel}>
      <div className="text-sm text-slate-600">{message}</div>
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>Keep it</button>
        <button type="button" className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm} disabled={busy}>{busy && <Spinner className="h-4 w-4" />}{confirmLabel}</button>
      </div>
    </Modal>
  )
}

/** Standard footer for create/edit forms inside a modal. */
export function FormActions({ onCancel, busy, label }: { onCancel: () => void; busy: boolean; label: string }) {
  return (
    <div className="mt-6 flex justify-end gap-2">
      <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>Cancel</button>
      <button type="submit" className="btn-primary" disabled={busy}>{busy && <Spinner className="h-4 w-4" />}{label}</button>
    </div>
  )
}
