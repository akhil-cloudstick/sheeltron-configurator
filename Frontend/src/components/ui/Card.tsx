import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-card border border-border bg-surface', className)}>{children}</div>
  )
}

export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <Card className="px-4 py-3">
      <div className="text-meta uppercase text-muted">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold text-primary">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-muted">{hint}</div>}
    </Card>
  )
}
