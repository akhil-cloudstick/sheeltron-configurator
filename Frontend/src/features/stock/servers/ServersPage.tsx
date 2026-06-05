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
import { useChassisData } from './useChassisData'
import { ChassisFilters } from './ChassisFilters'
import { applyChassisFilters, type ActiveFilter } from './chassisFilter'
import { ServerFormDrawer } from './ServerFormDrawer'
import { ImportDialog } from './ImportDialog'
import { CorrelationImportDialog } from '@/features/stock/CorrelationImportDialog'
import { SERVER_STATUS_META, SERVER_CONDITION_META } from './serverStatus'
import {
  deleteServer,
  deleteServers,
  templateUrl,
  importServerCorrelation,
  serverCorrelationTemplateUrl,
} from './serversApi'
import { exportServersCsv } from './exportCsv'
import { ApiError } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { canManagePrice } from '@/types/auth'
import { toast } from '@/store/uiStore'
import type { ServerUnit } from '@/types/server'

const PAGE_SIZE = 25

const money = (v: number | null) =>
  v === null || v === undefined
    ? '—'
    : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v)

export function ServersPage() {
  const { data, loading, error, refetch } = useChassisData()
  const role = useAuthStore((s) => s.user?.role)
  const canSeePrice = canManagePrice(role)
  const isStockManager = role === 'stock_manager'
  const isSuperAdmin = role === 'super_admin'
  const [params, setParams] = useSearchParams()

  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<ActiveFilter[]>([])
  const [page, setPage] = useState(1)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<ServerUnit | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ServerUnit | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [corrOpen, setCorrOpen] = useState(false)
  const [flashId, setFlashId] = useState<number | null>(null)

  // Multi-select for bulk delete / export.
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

  const filtered = useMemo(
    () => applyChassisFilters(data, search, filters),
    [data, search, filters],
  )

  // Clamp the page when the filtered set shrinks.
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  // Drop selections that are no longer in the filtered set.
  useEffect(() => {
    setSelected((prev) => {
      if (prev.size === 0) return prev
      const visible = new Set(filtered.map((r) => r.id))
      const next = new Set([...prev].filter((id) => visible.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [filtered])

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

  function resetToFirstPage() {
    setPage(1)
  }

  function openAdd() {
    setEditing(null)
    setDrawerOpen(true)
  }
  function openEdit(s: ServerUnit) {
    setEditing(s)
    setDrawerOpen(true)
  }
  function closeDrawer() {
    setDrawerOpen(false)
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

  // Deep-link from the Issues page: ?edit=<id> opens that chassis's editor.
  const handledDeepLink = useRef<string | null>(null)
  useEffect(() => {
    const editId = params.get('edit')
    if (!editId || loading) return
    if (handledDeepLink.current === editId) return
    const unit = data.find((u) => String(u.id) === editId)
    if (unit) {
      handledDeepLink.current = editId
      setEditing(unit)
      setDrawerOpen(true)
    }
  }, [params, data, loading])

  function exportSelected() {
    const rows = data.filter((r) => selected.has(r.id))
    if (rows.length === 0) return
    exportServersCsv(rows, { includePrice: canSeePrice })
    toast.success(`Exported ${rows.length} chassis to CSV.`)
  }

  // ☑, Product No, Brand·Model, Motherboard, Heat sink, RAID card, Power supply,
  // Condition, Status, Actions (+ Price for admin)
  const colCount = canSeePrice ? 11 : 10

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleteBusy(true)
    try {
      await deleteServer(deleteTarget.id)
      toast.success(`Chassis #${deleteTarget.id} (${deleteTarget.model || '—'}) deleted.`)
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
      const n = await deleteServers([...selected])
      toast.success(`${n} chassis deleted.`)
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
        title="Chassis stock"
        description="Physical chassis units, keyed by model — live from the backend."
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
                <a href={templateUrl()} download>
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
                  Add chassis
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

      <ChassisFilters
        data={data}
        search={search}
        onSearch={(v) => {
          setSearch(v)
          resetToFirstPage()
        }}
        filters={filters}
        onFiltersChange={(f) => {
          setFilters(f)
          resetToFirstPage()
        }}
      />

      {error && <ErrorBanner message={error} onRetry={refetch} />}

      <TableWrap className="min-h-0 flex-1 overflow-auto">
        <THead>
          <TR>
            <TH className="w-10">
              <RowCheckbox
                checked={allSelected}
                indeterminate={someSelected}
                onChange={toggleAll}
                label="Select all chassis"
              />
            </TH>
            <TH className="w-20">Product No</TH>
            <TH>Brand · Model</TH>
            <TH>Motherboard</TH>
            <TH>Heat sink</TH>
            <TH>RAID card</TH>
            <TH>Power supply</TH>
            <TH>Condition</TH>
            {canSeePrice && <TH className="text-right">Price</TH>}
            <TH>Status</TH>
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
                  title={data.length === 0 ? 'No chassis stock yet' : 'No chassis match your filters'}
                  hint={
                    data.length === 0
                      ? isStockManager
                        ? 'Add a unit manually or bulk-import from a spreadsheet.'
                        : 'No chassis yet — a stock manager can import it.'
                      : 'Try clearing the search or filters.'
                  }
                  action={
                    isStockManager ? (
                      <Button size="sm" onClick={openAdd}>
                        <IconPlus width={14} height={14} />
                        Add chassis
                      </Button>
                    ) : undefined
                  }
                />
              </td>
            </tr>
          ) : (
            pageRows.map((s) => (
              <Fragment key={s.id}>
              <TR flash={s.id === flashId}>
                <TD>
                  <RowCheckbox
                    checked={selected.has(s.id)}
                    onChange={() => toggleOne(s.id)}
                    label={`Select chassis #${s.id}`}
                  />
                </TD>
                <TD className="font-mono tabular-nums text-primary">{s.id}</TD>
                <TD className="max-w-[220px]">
                  <div className="truncate text-primary" title={s.model}>{s.model || '—'}</div>
                  {s.brand && <div className="truncate text-[11px] text-muted" title={s.brand}>{s.brand}</div>}
                </TD>
                <SpecCell value={s.motherboard} />
                <SpecCell value={s.heat_sink} />
                <SpecCell value={s.raid_card} />
                <SpecCell value={s.power_supply} />
                <TD>
                  <ConditionPills unit={s} />
                </TD>
                {canSeePrice && (
                  <TD className="whitespace-nowrap text-right font-mono text-caption tabular-nums">
                    {!s.condition_new && !s.condition_refurbished ? (
                      <span className="text-muted">—</span>
                    ) : (
                      <div className="flex flex-col items-end leading-tight">
                        {s.condition_new && <span title="New price">N {money(s.price_new)}</span>}
                        {s.condition_refurbished && (
                          <span className="text-muted" title="Refurbished price">R {money(s.price_refurbished)}</span>
                        )}
                      </div>
                    )}
                  </TD>
                )}
                <TD>
                  <Pill tone={SERVER_STATUS_META[s.status]?.tone ?? 'neutral'}>
                    {SERVER_STATUS_META[s.status]?.label ?? s.status}
                  </Pill>
                </TD>
                <TDActions>
                  {isSuperAdmin && (
                    <IconButton
                      label={expanded.has(s.id) ? 'Collapse details' : 'Show all details'}
                      onClick={() => toggleExpand(s.id)}
                    >
                      <IconChevronDown
                        width={15}
                        height={15}
                        className={`transition-transform ${expanded.has(s.id) ? 'rotate-180' : ''}`}
                      />
                    </IconButton>
                  )}
                  <IconButton label="Edit" onClick={() => openEdit(s)}>
                    <IconEdit width={15} height={15} />
                  </IconButton>
                  <IconButton label="Delete" tone="danger" onClick={() => setDeleteTarget(s)}>
                    <IconTrash width={15} height={15} />
                  </IconButton>
                </TDActions>
              </TR>
              {isSuperAdmin && expanded.has(s.id) && (
                <tr>
                  <td colSpan={colCount} className="px-3 pb-3">
                    <DetailGrid record={s as unknown as Record<string, unknown>} />
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

      <ServerFormDrawer
        open={drawerOpen}
        editing={editing}
        canEditPrice={canSeePrice}
        canEditCompat={isSuperAdmin}
        onClose={closeDrawer}
        onSaved={onSaved}
      />

      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} onImported={refetch} />

      <CorrelationImportDialog
        open={corrOpen}
        onClose={() => setCorrOpen(false)}
        onImported={refetch}
        noun="chassis"
        identityLabel="Model"
        importFn={importServerCorrelation}
        templateUrl={serverCorrelationTemplateUrl()}
      />

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete chassis"
        confirmLabel="Delete permanently"
        danger
        busy={deleteBusy}
      >
        This permanently removes product{' '}
        <span className="font-mono font-semibold text-primary">#{deleteTarget?.id}</span>
        {deleteTarget?.model ? ` (${deleteTarget.model})` : ''} from stock. This cannot be undone.
      </ConfirmModal>

      <ConfirmModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onConfirm={confirmBulkDelete}
        title="Delete selected chassis"
        confirmLabel={`Delete ${selected.size} permanently`}
        danger
        busy={bulkBusy}
      >
        This permanently removes{' '}
        <span className="font-semibold text-primary">{selected.size}</span> selected chassis from
        stock. This cannot be undone.
      </ConfirmModal>
    </div>
  )
}

/** Truncating spec cell shared by the hardware columns. */
function SpecCell({ value }: { value: string }) {
  return (
    <TD className="max-w-[150px]">
      <div className="truncate text-secondary" title={value || undefined}>
        {value || <span className="text-muted">—</span>}
      </div>
    </TD>
  )
}

/** Renders a New and/or Refurbished pill (or a dash when no condition is set). */
function ConditionPills({ unit }: { unit: ServerUnit }) {
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

/** Native checkbox with indeterminate support, styled to the table. */
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
