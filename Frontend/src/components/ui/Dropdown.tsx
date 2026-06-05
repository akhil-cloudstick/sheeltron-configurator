import { useEffect, useMemo, useRef, useState } from 'react'
import { IconChevronDown, IconSearch } from './Icons'
import { Input } from './Field'
import { cn } from '@/lib/cn'

export interface DropdownOption {
  value: string
  label: string
}

/**
 * Themed select replacement (not a native <select>) so the menu matches the app
 * theme. Closes on outside-click / Escape. When `searchable`, a sticky search box is
 * pinned to the top of the menu and the option list scrolls beneath it.
 */
export function Dropdown({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  ariaLabel,
  className,
  buttonClassName,
  menuWidth = 'min-w-full',
  size = 'md',
  searchable = false,
  searchPlaceholder = 'Search…',
}: {
  value: string
  onChange: (value: string) => void
  options: DropdownOption[]
  placeholder?: string
  ariaLabel?: string
  className?: string
  buttonClassName?: string
  menuWidth?: string
  size?: 'sm' | 'md'
  searchable?: boolean
  searchPlaceholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const current = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Reset the query each time the menu opens, and focus the search box.
  useEffect(() => {
    if (open && searchable) {
      setQuery('')
      const t = setTimeout(() => searchRef.current?.focus(), 0)
      return () => clearTimeout(t)
    }
  }, [open, searchable])

  const filtered = useMemo(() => {
    if (!searchable) return options
    const needle = query.trim().toLowerCase()
    if (!needle) return options
    return options.filter((o) => o.label.toLowerCase().includes(needle))
  }, [options, query, searchable])

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-control border bg-surface transition-colors duration-fast',
          size === 'sm' ? 'h-8 px-2 py-1 text-caption' : 'px-3 py-2 text-body',
          'hover:bg-subtle focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40',
          open ? 'border-accent' : 'border-border',
          buttonClassName,
        )}
      >
        <span className={cn('truncate', current ? 'text-primary' : 'text-muted')}>
          {current?.label ?? placeholder}
        </span>
        <IconChevronDown
          width={size === 'sm' ? 13 : 15}
          height={size === 'sm' ? 13 : 15}
          className={cn('shrink-0 text-muted transition-transform duration-fast', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className={cn(
            'absolute left-0 z-30 mt-1 overflow-hidden rounded-control border border-border bg-elevated shadow-hover',
            menuWidth,
          )}
        >
          {searchable && (
            <div className="border-b border-border bg-elevated p-1.5">
              <div className="relative">
                <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted">
                  <IconSearch width={13} height={13} />
                </span>
                <Input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="h-7 py-1 pl-7 text-caption"
                />
              </div>
            </div>
          )}

          <div className={cn('scroll-thin overflow-y-auto py-1', searchable ? 'max-h-44' : 'max-h-64')}>
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-caption text-muted">No options</div>
            )}
            {filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={o.value === value}
                onClick={() => {
                  onChange(o.value)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center px-3 py-1.5 text-left text-caption transition-colors',
                  o.value === value
                    ? 'bg-accent-soft font-semibold text-accent-on-soft'
                    : 'text-secondary hover:bg-subtle',
                )}
              >
                <span className="truncate">{o.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
