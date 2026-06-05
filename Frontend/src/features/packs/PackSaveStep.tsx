import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Field, Input, Textarea, ErrorBanner, Pill } from '@/components/ui'
import { ApiError } from '@/lib/api'
import { toast } from '@/store/uiStore'
import { useConfiguratorStore, selectionLines, lineTotal, quoteTotals } from '@/store/configuratorStore'
import { createPack } from '@/features/configurator/configuratorApi'
import { money, conditionLabel, conditionTone } from '@/features/configurator/format'
import type { Category, PackPayload, SavedPack } from '@/features/configurator/types'

const CATEGORY_LABEL: Record<Category, string> = {
  processor: 'CPU',
  chassis: 'Chassis',
  ram: 'RAM',
  storage: 'Storage',
}

export function PackSaveStep() {
  const navigate = useNavigate()
  const store = useConfiguratorStore()
  const reset = useConfiguratorStore((s) => s.reset)

  const lines = selectionLines(store)
  const totals = quoteTotals(lines)
  // A pack is a complete, ready-to-sell build — require all four parts.
  const complete = !!store.processor && !!store.chassis && !!store.ram && !!store.storage

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<SavedPack | null>(null)

  const canSave = complete && name.trim().length > 0

  async function save() {
    setBusy(true)
    setError(null)
    try {
      const payload: PackPayload = {
        name: name.trim(),
        description: description.trim(),
        lines: lines.map(({ category, sel }) => ({
          category,
          qty: sel.qty,
          option: sel.option,
        })),
      }
      const result = await createPack(payload)
      setSaved(result)
      toast.success(`Pack ${result.pack_number} saved.`)
      reset()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the pack.')
    } finally {
      setBusy(false)
    }
  }

  function buildAnother() {
    reset()
    setSaved(null)
    setName('')
    setDescription('')
    navigate('/compatibility/build/processor')
  }

  // --- Saved phase ----------------------------------------------------------
  if (saved) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-card border border-border bg-surface p-5 text-center">
        <div className="text-meta uppercase tracking-wider text-accent">Saved</div>
        <h1 className="mt-1 font-display text-2xl font-bold leading-tight text-primary">{saved.pack_number}</h1>
        <p className="mt-1 max-w-sm text-caption text-muted">
          "{saved.name}" is now available to the sales team as a ready-made pack.
        </p>
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" onClick={buildAnother}>
            Build another pack
          </Button>
          <Button onClick={() => navigate('/compatibility')}>Back to packs</Button>
        </div>
      </div>
    )
  }

  // --- Build phase ----------------------------------------------------------
  return (
    <div className="flex h-full flex-col rounded-card border border-border bg-surface p-5">
      <div className="shrink-0">
        <div className="text-meta uppercase tracking-wider text-accent">Step 5 of 5</div>
        <h1 className="font-display text-2xl font-bold leading-tight text-primary">Save pack</h1>
        <p className="mt-0.5 text-caption text-muted">
          Name the bundle, then save it. The price is calculated from the chosen parts.
        </p>
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-auto pr-1">
        {error && <ErrorBanner message={error} />}
        {!complete && (
          <div className="mb-3 rounded-card border border-dashed border-border bg-subtle/40 p-4 text-caption text-muted">
            A pack needs a processor, chassis, RAM and storage. Go back and complete the build.
          </div>
        )}

        <section className="mb-4 rounded-card border border-border bg-surface p-4">
          <h2 className="mb-2 text-meta uppercase text-muted">Pack details</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Pack name">
              <Input value={name} placeholder="e.g. Dual-EPYC 7003 storage node" onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Description (optional)">
              <Textarea value={description} rows={2} onChange={(e) => setDescription(e.target.value)} />
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
              <p className="mt-1 text-[11px] text-warning">Some lines have no price set — they count as ₹0.</p>
            )}
          </div>
        </section>
      </div>

      <div className="mt-4 flex shrink-0 items-center justify-between border-t border-border pt-4">
        <Button variant="secondary" onClick={() => navigate('/compatibility/build/storage')}>
          ← Back
        </Button>
        <Button onClick={save} disabled={!canSave || busy}>
          {busy ? 'Saving…' : 'Save pack'}
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
