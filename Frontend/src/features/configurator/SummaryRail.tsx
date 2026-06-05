import { Pill } from '@/components/ui'
import { useConfiguratorStore, selectionLines, lineTotal, quoteTotals } from '@/store/configuratorStore'
import { money, conditionLabel, conditionTone } from './format'
import type { Category } from './types'

const CATEGORY_LABEL: Record<Category, string> = {
  processor: 'CPU',
  chassis: 'Server',
  ram: 'RAM',
  storage: 'Storage',
}

// Fixed BOM order — every row is always shown so the rail keeps a stable shape
// (empty slots render a placeholder rather than collapsing in/out).
const CATEGORY_ORDER: Category[] = ['processor', 'chassis', 'ram', 'storage']

export function SummaryRail({ mode = 'quote' }: { mode?: 'quote' | 'pack' }) {
  const store = useConfiguratorStore()
  const lines = selectionLines(store)
  const totals = quoteTotals(lines)

  return (
    <aside className="flex w-[320px] shrink-0 flex-col rounded-card border border-border bg-surface">
      <div className="border-b border-border px-4 py-3">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-primary">
          Your configuration
        </h2>
      </div>

      <div className="flex-1 overflow-auto px-4 py-3">
        <ul className="flex flex-col gap-3">
          {CATEGORY_ORDER.map((category) => {
            // Read the slot straight from the store so the row reflects the live
            // selection — going back and re-picking clears downstream slots, which
            // simply revert these rows to their placeholder.
            const sel = store[category]
            return (
              <li key={category} className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                    {CATEGORY_LABEL[category]}
                  </span>
                  {sel && (
                    <Pill tone={conditionTone(sel.option.condition)}>
                      {conditionLabel(sel.option.condition)}
                    </Pill>
                  )}
                </div>
                {sel ? (
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-caption text-primary">
                      {sel.option.label}
                      {sel.qty > 1 && <span className="text-muted"> × {sel.qty}</span>}
                    </span>
                    <span className="shrink-0 font-mono text-caption tabular-nums text-secondary">
                      {money(lineTotal(sel))}
                    </span>
                  </div>
                ) : (
                  <span className="text-caption text-muted/60">Not selected yet</span>
                )}
              </li>
            )
          })}
        </ul>
      </div>

      <div className="border-t border-border px-4 py-3 text-caption">
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

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className={muted ? 'text-muted' : 'text-secondary'}>{label}</span>
      <span className="font-mono tabular-nums text-secondary">{value}</span>
    </div>
  )
}
