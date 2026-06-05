import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  PageHeader,
  Pill,
  Dropdown,
  Input,
  IconSearch,
  LoadingRow,
  EmptyState,
  ErrorBanner,
  Pagination,
  DateFilter,
  TableWrap,
  THead,
  TH,
  TR,
  IconServer,
} from '@/components/ui'
import { listChangeLogs, productTypeLabel, actorLabel, dayRange, todayStr, type ChangeLogRow } from './auditApi'
import { ApiError } from '@/lib/api'

const PAGE_SIZE = 40

const TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'chassis', label: 'Chassis' },
  { value: 'cpu', label: 'Processor' },
  { value: 'ram', label: 'Memory' },
  { value: 'ssd', label: 'SSD' },
  { value: 'hdd', label: 'HDD' },
]

const actionTone: Record<string, 'success' | 'info' | 'danger' | 'neutral'> = {
  create: 'success',
  update: 'info',
  delete: 'danger',
}

const sourceTone: Record<string, 'info' | 'accent' | 'neutral'> = {
  import: 'info',
  bulk: 'accent',
}

// Group parts derived from the timestamp (rows arrive already newest-first).
// One self-contained day header (e.g. "Friday, 05 June 2026") so it stays clear when
// scrolling or on a later page; plus the per-entry time.
function dayOf(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return { key: 'unknown', label: 'Unknown date', time: '—' }
  return {
    key: `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`,
    label: d.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }),
    time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
  }
}

export function ChangeLogsPage() {
  const [rows, setRows] = useState<ChangeLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [productType, setProductType] = useState('')
  const [date, setDate] = useState(todayStr()) // default: today; '' = all dates
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await listChangeLogs({ productType, ...dayRange(date) }))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load change logs.')
    } finally {
      setLoading(false)
    }
  }, [productType, date])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setPage(1)
  }, [productType, date, search])

  // Search by model / product name (label). Rows are already fully fetched, so filter
  // client-side.
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return rows
    return rows.filter((r) => (r.label ?? '').toLowerCase().includes(needle))
  }, [rows, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageRows = useMemo(() => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE), [filtered, safePage])

  return (
    <div className="flex h-full flex-col gap-3">
      <PageHeader
        title="Change logs"
        description="Permanent audit trail of every import and manual edit, grouped by date. Newest first."
        actions={
          <>
            <div className="relative w-56 shrink-0">
              <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted">
                <IconSearch width={14} height={14} />
              </span>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search model / name…"
                aria-label="Search change logs by model or product name"
                className="h-8 py-1 pl-7 text-caption"
              />
            </div>
            <Dropdown
              value={productType}
              onChange={setProductType}
              options={TYPE_OPTIONS}
              ariaLabel="Filter by product type"
              size="sm"
              className="w-40"
            />
            <DateFilter value={date} onChange={setDate} ariaLabel="Filter change logs by date" />
          </>
        }
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      {loading ? (
        <TableWrap>
          <THead>
            <TR>
              <TH>Loading…</TH>
            </TR>
          </THead>
          <tbody>
            <LoadingRow colSpan={1} />
          </tbody>
        </TableWrap>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<IconServer width={28} height={28} />}
          title={search.trim() ? 'No matching changes' : 'No changes logged yet'}
          hint={search.trim() ? 'Try a different model or product name.' : 'Imports and manual edits will appear here.'}
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-auto rounded-card border border-border bg-surface">
          <GroupedLogs rows={pageRows} />
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <Pagination page={safePage} limit={PAGE_SIZE} total={filtered.length} onPage={setPage} />
      )}
    </div>
  )
}

/** Renders rows (already newest-first) under a single full-date header per day. */
function GroupedLogs({ rows }: { rows: ChangeLogRow[] }) {
  const out: React.ReactNode[] = []
  let curDay = ''

  rows.forEach((r) => {
    const d = dayOf(r.changed_at)
    if (d.key !== curDay) {
      curDay = d.key
      out.push(
        <div
          key={`day-${d.key}-${r.id}`}
          className="sticky top-0 z-10 border-b border-border bg-subtle px-4 py-2 text-caption font-semibold text-primary"
        >
          {d.label}
        </div>,
      )
    }
    out.push(<LogEntry key={r.id} row={r} time={d.time} />)
  })

  return <div>{out}</div>
}

function LogEntry({ row, time }: { row: ChangeLogRow; time: string }) {
  return (
    <div className="flex items-start gap-3 border-b border-border/50 px-4 py-2 hover:bg-subtle/40">
      <div className="w-16 shrink-0 pt-0.5 font-mono text-[11px] tabular-nums text-primary">#{row.product_id}</div>
      <div className="w-20 shrink-0 pt-0.5 text-caption text-secondary">{productTypeLabel(row.product_type)}</div>
      <div className="min-w-0 flex-1">
        <div className="text-body text-primary">{row.label || '—'}</div>
        {row.action === 'update' ? (
          <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-caption">
            {row.changes.map((c, i) => (
              <ChangeBit key={i} c={c} />
            ))}
          </div>
        ) : (
          <div className="mt-0.5 text-caption text-muted">
            {row.action === 'create' ? 'Record created' : row.action === 'delete' ? 'Record deleted' : '—'}
          </div>
        )}
        {row.source === 'bulk' && row.reason && (
          <div className="mt-0.5 text-[11px] text-muted">
            <span className="font-medium text-secondary">Reason:</span> “{row.reason}”
          </div>
        )}
        <div className="mt-0.5 text-[11px] text-muted">by {actorLabel(row.actor)}</div>
      </div>
      <div className="flex shrink-0 items-center gap-1 pt-0.5">
        <Pill tone={sourceTone[row.source] ?? 'neutral'}>{row.source}</Pill>
        <Pill tone={actionTone[row.action] ?? 'neutral'}>{row.action}</Pill>
      </div>
      <div className="w-20 shrink-0 whitespace-nowrap pt-0.5 text-right font-mono text-[11px] tabular-nums text-muted">
        {time}
      </div>
    </div>
  )
}

/** One field change: "added", "removed", or "old → new". */
function ChangeBit({ c }: { c: { field: string; old: string; new: string } }) {
  const oldV = (c.old ?? '').trim()
  const newV = (c.new ?? '').trim()
  return (
    <span>
      <span className="font-medium text-secondary">{c.field}:</span>{' '}
      {!oldV && newV ? (
        <>
          <span className="text-primary">“{newV}”</span> <span className="text-success">added</span>
        </>
      ) : oldV && !newV ? (
        <>
          <span className="text-muted line-through">“{oldV}”</span> <span className="text-danger">cleared</span>
        </>
      ) : (
        <>
          <span className="text-muted line-through">{oldV || '—'}</span>
          {' → '}
          <span className="text-primary">{newV || '—'}</span>
        </>
      )}
    </span>
  )
}
