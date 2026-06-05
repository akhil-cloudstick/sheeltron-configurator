import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, ErrorBanner, Pill } from '@/components/ui'
import { ApiError } from '@/lib/api'
import { getPack } from '@/features/configurator/configuratorApi'
import { money, conditionLabel, conditionTone } from '@/features/configurator/format'
import type { SavedPack } from '@/features/configurator/types'

const CATEGORY_LABEL: Record<string, string> = {
  processor: 'CPU',
  chassis: 'Chassis',
  ram: 'RAM',
  storage: 'Storage',
}

export function PackDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [pack, setPack] = useState<SavedPack | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getPack(Number(id))
      .then(setPack)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load pack.'))
      .finally(() => setLoading(false))
  }, [id])

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Button variant="secondary" size="sm" onClick={() => navigate('/compatibility')}>
          ← Compatibility
        </Button>
        {pack && (
          <Button size="sm" onClick={() => window.print()}>
            Print / Save as PDF
          </Button>
        )}
      </div>

      {error && <ErrorBanner message={error} />}
      {loading ? (
        <div className="py-10 text-center text-caption text-muted">Loading…</div>
      ) : pack ? (
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="printable rounded-card border border-border bg-surface p-6">
            <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
              <div>
                <div className="font-display text-lg font-bold text-primary">SHEELTRON</div>
                <div className="text-caption text-muted">Compatible server setup</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm font-bold text-primary">{pack.pack_number}</div>
                <div className="text-[11px] text-muted">
                  {pack.created_at ? new Date(pack.created_at).toLocaleString() : ''}
                </div>
              </div>
            </div>

            <div className="border-b border-border py-3">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">Pack</div>
              <div className="text-body font-semibold text-primary">{pack.name || '—'}</div>
              {pack.description && <div className="text-caption text-secondary">{pack.description}</div>}
            </div>

            <table className="mt-3 w-full border-collapse text-caption">
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
                {pack.lines.map((l, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="py-2 text-primary">
                      <span className="text-muted">{CATEGORY_LABEL[l.category] ?? l.category} · </span>
                      {l.option.label}
                    </td>
                    <td className="py-2">
                      <Pill tone={conditionTone(l.option.condition)}>{conditionLabel(l.option.condition)}</Pill>
                    </td>
                    <td className="py-2 text-right font-mono tabular-nums">{money(l.option.price)}</td>
                    <td className="py-2 text-right font-mono tabular-nums">{l.qty}</td>
                    <td className="py-2 text-right font-mono tabular-nums">{money(l.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 flex flex-col items-end gap-1 text-caption">
              <Row label="Subtotal" value={money(pack.subtotal)} />
              <Row label="GST 18%" value={money(pack.gst)} muted />
              <div className="mt-1 flex w-56 items-center justify-between border-t border-border pt-2">
                <span className="font-display text-sm font-bold text-primary">Grand total</span>
                <span className="font-display text-base font-bold text-primary">{money(pack.grand_total)}</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex w-56 items-center justify-between">
      <span className={muted ? 'text-muted' : 'text-secondary'}>{label}</span>
      <span className="font-mono tabular-nums text-secondary">{value}</span>
    </div>
  )
}
