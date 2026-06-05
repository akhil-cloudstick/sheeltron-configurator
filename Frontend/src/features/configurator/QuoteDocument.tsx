import { money } from './format'
import type { SavedQuote } from './types'

const CATEGORY_LABEL: Record<string, string> = {
  processor: 'CPU',
  chassis: 'Chassis',
  ram: 'RAM',
  storage: 'Storage',
}

/** Printable quote layout (screen + print). Used on Review and the admin quote detail. */
export function QuoteDocument({ quote }: { quote: SavedQuote }) {
  return (
    <div className="printable rounded-card border border-border bg-surface p-6">
      <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="font-display text-lg font-bold text-primary">SHEELTRON</div>
          <div className="text-caption text-muted">Server configuration quote</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-sm font-bold text-primary">{quote.quote_number}</div>
          <div className="text-[11px] text-muted">
            {quote.created_at ? new Date(quote.created_at).toLocaleString() : ''}
          </div>
        </div>
      </div>

      {(quote.customer_name || quote.customer_company || quote.customer_email) && (
        <div className="border-b border-border py-3 text-caption">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">Customer</div>
          <div className="text-primary">{quote.customer_name || '—'}</div>
          {quote.customer_company && <div className="text-secondary">{quote.customer_company}</div>}
          {quote.customer_email && <div className="text-secondary">{quote.customer_email}</div>}
        </div>
      )}

      <table className="mt-3 w-full border-collapse text-caption">
        <thead>
          <tr className="text-[10px] uppercase tracking-wide text-muted">
            <th className="py-2 text-left">Item</th>
            <th className="py-2 text-right">Unit</th>
            <th className="py-2 text-right">Qty</th>
            <th className="py-2 text-right">Line total</th>
          </tr>
        </thead>
        <tbody>
          {quote.lines.map((l, i) => (
            <tr key={i} className="border-t border-border">
              <td className="py-2 text-primary">
                <span className="text-muted">{CATEGORY_LABEL[l.category] ?? l.category} · </span>
                {l.label}
                <span className="text-muted"> · {l.condition}</span>
              </td>
              <td className="py-2 text-right font-mono tabular-nums">{money(l.unit_price)}</td>
              <td className="py-2 text-right font-mono tabular-nums">{l.qty}</td>
              <td className="py-2 text-right font-mono tabular-nums">{money(l.line_total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex flex-col items-end gap-1 text-caption">
        <Row label="Subtotal" value={money(quote.subtotal)} />
        <Row label="GST 18%" value={money(quote.gst)} muted />
        <div className="mt-1 flex w-56 items-center justify-between border-t border-border pt-2">
          <span className="font-display text-sm font-bold text-primary">Grand total</span>
          <span className="font-display text-base font-bold text-primary">{money(quote.grand_total)}</span>
        </div>
      </div>
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
