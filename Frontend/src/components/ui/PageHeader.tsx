import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Page title + optional description on the left, actions on the right. */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-3', className)}>
      <div>
        <h1 className="font-display text-[22px] font-bold leading-tight text-primary">{title}</h1>
        {description && <p className="mt-1 text-caption text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/** "MOCK DATA" / similar inline notice strip. */
export function NoticeBar({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warning' }) {
  return (
    <div
      className={cn(
        'rounded-card border px-3 py-2 text-[11px] font-medium',
        tone === 'warning'
          ? 'border-warning/30 bg-warning-soft text-warning'
          : 'border-info/30 bg-info-soft text-info',
      )}
    >
      {children}
    </div>
  )
}
