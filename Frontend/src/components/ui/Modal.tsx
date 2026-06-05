import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './Button'

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 480,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  footer?: ReactNode
  width?: number
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-[rgba(13,23,49,0.4)]" onClick={onClose} aria-hidden />
      <div
        className="relative flex max-h-[85vh] flex-col rounded-card bg-elevated shadow-modal"
        style={{ width: `min(${width}px, 100vw)` }}
      >
        <div className="shrink-0 px-5 pt-5">
          <h2 className="font-display text-lg font-semibold text-primary">{title}</h2>
        </div>
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-5 py-4 text-body text-secondary">
          {children}
        </div>
        <div className="shrink-0 flex items-center justify-end gap-2 border-t border-border px-5 py-3">{footer}</div>
      </div>
    </div>,
    document.body,
  )
}

/** Common confirm dialog. The confirm button is destructive when `danger`. */
export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  confirmLabel = 'Confirm',
  danger,
  busy,
  children,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: ReactNode
  confirmLabel?: string
  danger?: boolean
  busy?: boolean
  children: ReactNode
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} disabled={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  )
}
