import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Field, Input, ErrorBanner, Pill } from '@/components/ui'
import { ApiError } from '@/lib/api'
import { toast } from '@/store/uiStore'
import { useConfiguratorStore, selectionLines, lineTotal, quoteTotals } from '@/store/configuratorStore'
import { createQuote } from '../configuratorApi'
import { exportQuoteCsv } from '../exportQuoteCsv'
import { QuoteDocument } from '../QuoteDocument'
import { money, conditionLabel, conditionTone } from '../format'
import type { Category, QuoteLine, SavedQuote } from '../types'

const CATEGORY_LABEL: Record<Category, string> = {
  processor: 'CPU',
  chassis: 'Chassis',
  ram: 'RAM',
  storage: 'Storage',
}

export function ReviewStep() {
  const navigate = useNavigate()
  const store = useConfiguratorStore()
  const customer = useConfiguratorStore((s) => s.customer)
  const setCustomer = useConfiguratorStore((s) => s.setCustomer)
  const reset = useConfiguratorStore((s) => s.reset)

  const lines = selectionLines(store)
  const totals = quoteTotals(lines)
  const canSave = !!store.processor && !!store.chassis && lines.length > 0

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<SavedQuote | null>(null)

  async function save() {
    setBusy(true)
    setError(null)
    try {
      const payload = {
        customer_name: customer.name,
        customer_company: customer.company,
        customer_email: customer.email,
        lines: lines.map(
          ({ category, sel }): QuoteLine => ({
            category,
            stock_id: sel.option.stock_id,
            label: sel.option.label,
            condition: sel.option.condition,
            qty: sel.qty,
            unit_price: sel.option.price,
          }),
        ),
      }
      const result = await createQuote(payload)
      setSaved(result)
      toast.success(`Quote ${result.quote_number} saved.`)
      // The build is done — clear the configuration so the rail doesn't keep showing
      // the saved selections. The printable quote lives in `saved`, not the store.
      reset()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the quote.')
    } finally {
      setBusy(false)
    }
  }

  function startNew() {
    reset()
    setSaved(null)
    navigate('/configurator/processor')
  }

  // --- Saved phase: show the printable quote + export actions ---------------
  if (saved) {
    return (
      <div className="flex h-full flex-col rounded-card border border-border bg-surface p-5 print:border-0 print:p-0">
        <div className="shrink-0 print:hidden">
          <div className="text-meta uppercase tracking-wider text-accent">Saved</div>
          <h1 className="font-display text-2xl font-bold leading-tight text-primary">{saved.quote_number}</h1>
        </div>
        <div className="mt-4 min-h-0 flex-1 overflow-auto">
          <QuoteDocument quote={saved} />
        </div>
        <div className="mt-4 flex shrink-0 items-center justify-between border-t border-border pt-4 print:hidden">
          <Button variant="secondary" onClick={startNew}>
            Start new quote
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => exportQuoteCsv(saved)}>
              Download CSV
            </Button>
            <Button onClick={() => window.print()}>Print / Save as PDF</Button>
          </div>
        </div>
      </div>
    )
  }

  // --- Build phase: customer + BOM + save -----------------------------------
  return (
    <div className="flex h-full flex-col rounded-card border border-border bg-surface p-5">
      <div className="shrink-0">
        <div className="text-meta uppercase tracking-wider text-accent">Step 5 of 5</div>
        <h1 className="font-display text-2xl font-bold leading-tight text-primary">Review &amp; quote</h1>
        <p className="mt-0.5 text-caption text-muted">Add customer details, then save to get a quote number.</p>
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-auto pr-1">
        {error && <ErrorBanner message={error} />}
        {!canSave && (
          <div className="mb-3 rounded-card border border-dashed border-border bg-subtle/40 p-4 text-caption text-muted">
            A quote needs at least a processor and a chassis. Go back and complete the build.
          </div>
        )}

        <section className="mb-4 rounded-card border border-border bg-surface p-4">
          <h2 className="mb-2 text-meta uppercase text-muted">Customer (optional, prints on quote)</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Contact name">
              <Input value={customer.name} onChange={(e) => setCustomer({ name: e.target.value })} />
            </Field>
            <Field label="Company">
              <Input value={customer.company} onChange={(e) => setCustomer({ company: e.target.value })} />
            </Field>
            <Field label="Email">
              <Input value={customer.email} onChange={(e) => setCustomer({ email: e.target.value })} />
            </Field>
          </div>
        </section>

        <section className="rounded-card border border-border bg-surface p-4">
          <h2 className="mb-2 text-meta uppercase text-muted">Bill of materials</h2>
          {lines.length === 0 ? (
            <p className="text-caption text-muted">Nothing selected yet.</p>
          ) : (
            <table className="w-full border-collapse text-caption">
              <thead>
                <tr className="text-[10px] uppercase tracking-wide text-muted">
                  <th className="py-2 text-left">Item</th>
                  <th className="py-2 text-left">Condition</th>
                  <th className="py-2 text-right">Unit</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">Line total</th>
                </tr>
              </thead>
              <tbody>
                {lines.map(({ category, sel }) => (
                  <tr key={category} className="border-t border-border">
                    <td className="py-2 text-primary">
                      <span className="text-muted">{CATEGORY_LABEL[category]} · </span>
                      {sel.option.label}
                    </td>
                    <td className="py-2">
                      <Pill tone={conditionTone(sel.option.condition)}>
                        {conditionLabel(sel.option.condition)}
                      </Pill>
                    </td>
                    <td className="py-2 text-right font-mono tabular-nums">{money(sel.option.price)}</td>
                    <td className="py-2 text-right font-mono tabular-nums">{sel.qty}</td>
                    <td className="py-2 text-right font-mono tabular-nums">{money(lineTotal(sel))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="mt-4 flex flex-col items-end gap-1">
            <SumRow label="Subtotal" value={money(totals.subtotal)} />
            <SumRow label="GST 18%" value={money(totals.gst)} muted />
            <div className="mt-1 flex w-56 items-center justify-between border-t border-border pt-2">
              <span className="font-display text-sm font-bold text-primary">Grand total</span>
              <span className="font-display text-base font-bold text-primary">{money(totals.grand)}</span>
            </div>
            {totals.hasUnpriced && (
              <p className="mt-1 text-[11px] text-warning">
                Some lines have no price set — they count as ₹0.
              </p>
            )}
          </div>
        </section>
      </div>

      <div className="mt-4 flex shrink-0 items-center justify-between border-t border-border pt-4">
        <Button variant="secondary" onClick={() => navigate('/configurator/storage')}>
          ← Back
        </Button>
        <Button onClick={save} disabled={!canSave || busy}>
          {busy ? 'Saving…' : 'Save quote'}
        </Button>
      </div>
    </div>
  )
}

function SumRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex w-56 items-center justify-between text-caption">
      <span className={muted ? 'text-muted' : 'text-secondary'}>{label}</span>
      <span className="font-mono tabular-nums text-secondary">{value}</span>
    </div>
  )
}
