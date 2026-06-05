import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Button,
  IconButton,
  Pill,
  PageHeader,
  TableWrap,
  THead,
  TH,
  TR,
  TD,
  TDActions,
  LoadingRow,
  EmptyState,
  ErrorBanner,
  Pagination,
  ConfirmModal,
  IconPlus,
  IconEdit,
  IconTrash,
  IconUpload,
  IconDownload,
  IconServer,
  IconChevronDown,
} from '@/components/ui'
import { DetailGrid } from '@/features/stock/DetailGrid'
import { useProductData } from './useProductData'
import { ProductFilters } from './ProductFilters'
import { applyProductFilters, type ActiveFilter } from './productFilter'
import { ProductFormDrawer } from './ProductFormDrawer'
import { ProductImportDialog } from './ProductImportDialog'
import { CorrelationImportDialog } from '@/features/stock/CorrelationImportDialog'
import { exportProductsCsv } from './productExportCsv'
import {
  deleteProduct,
  deleteProducts,
  productTemplateUrl,
  importProductCorrelation,
  productCorrelationTemplateUrl,
} from './productApi'
import { SERVER_CONDITION_META } from '@/features/stock/servers/serverStatus'
import type { ProductConfig } from './productConfig'
import { ApiError } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { canManagePrice } from '@/types/auth'
import { toast } from '@/store/uiStore'
import type { ProductUnit } from '@/types/product'

const PAGE_SIZE = 25

const money = (v: unknown) =>
  v === null || v === undefined || v === ''
    ? '—'
    : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(v))

