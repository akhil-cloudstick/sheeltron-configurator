import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Button,
  IconButton,
  Pill,
  PageHeader,
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
  IconBox,
} from '@/components/ui'
import { GenericStockDrawer } from './GenericStockDrawer'
import { STOCK_KIND_CONFIG, STOCK_STATE_META } from './genericStockConfig'
import { useMockDb } from '@/store/mockDbStore'
import { toast } from '@/store/uiStore'
import { STOCK_STATES, type GenericStockRow, type StockKind, type StockState } from '@/types/stock'

const STOCK_KINDS: StockKind[] = ['cpus', 'ram', 'storage', 'network']

export function GenericStockPage() {
  const { kind: kindParam } = useParams<{ kind: string }>()
  const kind = (STOCK_KINDS.includes(kindParam as StockKind) ? kindParam : 'cpus') as StockKind
  const cfg = STOCK_KIND_CONFIG[kind]

  const rows = useMockDb((s) => s.listStock(kind))
  const removeStock = useMockDb((s) => s.removeStock)

  const [q, setQ] = useState('')
  const [state, setState] = useState<StockState | ''>('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<GenericStockRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<GenericStockRow | null>(null)
  const [flashId, setFlashId] = useState<number | null>(null)

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return rows.filter((r) => {
      if (state && r.state !== state) return false
      if (!needle) return true
      return (
        r.sku.toLowerCase().includes(needle) ||
        r.label.toLowerCase().includes(needle) ||
        r.spec.toLowerCase().includes(needle)
      )
    })
  }, [rows, q, state])

  function openAdd() {
    setEditing(null)
    setDrawerOpen(true)
  }
  function openEdit(r: GenericStockRow) {
    setEditing(r)
    setDrawerOpen(true)
  }
  function onSaved(id: number) {
    setFlashId(id)
    setTimeout(() => setFlashId(null), 1600)
  }
  function confirmDelete() {
    if (!deleteTarget) return
    removeStock(kind, deleteTarget.id)
    toast.success(`${deleteTarget.sku} removed from stock.`)
    setDeleteTarget(null)
  }

  const totalQty = filtered.reduce((sum, r) => sum + r.quantity, 0)

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={cfg.title}
        description={cfg.description}
        actions={
          <Button size="sm" onClick={openAdd}>
            <IconPlus width={14} height={14} />
            Add stock
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted">
            <IconSearch />
          </span>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search SKU, label, spec…"
            className="w-72 pl-8"
          />
        </div>
        <Select value={state} onChange={(e) => setState(e.target.value as StockState | '')} className="w-44">
          <option value="">All states</option>
          {STOCK_STATES.map((s) => (
            <option key={s} value={s}>
              {STOCK_STATE_META[s].label}
            </option>
          ))}
        </Select>
        <span className="ml-auto text-caption text-muted">
          {filtered.length} SKUs · <span className="font-semibold text-secondary">{totalQty}</span> units
        </span>
      </div>

      <TableWrap className="max-h-[64vh] overflow-y-auto">
        <THead>
          <TR>
            <TH>SKU</TH>
            <TH>Label</TH>
            <TH>{cfg.specLabel}</TH>
            <TH>Condition</TH>
            <TH className="text-right">Qty</TH>
            <TH>Location</TH>
            <TH>State</TH>
            <TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={8}>
                <EmptyState
                  icon={<IconBox width={28} height={28} />}
                  title="No stock rows"
                  hint="Add a mock inventory record to get started."
                  action={
                    <Button size="sm" onClick={openAdd}>
                      <IconPlus width={14} height={14} />
                      Add stock
                    </Button>
                  }
                />
              </td>
            </tr>
          ) : (
            filtered.map((r) => (
              <TR key={r.id} flash={r.id === flashId}>
                <TD className="font-mono text-primary">{r.sku}</TD>
                <TD className="text-primary">{r.label || '—'}</TD>
                <TD className="text-muted">{r.spec || '—'}</TD>
                <TD>
                  <Pill tone={r.condition === 'new' ? 'info' : 'warning'}>
                    {r.condition === 'new' ? 'New' : 'Refurb'}
                  </Pill>
                </TD>
                <TD className="text-right tabular-nums">{r.quantity}</TD>
                <TD className="text-muted">{r.location || '—'}</TD>
                <TD>
                  <Pill tone={STOCK_STATE_META[r.state].tone}>{STOCK_STATE_META[r.state].label}</Pill>
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

      <GenericStockDrawer
        kind={kind}
        open={drawerOpen}
        editing={editing}
        onClose={() => setDrawerOpen(false)}
        onSaved={onSaved}
      />

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Remove stock row"
        confirmLabel="Remove"
        danger
      >
        Remove <span className="font-mono font-semibold text-primary">{deleteTarget?.sku}</span> from
        mock stock?
      </ConfirmModal>
    </div>
  )
}
