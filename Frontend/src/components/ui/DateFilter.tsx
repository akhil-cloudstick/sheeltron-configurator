import { cn } from '@/lib/cn'

/**
 * Compact date picker (native <input type="date">) styled to sit next to the
 * sm Dropdown in page headers. An empty value means "all dates".
 */
export function DateFilter({
  value,
  onChange,
  ariaLabel = 'Filter by date',
  className,
}: {
  value: string // YYYY-MM-DD, or '' for all dates
  onChange: (value: string) => void
  ariaLabel?: string
  className?: string
}) {
  return (
    <input
      type="date"
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'theme-date h-8 rounded-control border border-border bg-surface px-2 py-1 text-caption',
        'transition-colors duration-fast hover:bg-subtle',
        'focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40',
        value ? 'text-primary' : 'text-muted',
        className,
      )}
    />
  )
}
