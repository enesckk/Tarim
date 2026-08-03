import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { cn } from '../../lib/utils'

export type ToastTone = 'ok' | 'bad' | 'info'

export type ToastMessage = {
  id: string
  message: string
  tone?: ToastTone
  durationMs?: number
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastMessage
  onDismiss: (id: string) => void
}) {
  useEffect(() => {
    const duration = toast.durationMs ?? 4000
    const timer = window.setTimeout(() => onDismiss(toast.id), duration)
    return () => window.clearTimeout(timer)
  }, [toast, onDismiss])

  const Icon = toast.tone === 'bad' ? AlertTriangle : toast.tone === 'ok' ? CheckCircle2 : Info

  return (
    <div className={cn('tai2-toast', `tai2-toast-${toast.tone ?? 'info'}`)} role="status">
      <Icon size={16} aria-hidden="true" />
      <span className="tai2-toast-message">{toast.message}</span>
      <button
        type="button"
        className="tai2-toast-close"
        onClick={() => onDismiss(toast.id)}
        aria-label="Bildirimi kapat"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  )
}

/** Simple toast stack rendered via a portal; state (which toasts are visible) is fully owned by the parent. */
export function Toast({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[]
  onDismiss: (id: string) => void
}) {
  if (typeof document === 'undefined' || toasts.length === 0) return null

  return createPortal(
    <div className="tai2-toast-portal" aria-live="polite">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body,
  )
}
