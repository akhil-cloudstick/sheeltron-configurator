import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, ErrorBanner } from '@/components/ui'
import { ApiError } from '@/lib/api'
import { getQuote } from './quotesApi'
import { QuoteDocument } from '@/features/configurator/QuoteDocument'
import { exportQuoteCsv } from '@/features/configurator/exportQuoteCsv'
import type { SavedQuote } from '@/features/configurator/types'

export function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [quote, setQuote] = useState<SavedQuote | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getQuote(Number(id))
      .then(setQuote)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load quote.'))
      .finally(() => setLoading(false))
  }, [id])

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Button variant="secondary" size="sm" onClick={() => navigate('/quotes')}>
          ← All quotes
        </Button>
        {quote && (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => exportQuoteCsv(quote)}>
              Download CSV
            </Button>
            <Button size="sm" onClick={() => window.print()}>
              Print / Save as PDF
            </Button>
          </div>
        )}
      </div>

      {error && <ErrorBanner message={error} />}
      {loading ? (
        <div className="py-10 text-center text-caption text-muted">Loading…</div>
      ) : quote ? (
        <div className="min-h-0 flex-1 overflow-auto">
          <QuoteDocument quote={quote} />
        </div>
      ) : null}
    </div>
  )
}
