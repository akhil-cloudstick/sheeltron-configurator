import { createPortal } from 'react-dom'
import { useUiStore, type ToastKind } from '@/store/uiStore'
import { IconCheck, IconAlert, IconInfo, IconClose } from './Icons'
import { cn } from '@/lib/cn'

const toneClasses: Record<ToastKind, string> = {
  success: 'border-success/40 bg-success-soft text-success',
  error: 'border-danger/40 bg-danger-soft text-danger',
  info: 'border-info/40 bg-info-soft text-info',
}

function ToastIcon({ kind }: { kind: ToastKind }) {
  if (kind === 'success') return <IconCheck />
  if (kind === 'error') return <IconAlert />
  return <IconInfo />
}

export function ToastHost() {
  const toasts = useUiStore((s) => s.toasts)
  const dismiss = useUiStore((s) => s.dismissToast)

  return createPortal(
    <div className="fixed bottom-4 right-4 z-[60] flex w-[300px] flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            'animate-toast-in flex items-start gap-2 rounded-card border bg-surface px-3 py-2.5 shadow-hover',
            toneClasses[t.kind],
          )}
        >
          <span className="mt-0.5 shrink-0">
            <ToastIcon kind={t.kind} />
          </span>
          <p className="flex-1 text-caption font-medium leading-snug">{t.message}</p>
          <button
            aria-label="Dismiss"
            onClick={() => dismiss(t.id)}
            className="shrink-0 opacity-60 hover:opacity-100"
          >
            <IconClose width={14} height={14} />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  )
}
