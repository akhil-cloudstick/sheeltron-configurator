import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Pill, ErrorBanner, type PillTone } from '@/components/ui'
import { ApiError } from '@/lib/api'
import { useConfiguratorStore } from '@/store/configuratorStore'
import { cn } from '@/lib/cn'
import { useWizardSteps } from './wizardContext'
import type { Category, ConfigOption, Selection } from './types'
import { optionKey } from './types'
import { money, conditionLabel, conditionTone } from './format'

export interface FacetDef {
  key: string
  label: string
  get: (o: ConfigOption) => string | undefined
  numeric?: boolean
}

export interface SpecBadge {
  text: string
  tone?: PillTone
}

const LIST_CAP = 150

// undefined = not yet decided · null = "Any" (skip) · string = chosen value
type FacetVal = string | null | undefined

export function StepPicker({
  category,
  stepNo,
  title,
  hint,
  ready,
  notReadyHint,
  load,
  loadKey,
  vendorFacet,
  facets,
  searchText,
  specs,
  // selection behaviour
  multi = false,
  hideQty = false,
  maxQty,
  prefilter,
  capBanner,
  canSelect,
  canIncrement,
}: {
  category: Category
  stepNo: number
  title: string
  hint: string
  ready: boolean
  notReadyHint: string
  load: () => Promise<ConfigOption[]>
  loadKey: string
  vendorFacet?: FacetDef
  facets: FacetDef[]
  searchText: (o: ConfigOption) => string
  specs: (o: ConfigOption) => SpecBadge[]
  /** Storage uses multi-select (a list of drives, each with its own qty). */
  multi?: boolean
  /** Chassis hides the qty stepper (always 1). */
  hideQty?: boolean
  /** Hard per-row quantity cap (CPU = 4, RAM = DIMM slots). */
  maxQty?: number
  /** Narrow the loaded options before facets/counts (e.g. chassis socket rule). */
  prefilter?: (o: ConfigOption) => boolean
  /** Usage banner shown above the list (RAM slots/GB, storage bays). */
  capBanner?: React.ReactNode
  /** May an unselected row be added right now? (storage bays full → false). */
  canSelect?: (o: ConfigOption) => boolean
  /** May a selected row's qty be incremented? (RAM GB cap, storage bays). */
  canIncrement?: (o: ConfigOption, currentQty: number) => boolean
}) {
  const navigate = useNavigate()
  // Single-pick categories read their slot; storage reads the array.
  const singleSel = useConfiguratorStore((s) =>
    multi ? null : (s[category as 'processor' | 'chassis' | 'ram'] as Selection | null),
  )
  const storageSels = useConfiguratorStore((s) => s.storage)
  const select = useConfiguratorStore((s) => s.select)
  const setQty = useConfiguratorStore((s) => s.setQty)
  const clear = useConfiguratorStore((s) => s.clear)
  const toggleStorage = useConfiguratorStore((s) => s.toggleStorage)
  const setStorageQty = useConfiguratorStore((s) => s.setStorageQty)

  const steps = useWizardSteps()
  const stepIdx = steps.findIndex((s) => s.category === category)

  const [options, setOptions] = useState<ConfigOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [vendor, setVendor] = useState<string | null>(null)
  const [facetSel, setFacetSel] = useState<Record<string, FacetVal>>({})

  useEffect(() => {
    // Back-navigation restore: if this step already has a pick, reconstruct the
    // drill-down so the product list shows immediately with the selection
    // highlighted — instead of dropping the user back on the first filter chip.
    const st = useConfiguratorStore.getState()
    const existing = multi ? st.storage[0]?.option ?? null : st[category as 'processor' | 'chassis' | 'ram']?.option ?? null
    if (existing && !multi) {
      const restored: Record<string, FacetVal> = {}
      for (const f of facets) restored[f.key] = f.get(existing) ?? null
      setFacetSel(restored)
      setVendor(vendorFacet ? vendorFacet.get(existing) ?? null : null)
    } else if (existing && multi) {
      // Multiple drives may span facet values → show the full list (all "Any").
      const anyAll: Record<string, FacetVal> = {}
      for (const f of facets) anyAll[f.key] = null
      setFacetSel(anyAll)
      setVendor(null)
    } else {
      setFacetSel({})
      setVendor(null)
    }
    setSearch('')
    if (!ready) {
      setOptions([])
      return
    }
    let alive = true
    setLoading(true)
    setError(null)
    load()
      .then((opts) => alive && setOptions(opts))
      .catch((err) => alive && setError(err instanceof ApiError ? err.message : 'Could not load options.'))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, loadKey])

  const q = search.trim().toLowerCase()
  const searching = q.length > 0
  const matchesSearch = (o: ConfigOption) => !q || searchText(o).toLowerCase().includes(q)
  const matchesVendor = (o: ConfigOption) => !vendor || !vendorFacet || (vendorFacet.get(o) || '') === vendor
  // null (Any) or undefined (not yet) → no filter; string → must equal.
  const facetMatches = (o: ConfigOption, f: FacetDef) => {
    const v = facetSel[f.key]
    return v === undefined || v === null ? true : (f.get(o) || '') === v
  }

  // Step-level prefilter (e.g. chassis socket rule) — applied before everything.
  const base = useMemo(
    () => (prefilter ? options.filter(prefilter) : options),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [options, prefilter],
  )

  const activeIndex = facets.findIndex((f) => facetSel[f.key] === undefined)
  const allDecided = activeIndex === -1

  // Vendor tab counts (over search only).
  const vendorTabs = useMemo(() => {
    if (!vendorFacet) return []
    const m = new Map<string, number>()
    for (const o of base) {
      if (!matchesSearch(o)) continue
      const v = vendorFacet.get(o)
      if (v) m.set(v, (m.get(v) || 0) + 1)
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, search])

  // Counts for the currently-active facet, over vendor + already-decided facets.
  const activeFacet = allDecided ? null : facets[activeIndex]
  const activeValues = useMemo(() => {
    if (!activeFacet) return []
    const m = new Map<string, number>()
    for (const o of base) {
      if (!matchesVendor(o) || !matchesSearch(o)) continue
      if (!facets.slice(0, activeIndex).every((f) => facetMatches(o, f))) continue
      const v = activeFacet.get(o)
      if (v) m.set(v, (m.get(v) || 0) + 1)
    }
    return [...m.entries()].sort((a, b) =>
      activeFacet.numeric ? (parseInt(b[0]) || 0) - (parseInt(a[0]) || 0) : b[1] - a[1],
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, vendor, search, facetSel])

  const products = useMemo(() => {
    if (searching) return base.filter(matchesSearch)
    if (!allDecided) return []
    return base.filter((o) => matchesVendor(o) && facets.every((f) => facetMatches(o, f)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, vendor, search, facetSel])

  function pickFacet(key: string, value: string | null) {
    setFacetSel((s) => ({ ...s, [key]: value }))
  }
  function changeFacet(idx: number) {
    // Re-open this facet and clear it + everything downstream. For single picks a
    // filter change invalidates the current pick, so drop it (resets qty too).
    // Storage picks are explicit adds, so changing a filter keeps the chosen drives.
    setFacetSel((s) => {
      const next = { ...s }
      for (let i = idx; i < facets.length; i++) next[facets[i].key] = undefined
      return next
    })
    if (!multi) clear(category)
  }
  function pickVendor(v: string | null) {
    setVendor(v)
    setFacetSel({}) // restart the funnel
    if (!multi) clear(category)
  }

  // Selection adapters shared by both list render paths.
  const selectedKeys = useMemo(
    () =>
      new Set(
        multi
          ? storageSels.map((sel) => optionKey(sel.option))
          : singleSel
            ? [optionKey(singleSel.option)]
            : [],
      ),
    [multi, storageSels, singleSel],
  )
  const qtyOf = (o: ConfigOption) => {
    if (multi) return storageSels.find((sel) => optionKey(sel.option) === optionKey(o))?.qty ?? 1
    return singleSel && optionKey(singleSel.option) === optionKey(o) ? singleSel.qty : 1
  }
  const onPick = (o: ConfigOption) => (multi ? toggleStorage(o) : select(category, o))
  const onRowQty = (o: ConfigOption, n: number) =>
    multi ? setStorageQty(optionKey(o), n) : setQty(category, n)

  const list = (items: ConfigOption[]) => (
    <ProductList
      products={items}
      specs={specs}
      isSelected={(o) => selectedKeys.has(optionKey(o))}
      qtyOf={qtyOf}
      onPick={onPick}
      onQty={onRowQty}
      hideQty={hideQty}
      maxQty={maxQty}
      multi={multi}
      canSelect={canSelect}
      canIncrement={canIncrement}
    />
  )

  // Continue: single picks require a selection; storage is optional → always allowed.
  const canContinue = multi ? true : !!singleSel

  // Back (hidden on the first step) + Continue, anchored at the bottom of the panel.
  const footer = (
    <div className="flex items-center justify-between">
      {stepIdx > 0 ? (
        <Button variant="secondary" onClick={() => navigate(steps[stepIdx - 1].path)}>
          ← Back
        </Button>
      ) : (
        <span />
      )}
      <Button disabled={!canContinue} onClick={() => navigate(steps[stepIdx + 1].path)}>
        Continue →
      </Button>
    </div>
  )

  if (!ready) {
    return (
      <Frame stepNo={stepNo} totalSteps={steps.length} title={title} hint={hint} footer={footer}>
        <Center>{notReadyHint}</Center>
      </Frame>
    )
  }

  return (
    <Frame
      stepNo={stepNo}
      totalSteps={steps.length}
      title={title}
      hint={hint}
      footer={footer}
      tools={
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-[200px] flex-1">
            <Input value={search} placeholder={`Search ${title.toLowerCase()}…`} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {vendorFacet && !searching && (
            <div className="flex items-center gap-0.5 rounded-control border border-border bg-surface p-0.5">
              <Tab active={!vendor} onClick={() => pickVendor(null)}>
                All
              </Tab>
              {vendorTabs.map(([v]) => (
                <Tab key={v} active={vendor === v} onClick={() => pickVendor(v)}>
                  {v}
                </Tab>
              ))}
            </div>
          )}
        </div>
      }
    >
      {error && <div className="shrink-0"><ErrorBanner message={error} /></div>}
      {capBanner && <div className="mb-3 shrink-0">{capBanner}</div>}

      {loading ? (
        <Center>Loading…</Center>
      ) : searching ? (
        <div className="flex min-h-0 flex-1 flex-col">{list(products)}</div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Chosen-filters row (decided facets, in one row) */}
          {facets.some((f) => facetSel[f.key] !== undefined) && (
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              {facets.map((f, i) =>
                facetSel[f.key] !== undefined ? (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => changeFacet(i)}
                    className="group inline-flex items-center gap-1.5 rounded-pill border border-border-strong bg-subtle px-2.5 py-1 text-[11px] font-medium text-primary hover:border-accent"
                    title="Change"
                  >
                    <span className="text-muted">{f.label}:</span>
                    {facetSel[f.key] === null ? 'Any' : facetSel[f.key]}
                    <span className="text-muted group-hover:text-accent">✎</span>
                  </button>
                ) : null,
              )}
            </div>
          )}

          {/* Active facet (one level at a time) or the product list */}
          {!allDecided && activeFacet ? (
            <div className="min-h-0 flex-1 overflow-auto pr-1">
              <FacetPanel
                index={activeIndex + 1}
                total={facets.length}
                label={activeFacet.label}
                values={activeValues}
                onPick={(v) => pickFacet(activeFacet.key, v)}
              />
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="mb-2 text-[11px] uppercase tracking-wide text-muted">
                {products.length} option{products.length === 1 ? '' : 's'}
                {products.length > LIST_CAP && ` · showing ${LIST_CAP}`}
              </div>
              {list(products)}
            </div>
          )}
        </div>
      )}
    </Frame>
  )
}

// ---------------------------------------------------------------------------

function Frame({
  stepNo,
  totalSteps,
  title,
  hint,
  tools,
  footer,
  children,
}: {
  stepNo: number
  totalSteps: number
  title: string
  hint: string
  tools?: React.ReactNode
  footer?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex h-full flex-col rounded-card border border-border bg-surface p-5">
      <div className="shrink-0">
        <div className="text-meta uppercase tracking-wider text-accent">Step {stepNo} of {totalSteps}</div>
        <h1 className="font-display text-2xl font-bold leading-tight text-primary">{title}</h1>
        <p className="mt-0.5 max-w-2xl text-caption text-muted">{hint}</p>
        {tools && <div className="mt-3">{tools}</div>}
      </div>
      <div className="mt-4 flex min-h-0 flex-1 flex-col">{children}</div>
      {footer && <div className="mt-4 shrink-0 border-t border-border bg-surface pt-4">{footer}</div>}
    </div>
  )
}

function FacetPanel({
  index,
  total,
  label,
  values,
  onPick,
}: {
  index: number
  total: number
  label: string
  values: [string, number][]
  onPick: (v: string | null) => void
}) {
  return (
    <div>
      <div className="mb-3 flex items-baseline gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-soft text-[10px] font-bold text-accent-on-soft">
          {index}
        </span>
        <span className="font-display text-base font-bold text-primary">Choose {label.toLowerCase()}</span>
        <span className="text-[11px] text-muted">
          ({index} of {total})
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <BigChip onClick={() => onPick(null)}>Any {label.toLowerCase()}</BigChip>
        {values.map(([v, n]) => (
          <BigChip key={v} onClick={() => onPick(v)}>
            {v}
            <span className="ml-1.5 text-muted tabular-nums">{n}</span>
          </BigChip>
        ))}
      </div>
    </div>
  )
}

function ProductList({
  products,
  specs,
  isSelected,
  qtyOf,
  onPick,
  onQty,
  hideQty,
  maxQty,
  multi,
  canSelect,
  canIncrement,
}: {
  products: ConfigOption[]
  specs: (o: ConfigOption) => SpecBadge[]
  isSelected: (o: ConfigOption) => boolean
  qtyOf: (o: ConfigOption) => number
  onPick: (o: ConfigOption) => void
  onQty: (o: ConfigOption, q: number) => void
  hideQty?: boolean
  maxQty?: number
  multi?: boolean
  canSelect?: (o: ConfigOption) => boolean
  canIncrement?: (o: ConfigOption, qty: number) => boolean
}) {
  if (products.length === 0) {
    return <Center>No options match — change a filter, or go back and adjust an earlier pick.</Center>
  }
  return (
    <div className="min-h-0 flex-1 overflow-auto pr-1">
      <div className="flex flex-col gap-2">
        {products.slice(0, LIST_CAP).map((o) => {
          const selected = isSelected(o)
          const qty = qtyOf(o)
          const blocked = !selected && canSelect ? !canSelect(o) : false
          const plusDisabled =
            (maxQty != null && qty >= maxQty) || (canIncrement ? !canIncrement(o, qty) : false)
          return (
            <OptionRow
              key={optionKey(o)}
              option={o}
              specs={specs(o)}
              selected={selected}
              qty={qty}
              blocked={blocked}
              hideQty={hideQty}
              multi={multi}
              plusDisabled={plusDisabled}
              onSelect={() => !blocked && onPick(o)}
              onQty={(n) => onQty(o, n)}
              onRemove={() => onPick(o)}
            />
          )
        })}
      </div>
    </div>
  )
}

function OptionRow({
  option,
  specs,
  selected,
  qty,
  blocked,
  hideQty,
  multi,
  plusDisabled,
  onSelect,
  onQty,
  onRemove,
}: {
  option: ConfigOption
  specs: SpecBadge[]
  selected: boolean
  qty: number
  blocked?: boolean
  hideQty?: boolean
  multi?: boolean
  plusDisabled?: boolean
  onSelect: () => void
  onQty: (q: number) => void
  onRemove: () => void
}) {
  const o = option
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={blocked}
      style={selected ? { boxShadow: '0 0 0 3px var(--color-accent-soft)' } : undefined}
      className={cn(
        'group flex flex-col gap-2 rounded-card border bg-surface px-4 py-3 text-left transition-all duration-fast',
        selected
          ? 'border-accent'
          : blocked
            ? 'cursor-not-allowed border-border opacity-50'
            : 'border-border hover:-translate-y-px hover:border-border-strong hover:shadow-hover',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="font-body-strong text-body font-semibold text-primary">{o.label || '—'}</span>
        <span className="shrink-0 font-mono text-body font-bold tabular-nums text-primary">{money(o.price)}</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {o.brand && <Pill tone="neutral">{o.brand}</Pill>}
        {specs.map((s, i) => (
          <Pill key={i} tone={s.tone ?? 'neutral'}>
            {s.text}
          </Pill>
        ))}
        <Pill tone={conditionTone(o.condition)}>{conditionLabel(o.condition)}</Pill>
      </div>
      {selected && !hideQty && (
        <div className="mt-1 flex items-center gap-3 border-t border-border pt-2" onClick={(e) => e.stopPropagation()}>
          <span className="text-[11px] uppercase tracking-wide text-muted">Quantity</span>
          <QtyStepper qty={qty} plusDisabled={plusDisabled} onChange={onQty} />
          <span className="text-caption text-muted">
            line total <b className="font-mono text-secondary">{money((o.price ?? 0) * qty)}</b>
          </span>
          {multi && (
            <button
              type="button"
              onClick={onRemove}
              className="ml-auto text-[11px] font-medium text-muted hover:text-accent"
            >
              Remove
            </button>
          )}
        </div>
      )}
    </button>
  )
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-[5px] px-3 py-1 text-caption font-semibold transition-colors',
        active ? 'bg-primary text-surface' : 'text-secondary hover:bg-subtle',
      )}
    >
      {children}
    </button>
  )
}

function BigChip({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center rounded-control border border-border bg-surface px-3.5 py-2 text-caption font-medium text-primary transition-all duration-fast hover:-translate-y-px hover:border-accent hover:shadow-hover"
    >
      {children}
    </button>
  )
}

function QtyStepper({
  qty,
  plusDisabled,
  onChange,
}: {
  qty: number
  plusDisabled?: boolean
  onChange: (q: number) => void
}) {
  return (
    <div className="inline-flex items-center overflow-hidden rounded-control border border-border">
      <button type="button" className="px-2.5 py-0.5 text-primary hover:bg-subtle" onClick={() => onChange(qty - 1)} aria-label="Decrease quantity">
        −
      </button>
      <span className="w-9 text-center font-mono text-caption tabular-nums">{qty}</span>
      <button
        type="button"
        disabled={plusDisabled}
        className="px-2.5 py-0.5 text-primary hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-40"
        onClick={() => !plusDisabled && onChange(qty + 1)}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  )
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="max-w-sm rounded-card border border-dashed border-border bg-subtle/30 px-6 py-10 text-center text-caption text-muted">
        {children}
      </div>
    </div>
  )
}
