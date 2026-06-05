import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PageHeader,
  TableWrap,
  THead,
  TH,
  TR,
  TD,
  LoadingRow,
  EmptyState,
  ErrorBanner,
  IconServer,
} from '@/components/ui'
import { ApiError } from '@/lib/api'
import { listQuotes } from './quotesApi'
import { money } from '@/features/configurator/format'
import type { SavedQuote } from '@/features/configurator/types'

export function QuotesPage() {
  const navigate = useNavigate()
  const [quotes, setQuotes] = useState<SavedQuote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  function load() {
    setLoading(true)
    setError(null)
    listQuotes()
      .then(setQuotes)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load quotes.'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  return (
    <div className="flex h-full flex-col gap-3">
      <PageHeader title="All quotes" description="Quotes saved by the sales team." />
      {error && <ErrorBanner message={error} onRetry={load} />}

      <TableWrap className="min-h-0 flex-1 overflow-auto">
        <THead>
          <TR>
            <TH className="w-36">Quote</TH>
            <TH>Customer</TH>
            <TH className="w-24 text-right">Lines</TH>
            <TH className="w-32 text-right">Grand total</TH>
            <TH className="w-28">By</TH>
            <TH className="w-44">Created</TH>
          </TR>
        </THead>
        <tbody>
          {loading ? (
            <LoadingRow colSpan={6} />
          ) : quotes.length === 0 ? (
            <tr>
              <td colSpan={6}>
                <EmptyState
                  icon={<IconServer width={28} height={28} />}
                  title="No quotes yet"
                  hint="Quotes saved by salesmen will appear here."
                />
              </td>
            </tr>
          ) : (
            quotes.map((q) => (
              <tr
                key={q.id}
                onClick={() => navigate(`/quotes/${q.id}`)}
                className="cursor-pointer border-b border-border last:border-0 hover:bg-subtle/70"
              >
                <TD className="font-mono font-semibold text-primary">{q.quote_number}</TD>
                <TD>
                  <div className="text-primary">{q.customer_name || '—'}</div>
                  {q.customer_company && (
                    <div className="text-[11px] text-muted">{q.customer_company}</div>
                  )}
                </TD>
                <TD className="text-right tabular-nums text-secondary">{q.lines.length}</TD>
                <TD className="text-right font-mono tabular-nums text-primary">{money(q.grand_total)}</TD>
                <TD className="text-secondary">{q.created_by}</TD>
                <TD className="text-secondary">
                  {q.created_at ? new Date(q.created_at).toLocaleString() : '—'}
                </TD>
              </tr>
            ))
          )}
        </tbody>
      </TableWrap>
    </div>
  )
}
