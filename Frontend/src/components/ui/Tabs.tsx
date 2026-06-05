import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/cn'

export interface TabItem {
  to: string
  label: string
  end?: boolean
}

/** Underline-style tab nav backed by router links. */
export function TabNav({ items, className }: { items: TabItem[]; className?: string }) {
  return (
    <nav className={cn('flex items-center gap-1 border-b border-border', className)}>
      {items.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) =>
            cn(
              '-mb-px border-b-2 px-3 py-2 text-caption font-semibold transition-colors duration-fast',
              isActive
                ? 'border-accent text-accent-on-soft'
                : 'border-transparent text-muted hover:text-secondary',
            )
          }
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}

/** Stateful (non-routing) pill tabs. */
export function PillTabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div className="inline-flex rounded-control border border-border bg-subtle p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-[5px] px-3 py-1.5 text-caption font-semibold transition-colors duration-fast',
            value === o.value ? 'bg-surface text-primary shadow-sm' : 'text-muted hover:text-secondary',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