export function ProductStockPage({ config }: { config: ProductConfig }) {
  const { data, loading, error, refetch } = useProductData(config.apiBase)
  const role = useAuthStore((s) => s.user?.role)
  const canSeePrice = canManagePrice(role)
  const isStockManager = role === 'stock_manager'
  const isSuperAdmin = role === 'super_admin'
  const [params, setParams] = useSearchParams()

  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<ActiveFilter[]>([])
  const [page, setPage] = useState(1)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<ProductUnit | null>(null)
  const [highlightFields, setHighlightFields] = useState<string[]>([])
  const [deleteTarget, setDeleteTarget] = useState<ProductUnit | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [corrOpen, setCorrOpen] = useState(false)
  const [flashId, setFlashId] = useState<number | null>(null)

  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkBusy, setBulkBusy] = useState(false)
  // Super-admins can expand a row to see every column (incl. compatibility keys).
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  function toggleExpand(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Reset transient state when switching product type (route change).
  useEffect(() => {
    setSearch('')
    setFilters([])
    setPage(1)
    setSelected(new Set())
  }, [config.key])

  const filtered = useMemo(
    () => applyProductFilters(data, search, filters, config.searchFields),
    [data, search, filters, config.searchFields],
  )
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  useEffect(() => {
    setSelected((prev) => {
      if (prev.size === 0) return prev
      const visible = new Set(filtered.map((r) => r.id))
      const next = new Set([...prev].filter((id) => visible.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [filtered])

  // Deep-link from the Issues page: ?edit=<id>&highlight=key1,key2 opens the drawer.
  const handledDeepLink = useRef<string | null>(null)
  useEffect(() => {
    const editId = params.get('edit')
    if (!editId || loading) return
    const key = `${editId}:${params.get('highlight') ?? ''}`
    if (handledDeepLink.current === key) return
    const unit = data.find((u) => String(u.id) === editId)
    if (unit) {
      handledDeepLink.current = key
      setEditing(unit)
      setHighlightFields((params.get('highlight') ?? '').split(',').filter(Boolean))
      setDrawerOpen(true)
    }
  }, [params, data, loading])

  const allSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.id))
  const someSelected = selected.size > 0 && !allSelected

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(filtered.map((r) => r.id)))
  }
  function toggleOne(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function openAdd() {
    setEditing(null)
    setHighlightFields([])
    setDrawerOpen(true)
  }
  function openEdit(u: ProductUnit) {
    setEditing(u)
    setHighlightFields([])
    setDrawerOpen(true)
  }
  function closeDrawer() {
    setDrawerOpen(false)
    setHighlightFields([])
    if (params.get('edit')) {
      params.delete('edit')
      params.delete('highlight')
      setParams(params, { replace: true })
    }
  }
  function onSaved(id: number) {
    setFlashId(id)
    refetch()
    setTimeout(() => setFlashId(null), 1600)
  }

  function exportSelected() {
    const rows = data.filter((r) => selected.has(r.id))
    if (rows.length === 0) return
    exportProductsCsv(config, rows, { includePrice: canSeePrice })
    toast.success(`Exported ${rows.length} ${config.noun}(s) to CSV.`)
  }

  // ☑, Product No, Identity, ...spec columns, Condition, [Price], Actions
  const colCount = 3 + config.columns.length + (canSeePrice ? 2 : 1) + 1

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleteBusy(true)
    try {
      await deleteProduct(config.apiBase, deleteTarget.id)
      toast.success(`${config.noun} #${deleteTarget.id} deleted.`)
      setDeleteTarget(null)
      refetch()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Delete failed.')
    } finally {
      setDeleteBusy(false)
    }
  }

  async function confirmBulkDelete() {
    if (selected.size === 0) return
    setBulkBusy(true)
    try {
      const n = await deleteProducts(config.apiBase, [...selected])
      toast.success(`${n} ${config.noun}(s) deleted.`)
      setSelected(new Set())
      setBulkOpen(false)
      refetch()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Bulk delete failed.')
    } finally {
      setBulkBusy(false)
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <PageHeader
        title={config.title}
        description={`Physical ${config.noun} stock — live from the backend.`}
        actions={
          <>
            {selected.size > 0 && (
              <>
                <Button variant="secondary" size="sm" onClick={exportSelected}>
                  <IconDownload width={14} height={14} />
                  Export ({selected.size})
                </Button>
                <Button variant="danger" size="sm" onClick={() => setBulkOpen(true)}>
                  <IconTrash width={14} height={14} />
                  Delete ({selected.size})
                </Button>
              </>
            )}
            {isStockManager && (
              <>
                <a href={productTemplateUrl(config.apiBase)} download>
                  <Button variant="secondary" size="sm">
                    <IconDownload width={14} height={14} />
                    Template
                  </Button>
                </a>
                <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
                  <IconUpload width={14} height={14} />
                  Import
                </Button>
                <Button size="sm" onClick={openAdd}>
                  <IconPlus width={14} height={14} />
                  Add {config.noun}
                </Button>
              </>
            )}
            {isSuperAdmin && (
              <Button variant="secondary" size="sm" onClick={() => setCorrOpen(true)}>
                <IconUpload width={14} height={14} />
                Import correlation
              </Button>
            )}
          </>
        }
      />

      <ProductFilters
        data={data}
        fields={config.filterableFields}
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

      <TableWrap className="min-h-0 flex-1 overflow-auto">
        <THead>
          <TR>
            <TH className="w-10">
              <RowCheckbox checked={allSelected} indeterminate={someSelected} onChange={toggleAll} label="Select all" />
            </TH>
            <TH className="w-20">Product No</TH>
            <TH>{config.identityLabel}</TH>
            {config.columns.map((col) => (
              <TH key={col.key}>{col.label}</TH>
            ))}
            <TH>Condition</TH>
            {canSeePrice && <TH className="text-right">Price</TH>}
            <TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <tbody>
          {loading ? (
            <LoadingRow colSpan={colCount} />
          ) : pageRows.length === 0 ? (
            <tr>
              <td colSpan={colCount}>
                <EmptyState
                  icon={<IconServer width={28} height={28} />}
                  title={data.length === 0 ? `No ${config.noun} stock yet` : 'No matches'}
                  hint={
                    data.length === 0
                      ? isStockManager
                        ? 'Add a unit manually or bulk-import from a spreadsheet.'
                        : 'No stock yet — a stock manager can import it.'
                      : 'Try clearing the search or filters.'
                  }
                  action={
                    isStockManager ? (
                      <Button size="sm" onClick={openAdd}>
                        <IconPlus width={14} height={14} />
                        Add {config.noun}
                      </Button>
                    ) : undefined
                  }
                />
              </td>
            </tr>
          ) : (
            pageRows.map((u) => (
              <Fragment key={u.id}>
              <TR flash={u.id === flashId}>
                <TD>
                  <RowCheckbox checked={selected.has(u.id)} onChange={() => toggleOne(u.id)} label={`Select #${u.id}`} />
                </TD>
                <TD className="font-mono tabular-nums text-primary">{u.id}</TD>
                <TD className="max-w-[260px]">
                  <div className="truncate text-primary" title={String(u[config.identityKey] ?? '')}>
                    {String(u[config.identityKey] ?? '') || '—'}
                  </div>
                </TD>
                {config.columns.map((col) => (
                  <TD key={col.key} className="max-w-[150px]">
                    <div className="truncate text-secondary" title={String(u[col.key] ?? '') || undefined}>
                      {String(u[col.key] ?? '') || <span className="text-muted">—</span>}
                    </div>
                  </TD>
                ))}
                <TD>
                  <ConditionPills unit={u} />
                </TD>
                {canSeePrice && (
                  <TD className="whitespace-nowrap text-right font-mono text-caption tabular-nums">
                    {!u.condition_new && !u.condition_refurbished ? (
                      <span className="text-muted">—</span>
                    ) : (
                      <div className="flex flex-col items-end leading-tight">
                        {u.condition_new && <span title="New price">N {money(u.price_new)}</span>}
                        {u.condition_refurbished && (
                          <span className="text-muted" title="Refurbished price">R {money(u.price_refurbished)}</span>
                        )}
                      </div>
                    )}
                  </TD>
                )}
                <TDActions>
                  {isSuperAdmin && (
                    <IconButton
                      label={expanded.has(u.id) ? 'Collapse details' : 'Show all details'}
                      onClick={() => toggleExpand(u.id)}
                    >
                      <IconChevronDown
                        width={15}
                        height={15}
                        className={`transition-transform ${expanded.has(u.id) ? 'rotate-180' : ''}`}
                      />
                    </IconButton>
                  )}
                  <IconButton label="Edit" onClick={() => openEdit(u)}>
                    <IconEdit width={15} height={15} />
                  </IconButton>
                  <IconButton label="Delete" tone="danger" onClick={() => setDeleteTarget(u)}>
                    <IconTrash width={15} height={15} />
                  </IconButton>
                </TDActions>
              </TR>
              {isSuperAdmin && expanded.has(u.id) && (
                <tr>
                  <td colSpan={colCount} className="px-3 pb-3">
                    <DetailGrid record={u as Record<string, unknown>} />
                  </td>
                </tr>
              )}
              </Fragment>
            ))
          )}
        </tbody>
      </TableWrap>

      {!loading && filtered.length > 0 && (
        <Pagination page={safePage} limit={PAGE_SIZE} total={filtered.length} onPage={setPage} />
      )}

      <ProductFormDrawer
        config={config}
        open={drawerOpen}
        editing={editing}
        canEditPrice={canSeePrice}
        canEditCompat={isSuperAdmin}
        highlightFields={highlightFields}
        onClose={closeDrawer}
        onSaved={onSaved}
      />

      <ProductImportDialog config={config} open={importOpen} onClose={() => setImportOpen(false)} onImported={refetch} />

      <CorrelationImportDialog
        open={corrOpen}
        onClose={() => setCorrOpen(false)}
        onImported={refetch}
        noun={config.noun}
        identityLabel={config.identityLabel}
        importFn={(file) => importProductCorrelation(config.apiBase, file)}
        templateUrl={productCorrelationTemplateUrl(config.apiBase)}
        extraNote={
          config.key === 'ssd' || config.key === 'hdd'
            ? `Only the ${config.key.toUpperCase()} rows from storage.csv are imported (filtered by KIND).`
            : undefined
        }
      />

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={`Delete ${config.noun}`}
        confirmLabel="Delete permanently"
        danger
        busy={deleteBusy}
      >
        This permanently removes product{' '}
        <span className="font-mono font-semibold text-primary">#{deleteTarget?.id}</span> from stock.
        This cannot be undone.
      </ConfirmModal>

      <ConfirmModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onConfirm={confirmBulkDelete}
        title={`Delete selected ${config.noun}(s)`}
        confirmLabel={`Delete ${selected.size} permanently`}
        danger
        busy={bulkBusy}
      >
        This permanently removes <span className="font-semibold text-primary">{selected.size}</span> selected{' '}
        {config.noun}(s) from stock. This cannot be undone.
      </ConfirmModal>
    </div>
  )
}

function ConditionPills({ unit }: { unit: ProductUnit }) {
  if (!unit.condition_new && !unit.condition_refurbished) return <span className="text-muted">—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {unit.condition_new && <Pill tone={SERVER_CONDITION_META.new.tone}>{SERVER_CONDITION_META.new.label}</Pill>}
      {unit.condition_refurbished && (
        <Pill tone={SERVER_CONDITION_META.refurbished.tone}>{SERVER_CONDITION_META.refurbished.label}</Pill>
      )}
    </div>
  )
}

function RowCheckbox({
  checked,
  indeterminate = false,
  onChange,
  label,
}: {
  checked: boolean
  indeterminate?: boolean
  onChange: () => void
  label: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate
  }, [indeterminate])
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={label}
      checked={checked}
      onChange={onChange}
      className="h-4 w-4 cursor-pointer rounded border-border accent-accent"
    />
  )
}
