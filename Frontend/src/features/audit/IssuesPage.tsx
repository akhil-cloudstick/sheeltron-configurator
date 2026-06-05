import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  PageHeader,
  Pill,
  TableWrap,
  THead,
  TH,
  TR,
  TD,
  LoadingRow,
  EmptyState,
  ErrorBanner,
  Pagination,
  Button,
  Dropdown,
  DateFilter,
  IconServer,
} from '@/components/ui'
import { listIssues, productTypeLabel, dayRange, todayStr, type IssueRow } from './auditApi'
import { PRODUCT_CONFIGS, type ProductConfig } from '@/features/stock/product/productConfig'
import { ProductFormDrawer } from '@/features/stock/product/ProductFormDrawer'
import { getProduct } from '@/features/stock/product/productApi'
import { ServerFormDrawer } from '@/features/stock/servers/ServerFormDrawer'
import { getServer } from '@/features/stock/servers/serversApi'
import { ApiError } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { canManagePrice } from '@/types/auth'
import { toast } from '@/store/uiStore'
import { formatDate } from '@/lib/format'
import type { ProductUnit } from '@/types/product'
import type { ServerUnit } from '@/types/server'

const PAGE_SIZE = 25
const prettify = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

const TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'chassis', label: 'Chassis' },
  { value: 'cpu', label: 'Processor' },
  { value: 'ram', label: 'Memory' },
  { value: 'ssd', label: 'SSD' },
  { value: 'hdd', label: 'HDD' },
]

// Backend product_type -> frontend generic config key. (chassis is handled separately.)
const TYPE_TO_CONFIG: Record<string, string> = { cpu: 'processor', ram: 'memory', ssd: 'ssd', hdd: 'hdd' }

export function IssuesPage() {
  const [rows, setRows] = useState<IssueRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [productType, setProductType] = useState('')
  const [date, setDate] = useState(todayStr()) // default: today; '' = all dates
  const [page, setPage] = useState(1)
  const canSeePrice = canManagePrice(useAuthStore((s) => s.user?.role))

  // Inline edit drawer state (opened in place — no navigation).
  const [highlight, setHighlight] = useState<string[]>([])
  const [editConfig, setEditConfig] = useState<ProductConfig | null>(null)
  const [editProduct, setEditProduct] = useState<ProductUnit | null>(null)
  const [editChassis, setEditChassis] = useState<ServerUnit | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await listIssues({ productType, ...dayRange(date) }))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load issues.')
    } finally {
      setLoading(false)
    }
  }, [productType, date])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setPage(1)
  }, [productType, date])

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageRows = useMemo(() => rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE), [rows, safePage])

  async function fix(row: IssueRow) {
    setHighlight(row.missing_fields)
    try {
      if (row.product_type === 'chassis') {
        const unit = await getServer(row.product_id)
        setEditConfig(null)
        setEditProduct(null)
        setEditChassis(unit)
        setDrawerOpen(true)
        return
      }
      const config = PRODUCT_CONFIGS[TYPE_TO_CONFIG[row.product_type]]
      if (!config) return
      const unit = await getProduct(config.apiBase, row.product_id)
      setEditChassis(null)
      setEditConfig(config)
      setEditProduct(unit)
      setDrawerOpen(true)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not open the product.')
    }
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setEditConfig(null)
    setEditProduct(null)
    setEditChassis(null)
    setHighlight([])
  }

  function onSaved() {
    closeDrawer()
    load() // the save clears the issue server-side; refresh the list
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <PageHeader
        title="Issues"
        description="Products imported with missing fields. Fix the highlighted fields and save to clear an issue."
        actions={
          <>
            <Dropdown
              value={productType}
              onChange={setProductType}
              options={TYPE_OPTIONS}
              ariaLabel="Filter by product type"
              size="sm"
              className="w-40"
            />
            <DateFilter value={date} onChange={setDate} ariaLabel="Filter issues by date" />
          </>
        }
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      <TableWrap className="min-h-0 flex-1 overflow-auto">
        <THead>
          <TR>
            <TH className="w-20">Product No</TH>
            <TH className="w-40">Detected</TH>
            <TH className="w-28">Type</TH>
            <TH>Product</TH>
            <TH>Missing fields</TH>
            <TH className="text-right">Action</TH>
          </TR>
        </THead>
        <tbody>
          {loading ? (
            <LoadingRow colSpan={6} />
          ) : pageRows.length === 0 ? (
            <tr>
              <td colSpan={6}>
                <EmptyState
                  icon={<IconServer width={28} height={28} />}
                  title="No open issues"
                  hint="Imported products with missing fields will appear here."
                />
              </td>
            </tr>
          ) : (
            pageRows.map((r) => (
              <TR key={r.id}>
                <TD className="font-mono tabular-nums text-primary">{r.product_id}</TD>
                <TD className="whitespace-nowrap text-muted">{formatDate(r.created_at)}</TD>
                <TD>
                  <Pill tone="neutral">{productTypeLabel(r.product_type)}</Pill>
                </TD>
                <TD>
                  <span className="text-primary">{r.label || '—'}</span>
                </TD>
                <TD>
                  <div className="flex flex-wrap gap-1">
                    {r.missing_fields.map((f) => (
                      <Pill key={f} tone="warning">
                        {prettify(f)}
                      </Pill>
                    ))}
                  </div>
                </TD>
                <TDRight>
                  <Button size="sm" onClick={() => fix(r)}>
                    Fix
                  </Button>
                </TDRight>
              </TR>
            ))
          )}
        </tbody>
      </TableWrap>

      {!loading && rows.length > 0 && (
        <Pagination page={safePage} limit={PAGE_SIZE} total={rows.length} onPage={setPage} />
      )}

      {/* Inline edit — opened in place based on the issue's product type. */}
      {editConfig && (
        <ProductFormDrawer
          config={editConfig}
          open={drawerOpen}
          editing={editProduct}
          canEditPrice={canSeePrice}
          highlightFields={highlight}
          onClose={closeDrawer}
          onSaved={onSaved}
        />
      )}
      <ServerFormDrawer
        open={drawerOpen && !!editChassis}
        editing={editChassis}
        canEditPrice={canSeePrice}
        onClose={closeDrawer}
        onSaved={onSaved}
      />
    </div>
  )
}

function TDRight({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-3 py-2 text-right">
      <div className="flex justify-end">{children}</div>
    </td>
  )
}
