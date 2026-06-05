import { useMemo, useState } from 'react'
import {
  Pill,
  PageHeader,
  NoticeBar,
  TableWrap,
  THead,
  TH,
  TR,
  TD,
  LoadingRow,
  EmptyState,
  ErrorBanner,
  Pagination,
  IconTag,
} from '@/components/ui'
import { InlinePriceCell } from './InlinePriceCell'
import { useChassisData } from '@/features/stock/servers/useChassisData'
import { ChassisFilters } from '@/features/stock/servers/ChassisFilters'
import { applyChassisFilters, type ActiveFilter } from '@/features/stock/servers/chassisFilter'
import { SERVER_STATUS_META, SERVER_CONDITION_META } from '@/features/stock/servers/serverStatus'
import { updateServer } from '@/features/stock/servers/serversApi'
import { ApiError } from '@/lib/api'
import { toast } from '@/store/uiStore'
import type { ServerUnit, ServerUnitInput } from '@/types/server'

const PAGE_SIZE = 25

function toInput(s: ServerUnit): ServerUnitInput {
  const { id: _id, created_at: _c, updated_at: _u, ...rest } = s
  return rest
}

/**
 * Catalog → Chassis is the SAME data as Stock → Chassis (the real server_units).
 * Editing price/type here PUTs to the server API, so both views stay in sync.
 */
export function CatalogChassis() {
  const { data, loading, error, refetch } = useChassisData()
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<ActiveFilter[]>([])
  const [page, setPage] = useState(1)
  const [flashId, setFlashId] = useState<number | null>(null)

  const filtered = useMemo(() => applyChassisFilters(data, search, filters), [data, search, filters])
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  async function patch(row: ServerUnit, change: Partial<ServerUnitInput>, label: string) {
    try {
      await updateServer(row.id, { ...toInput(row), ...change })
      setFlashId(row.id)
      setTimeout(() => setFlashId(null), 1600)
      toast.success(`#${row.id} (${row.model || '—'}): ${label} updated.`)
      refetch()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Update failed.')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Chassis pricing"
        description="Set the condition and price for each chassis in stock. Edits update the live chassis records."
      />

      <NoticeBar>
        This is the same data as Stock → Chassis. Click a price to edit. A price can only be set
        for a condition the unit has — set conditions under Stock → Chassis.
      </NoticeBar>

      <ChassisFilters
        data={data}
        search={search}
        onSearch={(v) => {
          setSearch(v)
          setPage(1)
        }}
        filters={filters}
        onFiltersChange={(f) => {
          setFilters(f)
          setPage(1)
        }}
      />

      {error && <ErrorBanner message={error} onRetry={refetch} />}

      <TableWrap>
        <THead>
          <TR>
            <TH className="w-20">Product No</TH>
            <TH>Brand · Model</TH>
            <TH>Condition</TH>
            <TH className="text-right">Price · New</TH>
            <TH className="text-right">Price · Refurb</TH>
            <TH>Status</TH>
          </TR>
        </THead>
        <tbody>
          {loading ? (
            <LoadingRow colSpan={6} />
          ) : pageRows.length === 0 ? (
            <tr>
              <td colSpan={6}>
                <EmptyState
                  icon={<IconTag width={28} height={28} />}
                  title={data.length === 0 ? 'No chassis in stock' : 'No chassis match your filters'}
                  hint={data.length === 0 ? 'Add chassis under Stock → Chassis first.' : 'Try clearing the search or filters.'}
                />
              </td>
            </tr>
          ) : (
            pageRows.map((s) => (
              <TR key={s.id} flash={s.id === flashId}>
                <TD className="font-mono tabular-nums text-primary">{s.id}</TD>
                <TD>
                  <div className="text-primary">{s.model || '—'}</div>
                  {s.brand && <div className="text-[11px] text-muted">{s.brand}</div>}
                </TD>
                <TD>
                  {!s.condition_new && !s.condition_refurbished ? (
                    <span className="text-muted">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {s.condition_new && (
                        <Pill tone={SERVER_CONDITION_META.new.tone}>{SERVER_CONDITION_META.new.label}</Pill>
                      )}
                      {s.condition_refurbished && (
                        <Pill tone={SERVER_CONDITION_META.refurbished.tone}>
                          {SERVER_CONDITION_META.refurbished.label}
                        </Pill>
                      )}
                    </div>
                  )}
                </TD>
                <TD className="text-right">
                  {s.condition_new ? (
                    <InlinePriceCell value={s.price_new} onCommit={(v) => patch(s, { price_new: v }, 'new price')} />
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </TD>
                <TD className="text-right">
                  {s.condition_refurbished ? (
                    <InlinePriceCell
                      value={s.price_refurbished}
                      onCommit={(v) => patch(s, { price_refurbished: v }, 'refurb price')}
                    />
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </TD>
                <TD>
                  <Pill tone={SERVER_STATUS_META[s.status]?.tone ?? 'neutral'}>
                    {SERVER_STATUS_META[s.status]?.label ?? s.status}
                  </Pill>
                </TD>
              </TR>
            ))
          )}
        </tbody>
      </TableWrap>

      {!loading && filtered.length > 0 && (
        <Pagination page={safePage} limit={PAGE_SIZE} total={filtered.length} onPage={setPage} />
      )}
    </div>
  )
}
