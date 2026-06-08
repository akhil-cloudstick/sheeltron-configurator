import { Pill } from '@/components/ui'
import type { Selection } from './types'
import { optionKey } from './types'
import { useConfiguratorStore, selectionLines, lineTotal, quoteTotals } from '@/store/configuratorStore'
import { toast } from '@/store/uiStore'
import { money, conditionLabel, conditionTone } from './format'

// "Your configuration" — the live build, and the place to adjust it: every line can be
// removed, and counts can be changed within the chassis limits (CPU ≤ 4, RAM ≤ DIMM
// slots / max memory, storage ≤ drive bays). Storage holds multiple drives.
export function SummaryRail({ mode = 'quote' }: { mode?: 'quote' | 'pack' }) {
  const store = useConfiguratorStore()
  const setQty = useConfiguratorStore((s) => s.setQty)
  const clear = useConfiguratorStore((s) => s.clear)
  const setStorageQty = useConfiguratorStore((s) => s.setStorageQty)
  const toggleStorage = useConfiguratorStore((s) => s.toggleStorage)

  const { processor, chassis, ram, storage } = store
  const units = mode === 'pack' ? 1 : store.units
  const totals = quoteTotals(selectionLines(store), units)

  // Caps from the chosen chassis (the "core logic") + the reason shown when blocked.
  const cpuPlusDisabled = !processor || processor.qty >= 4
  const cpuPlusReason = cpuPlusDisabled ? 'Maximum 4 processors per configuration.' : undefined

  const maxSlots = chassis?.option.max_dimm_slots ?? null
  const maxGb = chassis?.option.max_memory_gb ?? null
  const ramGbEach = ram?.option.capacity_gb ?? 0
  const ramSlotsFull = ram != null && maxSlots != null && ram.qty >= maxSlots
  const ramGbFull = ram != null && maxGb != null && (ram.qty + 1) * ramGbEach > maxGb
  const ramPlusDisabled = !ram || ramSlotsFull || ramGbFull
  const ramPlusReason = ramSlotsFull
    ? `All ${maxSlots} DIMM slots are in use.`
    : ramGbFull
      ? `One more would exceed the chassis max memory (${maxGb} GB).`
      : undefined

  const driveBays = chassis?.option.drive_bays ?? null
  const baysUsed = storage.reduce((n, s) => n + s.qty, 0)
  const storagePlusDisabled = driveBays != null && baysUsed >= driveBays
  const storagePlusReason = storagePlusDisabled ? `All ${driveBays} drive bays are in use.` : undefined

  return (
    <aside className="flex w-full shrink-0 flex-col rounded-card border border-border bg-surface">
      <div className="border-b border-border px-4 py-3">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-primary">
          Your configuration
        </h2>
      </div>

      <div className="flex-1 overflow-auto px-4 py-1">
        <ul className="flex flex-col">
          <Line
            label="CPU"
            sel={processor}
            stepper={{ plusDisabled: cpuPlusDisabled, plusReason: cpuPlusReason, onChange: (n) => setQty('processor', n) }}
            onRemove={() => clear('processor')}
          />
          <Line label="Server" sel={chassis} onRemove={() => clear('chassis')} />
          <Line
            label="RAM"
            sel={ram}
            stepper={{ plusDisabled: ramPlusDisabled, plusReason: ramPlusReason, onChange: (n) => setQty('ram', n) }}
            onRemove={() => clear('ram')}
          />

          {/* Storage — a list of drives, each removable with its own count. */}
          <li className="flex flex-col gap-2 border-b border-border py-2.5 last:border-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">Storage</span>
              {driveBays != null && (
                <span className={`font-mono text-[10px] tabular-nums ${storagePlusDisabled ? 'text-warning' : 'text-muted'}`}>
                  {baysUsed} / {driveBays} bays
                </span>
              )}
            </div>
            {storage.length === 0 ? (
              <span className="text-caption text-muted/60">Not selected yet</span>
            ) : (
              storage.map((sel) => (
                <div key={optionKey(sel.option)} className="flex flex-col gap-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-caption font-normal text-primary">{sel.option.label}</span>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Pill tone={conditionTone(sel.option.condition)}>{conditionLabel(sel.option.condition)}</Pill>
                      <Remove onClick={() => toggleStorage(sel.option)} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Stepper
                      qty={sel.qty}
                      plusDisabled={storagePlusDisabled}
                      plusReason={storagePlusReason}
                      onChange={(n) => setStorageQty(optionKey(sel.option), n)}
                    />
                    <span className="ml-auto font-mono text-caption tabular-nums text-secondary">
                      {money(lineTotal(sel))}
                    </span>
                  </div>
                </div>
              ))
            )}
          </li>
        </ul>
      </div>

      <div className="border-t border-border px-4 py-3 text-caption">
        {units > 1 && <Row label={`Units × ${units}`} value="" muted />}
        <Row label="Subtotal" value={money(totals.subtotal)} />
        <Row label="GST 18%" value={money(totals.gst)} muted />
        <div className="mt-1 flex items-center justify-between border-t border-border pt-2">
          <span className="font-display text-sm font-bold text-primary">Grand total</span>
          <span className="font-display text-base font-bold text-primary">{money(totals.grand)}</span>
        </div>
        {totals.hasUnpriced && (
          <p className="mt-2 text-[11px] text-warning">
            Some lines have no price set — they count as ₹0 until priced.
          </p>
        )}
        <p className="mt-2 text-[11px] text-muted">
          Prices appear on the saved {mode === 'pack' ? 'pack' : 'quote'}.
        </p>
      </div>
    </aside>
  )
}

