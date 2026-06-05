import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type PillTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent'

const tones: Record<PillTone, string> = {
  neutral: 'bg-neutral-soft text-neutral-soft-ink',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  accent: 'bg-accent-soft text-accent-on-soft',
}

export function Pill({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: PillTone
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-pill px-2 py-0.5 text-[11px] font-semibold leading-none',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
