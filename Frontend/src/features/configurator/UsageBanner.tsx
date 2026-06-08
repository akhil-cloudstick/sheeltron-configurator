import { cn } from '@/lib/cn'

// A compact "x / max" usage strip shown above a step's option list (RAM slots & GB,
// storage bays). Turns amber when a limit is reached.
export function UsageBanner({ items }: { items: { label: string; text: string; full?: boolean }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-card border border-border bg-subtle/40 px-3 py-2">
      {items.map((it) => (
        <div key={it.label} className="flex items-baseline gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">{it.label}</span>
          <span className={cn('font-mono text-caption tabular-nums', it.full ? 'text-warning' : 'text-primary')}>
            {it.text}
          </span>
        </div>
      ))}
    </div>
  )
}
