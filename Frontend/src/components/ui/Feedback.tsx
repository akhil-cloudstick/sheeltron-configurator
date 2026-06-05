import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block h-4 w-4 animate-spin rounded-full border-2 border-border-strong border-t-accent',
        className,
      )}
    />
  )
}

export function LoadingRow({ colSpan, label = 'Loading…' }: { colSpan: number; label?: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-10 text-center text-muted">
        <span className="inline-flex items-center gap-2">
          <Spinner /> {label}
        </span>
      </td>
    </tr>
  )
}

export function EmptyState({
  title,
  hint,
  action,
  icon,
}: {
  title: string
  hint?: string
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      {icon && <div className="text-muted">{icon}</div>}
      <p className="font-display text-base font-semibold text-primary">{title}</p>
      {hint && <p className="max-w-md text-caption text-muted">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-card border border-danger/40 bg-danger-soft px-4 py-3 text-caption text-danger">
      <span>{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="font-semibold underline underline-offset-2">
          Retry
        </button>
      )}
    </div>
  )
}
