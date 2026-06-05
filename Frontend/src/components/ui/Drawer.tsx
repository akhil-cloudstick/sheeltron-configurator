import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IconButton } from './Button'
import { IconClose } from './Icons'

/** Right slide-in drawer (docs/04_VISUAL_DESIGN.md §4.4), ~480px wide. */
export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  footer,
  children,
  width = 480,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: ReactNode
  footer?: ReactNode
  children: ReactNode
  width?: number
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : 'Panel'}>
      <div className="absolute inset-0 bg-[rgba(13,23,49,0.4)]" onClick={onClose} aria-hidden />
      <aside
        className="animate-drawer-in relative flex h-full flex-col bg-elevated shadow-drawer"
        style={{ width: `min(${width}px, 100vw)` }}
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold text-primary">{title}</h2>
            {subtitle && <p className="mt-0.5 truncate text-caption text-muted">{subtitle}</p>}
          </div>
          <IconButton label="Close" onClick={onClose}>
            <IconClose />
          </IconButton>
        </header>
        <div className="scroll-thin flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <footer className="flex items-center justify-end gap-2 border-t border-border bg-surface px-5 py-3">
            {footer}
          </footer>
        )}
      </aside>
    </div>,
    document.body,
  )
}
