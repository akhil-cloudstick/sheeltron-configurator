import { useConfiguratorStore } from '@/store/configuratorStore'
import { money } from './format'
import { optionKey } from './types'

// Interactive list of the chosen storage drives, shown under "Your configuration"
// (storage allows multiple drives, so it needs its own qty + remove controls). Lives
// in the rail so the cramped storage step keeps the full option list, and so a drive
// can always be adjusted/removed even when the step's filter view hides it.
export function SelectedDrivesRail() {
  const storage = useConfiguratorStore((s) => s.storage)
  const chassis = useConfiguratorStore((s) => s.chassis)
  const setStorageQty = useConfiguratorStore((s) => s.setStorageQty)
  const toggleStorage = useConfiguratorStore((s) => s.toggleStorage)

  if (storage.length === 0) return null

  const driveBays = chassis?.option.drive_bays ?? null
  const baysUsed = storage.reduce((n, sel) => n + sel.qty, 0)
  const atCap = driveBays != null && baysUsed >= driveBays

  return (
    <aside className="flex w-full flex-col rounded-card border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-primary">
          Selected drives
        </h2>
        <span className={`font-mono text-caption tabular-nums ${atCap ? 'text-warning' : 'text-muted'}`}>
          {driveBays != null ? `${baysUsed} / ${driveBays} bays` : `${baysUsed} bays`}
        </span>
      </div>
      <ul className="flex flex-col px-4 py-1">
        {storage.map((sel) => {
          const o = sel.option
          return (
            <li
              key={optionKey(o)}
              className="flex flex-col gap-1 border-b border-border py-2 last:border-0"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-caption font-normal text-primary">{o.label}</span>
                <button
                  type="button"
                  onClick={() => toggleStorage(o)}
                  aria-label="Remove drive"
                  className="shrink-0 rounded px-1 text-muted hover:text-accent"
                >
                  ✕
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Stepper qty={sel.qty} plusDisabled={atCap} onChange={(n) => setStorageQty(optionKey(o), n)} />
                <span className="ml-auto font-mono text-caption tabular-nums text-secondary">
                  {money((o.price ?? 0) * sel.qty)}
                </span>
              </div>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}

function Stepper({
  qty,
  plusDisabled,
  onChange,
}: {
  qty: number
  plusDisabled?: boolean
  onChange: (q: number) => void
}) {
  return (
    <div className="inline-flex shrink-0 items-center overflow-hidden rounded-control border border-border">
      <button type="button" className="px-1.5 py-0 text-primary hover:bg-subtle" onClick={() => onChange(qty - 1)} aria-label="Decrease quantity">
        −
      </button>
      <span className="w-6 text-center font-mono text-caption tabular-nums">{qty}</span>
      <button
        type="button"
        disabled={plusDisabled}
        className="px-1.5 py-0 text-primary hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-40"
        onClick={() => !plusDisabled && onChange(qty + 1)}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  )
}
