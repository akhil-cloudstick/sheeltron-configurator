import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Button,
  Card,
  Field,
  Input,
  Dropdown,
  IconSearch,
  PillTabs,
  TableWrap,
  THead,
  TH,
  TR,
  TD,
  PageHeader,
  ErrorBanner,
} from '@/components/ui'
import { toast } from '@/store/uiStore'
import { formatMoney } from '@/lib/format'
import {
  BULK_TYPES,
  BULK_TYPE_META,
  bulkPriceCommit,
  computePreview,
  distinctValues,
  type AdjType,
  type BulkType,
  type BulkUnit,
  type Direction,
  type PriceTarget,
} from './bulkPriceApi'

export function BulkPriceUpdate() {
  const [type, setType] = useState<BulkType>('chassis')
  const meta = BULK_TYPE_META[type]

  const [units, setUnits] = useState<BulkUnit[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const [filterValue, setFilterValue] = useState('')
  const [target, setTarget] = useState<PriceTarget>('new')
  const [direction, setDirection] = useState<Direction>('increase')
  const [adjustmentType, setAdjustmentType] = useState<AdjType>('percent')
  const [adjustmentValue, setAdjustmentValue] = useState(10)
  const [reason, setReason] = useState('')
  const [committing, setCommitting] = useState(false)

  // Rows the admin has unchecked (default: none excluded = all selected).
  const [excluded, setExcluded] = useState<Set<number>>(new Set())
  const [itemSearch, setItemSearch] = useState('')

  // Load the selected type's units from the real backend (also re-runs after a commit).
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    meta
      .list()
      .then((u) => {
        if (!cancelled) setUnits(u)
      })
      .catch((e) => {
        if (!cancelled) setLoadError((e as Error)?.message ?? 'Failed to load stock.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, reloadKey])

  const filterOptions = useMemo(() => distinctValues(units, meta.filterField), [units, meta.filterField])

  const preview = useMemo(
    () =>
      computePreview(units, {
        filterField: meta.filterField,
        filterValue,
        labelField: meta.labelField,
        target,
        direction,
        adjustmentType,
        adjustmentValue,
      }),
    [units, meta.filterField, meta.labelField, filterValue, target, direction, adjustmentType, adjustmentValue],
  )

  // Items shown in the table (item-search is a view filter; selection is independent).
  const visibleItems = useMemo(() => {
    const n = itemSearch.trim().toLowerCase()
    return n ? preview.items.filter((it) => it.label.toLowerCase().includes(n)) : preview.items
  }, [preview.items, itemSearch])

  // Selection-aware totals/affected/ids over ALL selected (checked) rows.
  const sel = useMemo(() => {
    let affected = 0
    let oldTotal = 0
    let newTotal = 0
    const ids: number[] = []
    for (const it of preview.items) {
      if (excluded.has(it.id)) continue
      ids.push(it.id)
      if (it.changed) affected += 1
      oldTotal += (it.old_new ?? 0) + (it.old_refurb ?? 0)
      newTotal += (it.new_new ?? 0) + (it.new_refurb ?? 0)
    }
    return { affected, oldTotal, newTotal, ids }
  }, [preview.items, excluded])

  const selectedVisible = visibleItems.filter((it) => !excluded.has(it.id)).length
  const allVisibleSelected = visibleItems.length > 0 && selectedVisible === visibleItems.length
  const someVisibleSelected = selectedVisible > 0 && !allVisibleSelected

  const delta = sel.newTotal - sel.oldTotal
  const reasonMissing = reason.trim() === ''
  const canCommit = sel.affected > 0 && !reasonMissing && !committing

  function changeType(t: BulkType) {
    setType(t)
    setFilterValue('')
    setExcluded(new Set())
    setItemSearch('')
  }

  function toggleOne(id: number) {
    setExcluded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAllVisible() {
    setExcluded((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) {
        for (const it of visibleItems) next.add(it.id) // unselect all visible
      } else {
        for (const it of visibleItems) next.delete(it.id) // select all visible
      }
      return next
    })
  }

  async function commit() {
    if (!canCommit) return
    setCommitting(true)
    try {
      const res = await bulkPriceCommit({
        type,
        filter_value: filterValue,
        // Only send an explicit allow-list when the admin has unchecked something.
        ids: excluded.size > 0 ? sel.ids : undefined,
        target,
        direction,
        adjustment_type: adjustmentType,
        adjustment_value: adjustmentValue,
        reason: reason.trim(),
      })
      toast.success(`${res.affected} ${res.affected === 1 ? 'price' : 'prices'} updated — recorded in change logs.`)
      setReason('')
      setReloadKey((k) => k + 1) // re-fetch so the preview shows the new prices
    } catch (e) {
      toast.error((e as Error)?.message ?? 'Bulk update failed.')
    } finally {
      setCommitting(false)
    }
  }

  const showNew = target === 'new' || target === 'both'
  const showRef = target === 'refurb' || target === 'both'
  const colSpan = 2 + (showNew ? 2 : 0) + (showRef ? 2 : 0)

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[360px_1fr]">
      <div className="flex flex-col gap-4">
        <PageHeader title="Bulk price update" description="Adjust many stock prices at once." />

        <Card className="flex flex-col gap-4 p-4">
          <Field label="Apply to">
            <Dropdown
              value={type}
              onChange={(v) => changeType(v as BulkType)}
              options={BULK_TYPES.map((t) => ({ value: t, label: BULK_TYPE_META[t].label }))}
              ariaLabel="Apply to product type"
            />
          </Field>

          <Field label={`Filter · ${meta.filterLabel}`} hint="Leave as “all” to apply to every item.">
            <Dropdown
              value={filterValue}
              onChange={setFilterValue}
              options={[
                { value: '', label: `All ${meta.filterLabel.toLowerCase()}` },
                ...filterOptions.map((o) => ({ value: o, label: o })),
              ]}
              ariaLabel={`Filter by ${meta.filterLabel}`}
              searchable
              searchPlaceholder={`Search ${meta.filterLabel.toLowerCase()}…`}
            />
          </Field>

          <Field label="Update which price">
            <PillTabs
              value={target}
              onChange={setTarget}
              options={[
                { value: 'new', label: 'New' },
                { value: 'refurb', label: 'Refurb' },
                { value: 'both', label: 'Both' },
              ]}
            />
          </Field>

          <Field label="Adjustment direction">
            <PillTabs
              value={direction}
              onChange={setDirection}
              options={[
                { value: 'increase', label: 'Uplift' },
                { value: 'decrease', label: 'Reduction' },
              ]}
            />
          </Field>

          <Field label="Adjustment">
            <div className="flex items-center gap-2">
              <PillTabs
                value={adjustmentType}
                onChange={setAdjustmentType}
                options={[
                  { value: 'percent', label: '%' },
                  { value: 'absolute', label: '₹' },
                ]}
              />
              <Input
                type="number"
                min={0}
                value={adjustmentValue}
                onChange={(e) => setAdjustmentValue(Math.max(0, Number(e.target.value) || 0))}
                className="w-28"
              />
            </div>
          </Field>

          <Field
            label="Reason"
            required
            hint="Recorded with the run and shown in the change log."
            error={reasonMissing ? 'A reason is required to commit.' : undefined}
          >
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Market correction 2026-06"
              invalid={reasonMissing}
            />
          </Field>
        </Card>
      </div>

      <div className="flex min-h-0 flex-col gap-4">
        {loadError && <ErrorBanner message={loadError} onRetry={() => setReloadKey((k) => k + 1)} />}

        <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex gap-6">
            <Metric label="Affected" value={String(sel.affected)} />
            <Metric label="Old total" value={formatMoney(sel.oldTotal)} />
            <Metric label="New total" value={formatMoney(sel.newTotal)} />
            <Metric
              label="Change"
              value={`${delta >= 0 ? '+' : '−'}${formatMoney(Math.abs(delta))}`}
              tone={delta > 0 ? 'text-success' : delta < 0 ? 'text-danger' : 'text-muted'}
            />
          </div>
          <Button onClick={commit} disabled={!canCommit}>
            {committing ? 'Committing…' : `Commit ${sel.affected > 0 ? `${sel.affected} changes` : 'changes'}`}
          </Button>
        </Card>

        <div className="flex items-center justify-between gap-3">
          <div className="relative w-72">
            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted">
              <IconSearch width={14} height={14} />
            </span>
            <Input
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              placeholder="Search items…"
              aria-label="Search items by name"
              className="h-8 py-1 pl-7 text-caption"
            />
          </div>
          <span className="text-caption text-muted">
            {sel.ids.length} of {preview.items.length} selected
          </span>
        </div>

        <TableWrap className="max-h-[65vh] overflow-y-auto">
          <THead>
            <TR>
              <TH className="w-10">
                <SelectAllCheckbox
                  checked={allVisibleSelected}
                  indeterminate={someVisibleSelected}
                  disabled={visibleItems.length === 0}
                  onChange={toggleAllVisible}
                />
              </TH>
              <TH>Item</TH>
              {showNew && <TH className="text-right">Old price (New)</TH>}
              {showNew && <TH className="text-right">Updated price (New)</TH>}
              {showRef && <TH className="text-right">Old price (Refurb)</TH>}
              {showRef && <TH className="text-right">Updated price (Refurb)</TH>}
            </TR>
          </THead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={colSpan} className="px-3 py-10 text-center text-muted">
                  Loading stock…
                </td>
              </tr>
            ) : visibleItems.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-3 py-10 text-center text-muted">
                  {itemSearch.trim() ? 'No items match your search.' : 'No items found for this selection.'}
                </td>
              </tr>
            ) : (
              visibleItems.map((it) => {
                const selected = !excluded.has(it.id)
                return (
                  <TR key={it.id} className={selected ? undefined : 'opacity-50'}>
                    <TD className="w-10">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleOne(it.id)}
                        aria-label={`Include ${it.label}`}
                        className="h-4 w-4 cursor-pointer accent-accent"
                      />
                    </TD>
                    <TD className="text-primary">{it.label}</TD>
                    {showNew && <TD className="text-right font-mono text-muted">{formatMoney(it.old_new)}</TD>}
                    {showNew && (
                      <TD
                        className={`text-right font-mono ${it.new_new !== it.old_new ? 'font-semibold text-primary' : 'text-muted'}`}
                      >
                        {formatMoney(it.new_new)}
                      </TD>
                    )}
                    {showRef && <TD className="text-right font-mono text-muted">{formatMoney(it.old_refurb)}</TD>}
                    {showRef && (
                      <TD
                        className={`text-right font-mono ${it.new_refurb !== it.old_refurb ? 'font-semibold text-primary' : 'text-muted'}`}
                      >
                        {formatMoney(it.new_refurb)}
                      </TD>
                    )}
                  </TR>
                )
              })
            )}
          </tbody>
        </TableWrap>
      </div>
    </div>
  )
}

function SelectAllCheckbox({
  checked,
  indeterminate,
  disabled,
  onChange,
}: {
  checked: boolean
  indeterminate: boolean
  disabled?: boolean
  onChange: () => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate
  }, [indeterminate])
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      aria-label="Select all items"
      className="h-4 w-4 cursor-pointer accent-accent disabled:cursor-not-allowed disabled:opacity-50"
    />
  )
}

function Metric({ label, value, tone = 'text-primary' }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <div className="text-meta uppercase text-muted">{label}</div>
      <div className={`font-display text-lg font-bold ${tone}`}>{value}</div>
    </div>
  )
}
