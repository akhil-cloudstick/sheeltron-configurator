import { useEffect, useRef, useState } from 'react'
import { formatMoney } from '@/lib/format'
import { cn } from '@/lib/cn'

/**
 * Double-click to edit a price inline. Enter/blur commits, Esc cancels.
 * An empty value commits `null` ("not offered"). Flashes green on commit.
 */
export function InlinePriceCell({
  value,
  onCommit,
}: {
  value: number | null
  onCommit: (next: number | null) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [flash, setFlash] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  function begin() {
    setDraft(value === null ? '' : String(value))
    setEditing(true)
  }

  function commit() {
    setEditing(false)
    const trimmed = draft.trim()
    const next = trimmed === '' ? null : Math.max(0, Math.round(Number(trimmed)))
    if (trimmed !== '' && Number.isNaN(Number(trimmed))) return // ignore garbage
    if (next !== value) {
      onCommit(next)
      setFlash(true)
      setTimeout(() => setFlash(false), 1500)
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        min={0}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') setEditing(false)
        }}
        className="w-28 rounded-control border border-accent bg-surface px-2 py-1 text-right font-mono text-body focus:outline-none focus:ring-2 focus:ring-accent/40"
        placeholder="—"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={begin}
      title="Click to edit price"
      className={cn(
        'w-28 rounded-control px-2 py-1 text-right font-mono text-body tabular-nums transition-colors',
        value === null ? 'text-muted' : 'text-primary',
        'hover:bg-subtle',
        flash && 'row-flash',
      )}
    >
      {formatMoney(value)}
    </button>
  )
}