// One single-pick line (CPU / Server / RAM). `stepper` omitted → no count control
// (Server is always a single chassis).
function Line({
  label,
  sel,
  stepper,
  onRemove,
}: {
  label: string
  sel: Selection | null
  stepper?: { plusDisabled?: boolean; plusReason?: string; onChange: (n: number) => void }
  onRemove: () => void
}) {
  return (
    <li className="flex flex-col gap-1 border-b border-border py-2.5 last:border-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</span>
        <div className="flex shrink-0 items-center gap-1.5">
          {sel && <Pill tone={conditionTone(sel.option.condition)}>{conditionLabel(sel.option.condition)}</Pill>}
          {sel && <Remove onClick={onRemove} />}
        </div>
      </div>
      {sel ? (
        <>
          <span className="text-caption font-normal text-primary">{sel.option.label}</span>
          <div className="flex items-center gap-2">
            {stepper && (
              <Stepper qty={sel.qty} plusDisabled={stepper.plusDisabled} plusReason={stepper.plusReason} onChange={stepper.onChange} />
            )}
            <span className="ml-auto font-mono text-caption tabular-nums text-secondary">{money(lineTotal(sel))}</span>
          </div>
        </>
      ) : (
        <span className="text-caption text-muted/60">Not selected yet</span>
      )}
    </li>
  )
}

function Remove({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label="Remove" className="rounded px-1 text-muted hover:text-accent">
      ✕
    </button>
  )
}

function Stepper({
  qty,
  plusDisabled,
  plusReason,
  onChange,
}: {
  qty: number
  plusDisabled?: boolean
  plusReason?: string
  onChange: (q: number) => void
}) {
  return (
    <div className="inline-flex shrink-0 items-center overflow-hidden rounded-control border border-border">
      <button type="button" className="px-2 py-0 text-primary hover:bg-subtle" onClick={() => onChange(qty - 1)} aria-label="Decrease quantity">
        −
      </button>
      <span className="w-7 text-center font-mono text-caption tabular-nums">{qty}</span>
      <button
        type="button"
        aria-disabled={plusDisabled}
        // Looks disabled at the cap, but stays clickable so a click can warn *why*.
        className={`px-2 py-0 text-primary ${plusDisabled ? 'opacity-40' : 'hover:bg-subtle'}`}
        onClick={() => (plusDisabled ? plusReason && toast.info(plusReason) : onChange(qty + 1))}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  )
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className={muted ? 'text-muted' : 'text-secondary'}>{label}</span>
      <span className="font-mono tabular-nums text-secondary">{value}</span>
    </div>
  )
}
