import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Button,
  IconButton,
  Pill,
  PageHeader,
  NoticeBar,
  Input,
  Select,
  TableWrap,
  THead,
  TH,
  TR,
  TD,
  TDActions,
  EmptyState,
  ConfirmModal,
  IconPlus,
  IconSearch,
  IconEdit,
  IconTrash,
  IconTag,
} from '@/components/ui'
import { InlinePriceCell } from './InlinePriceCell'
import { CatalogFormDrawer } from './CatalogFormDrawer'
import { CATALOG_CONFIG, distinctValues } from './catalogConfig'
import { useMockDb } from '@/store/mockDbStore'
import { toast } from '@/store/uiStore'
import { CATALOG_ENTITIES, type CatalogEntity } from '@/types/catalog'

type Row = Record<string, unknown> & {
  id: number
  sku: string
  price_new: number | null
  price_refurb: number | null
  is_active: boolean
}

const ENTITY_KEYS = CATALOG_ENTITIES.map((e) => e.key)

export function CatalogGrid() {
  const { entity: entityParam } = useParams<{ entity: string }>()
  const entity = (ENTITY_KEYS.includes(entityParam as CatalogEntity) ? entityParam : 'chassis') as CatalogEntity
  const cfg = CATALOG_CONFIG[entity]
  const gridFields = cfg.fields.filter((f) => f.grid)

  const rows = useMockDb((s) => s.listCatalog(entity)) as unknown as Row[]
  const updateCatalog = useMockDb((s) => s.updateCatalog)
  const removeCatalog = useMockDb((s) => s.removeCatalog)

  const [q, setQ] = useState('')
  const [filterValue, setFilterValue] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null)
  const [flashId, setFlashId] = useState<number | null>(null)

  const filterOptions = useMemo(
    () => (cfg.filterField ? distinctValues(rows, cfg.filterField) : []),
    [rows, cfg.filterField],
  )

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return rows.filter((r) => {
      if (cfg.filterField && filterValue && String(r[cfg.filterField] ?? '') !== filterValue) return false
      if (!needle) return true
      return Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(needle))
    })
  }, [rows, q, filterValue, cfg.filterField])

  function openAdd() {
    setEditing(null)
    setDrawerOpen(true)
  }
  function openEdit(r: Row) {
    setEditing(r)
    setDrawerOpen(true)
  }
  function flash(id: number) {
    setFlashId(id)
    setTimeout(() => setFlashId(null), 1600)
  }
  function commitPrice(r: Row, field: 'price_new' | 'price_refurb', value: number | null) {
    updateCatalog(entity, r.id, { [field]: value } as never)
  }
  function confirmDelete() {
    if (!deleteTarget) return
    removeCatalog(entity, deleteTarget.id)
    toast.success(`${deleteTarget.sku} removed from catalog.`)
    setDeleteTarget(null)
  }

  const colCount = gridFields.length + 4 // spec cols + 2 price + active + actions

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={cfg.title}
        description={cfg.description}
        actions={
          <Button size="sm" onClick={openAdd}>
            <IconPlus width={14} height={14} />
            Add SKU
          </Button>
        }
      />

      <NoticeBar tone="warning">
        Mock data — the catalog has no backend yet. Double-click a price to edit it inline. Changes
        persist in your browser only.
      </NoticeBar>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted">
            <IconSearch />
          </span>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search SKU, name, spec…"
            className="w-72 pl-8"
          />
        </div>
        {cfg.filterField && (
          <Select value={filterValue} onChange={(e) => setFilterValue(e.target.value)} className="w-44">
            <option value="">All {cfg.filterLabel?.toLowerCase()}</option>
            {filterOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </Select>
        )}
        <span className="ml-auto text-caption text-muted">{filtered.length} SKUs</span>
      </div>

      <TableWrap>
        <THead>
          <TR>
            {gridFields.map((f) => (
              <TH key={f.key} className={f.type === 'number' ? 'text-right' : ''}>
                {f.label}
              </TH>
            ))}
            <TH className="text-right">Price · New</TH>
            <TH className="text-right">Price · Refurb</TH>
            <TH>Active</TH>
            <TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={colCount}>
                <EmptyState
                  icon={<IconTag width={28} height={28} />}
                  title="No catalog SKUs"
                  hint="Add a SKU to start pricing this category."
                  action={
                    <Button size="sm" onClick={openAdd}>
                      <IconPlus width={14} height={14} />
                      Add SKU
                    </Button>
                  }
                />
              </td>
            </tr>
          ) : (
            filtered.map((r) => (
              <TR key={r.id} flash={r.id === flashId}>
                {gridFields.map((f) => (
                  <TD
                    key={f.key}
                    className={
                      (f.type === 'number' ? 'text-right tabular-nums ' : '') +
                      (f.mono ? 'font-mono text-primary' : '')
                    }
                  >
                    {formatCell(r[f.key])}
                  </TD>
                ))}
                <TD className="text-right">
                  <InlinePriceCell value={r.price_new} onCommit={(v) => commitPrice(r, 'price_new', v)} />
                </TD>
                <TD className="text-right">
                  <InlinePriceCell value={r.price_refurb} onCommit={(v) => commitPrice(r, 'price_refurb', v)} />
                </TD>
                <TD>
                  <Pill tone={r.is_active ? 'success' : 'neutral'}>{r.is_active ? 'Active' : 'Hidden'}</Pill>
                </TD>
                <TDActions>
                  <IconButton label="Edit" onClick={() => openEdit(r)}>
                    <IconEdit width={15} height={15} />
                  </IconButton>
                  <IconButton label="Delete" tone="danger" onClick={() => setDeleteTarget(r)}>
                    <IconTrash width={15} height={15} />
                  </IconButton>
                </TDActions>
              </TR>
            ))
          )}
        </tbody>
      </TableWrap>

      <CatalogFormDrawer
        entity={entity}
        open={drawerOpen}
        editing={editing}
        onClose={() => setDrawerOpen(false)}
        onSaved={flash}
      />

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Remove catalog SKU"
        confirmLabel="Remove"
        danger
      >
        Remove <span className="font-mono font-semibold text-primary">{deleteTarget?.sku}</span> from
        the catalog?
      </ConfirmModal>
    </div>
  )
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  if (Array.isArray(v)) return v.join(', ')
  return String(v)
}
