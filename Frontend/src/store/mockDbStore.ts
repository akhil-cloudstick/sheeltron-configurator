import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { buildSeed, SEED_VERSION, type MockDb } from '@/mock/seed'
import type { CatalogEntity, CatalogTypeMap } from '@/types/catalog'
import type {
  BulkPreview,
  BulkPriceConfig,
  BulkPriceRun,
  CompatOverride,
  OverrideKind,
} from '@/types/pricing'
import type { GenericStockRow, StockKind } from '@/types/stock'

// Which MockDb key backs each catalog entity / stock kind.
const CATALOG_KEY: Record<CatalogEntity, keyof MockDb> = {
  chassis: 'chassis', cpus: 'cpus', ram: 'ram', storage: 'storage', network: 'network',
}
const STOCK_KEY: Record<StockKind, keyof MockDb> = {
  cpus: 'stockCpus', ram: 'stockRam', storage: 'stockStorage', network: 'stockNetwork',
}

type PricedRow = { id: number; price_new: number | null; price_refurb: number | null }

interface MockDbState {
  db: MockDb
  seedVersion: number

  // catalog
  listCatalog: <E extends CatalogEntity>(e: E) => CatalogTypeMap[E][]
  createCatalog: <E extends CatalogEntity>(e: E, row: Omit<CatalogTypeMap[E], 'id'>) => CatalogTypeMap[E]
  updateCatalog: <E extends CatalogEntity>(e: E, id: number, patch: Partial<CatalogTypeMap[E]>) => void
  removeCatalog: (e: CatalogEntity, id: number) => void

  // generic stock
  listStock: (k: StockKind) => GenericStockRow[]
  createStock: (k: StockKind, row: Omit<GenericStockRow, 'id'>) => GenericStockRow
  updateStock: (k: StockKind, id: number, patch: Partial<GenericStockRow>) => void
  removeStock: (k: StockKind, id: number) => void

  // overrides
  listOverrides: (kind: OverrideKind) => CompatOverride[]
  createOverride: (row: Omit<CompatOverride, 'id'>) => void
  updateOverride: (id: number, patch: Partial<CompatOverride>) => void
  removeOverride: (id: number) => void

  // bulk pricing
  previewBulk: (cfg: BulkPriceConfig) => BulkPreview
  commitBulk: (cfg: BulkPriceConfig) => BulkPriceRun
  listRuns: () => BulkPriceRun[]

  resetDemo: () => void
}

function nextId(rows: { id: number }[]): number {
  return rows.reduce((m, r) => Math.max(m, r.id), 0) + 1
}

function rowLabel(e: CatalogEntity, row: Record<string, unknown>): string {
  if (e === 'chassis') return String(row.model_name ?? row.sku)
  if (e === 'cpus') return String(row.sku)
  return String(row.label ?? row.sku)
}

function adjust(value: number, cfg: BulkPriceConfig): number {
  const next =
    cfg.adjustmentType === 'percent'
      ? value * (1 + cfg.adjustmentValue / 100)
      : value + cfg.adjustmentValue
  return Math.max(0, Math.round(next))
}

function matchesFilter(cfg: BulkPriceConfig, row: Record<string, unknown>): boolean {
  if (!cfg.filterField || !cfg.filterValue) return true
  return String(row[cfg.filterField] ?? '') === cfg.filterValue
}

function computePreview(db: MockDb, cfg: BulkPriceConfig): BulkPreview {
  const rows = (db[CATALOG_KEY[cfg.entity]] as unknown as PricedRow[]).filter((r) =>
    matchesFilter(cfg, r as unknown as Record<string, unknown>),
  )
  const touchNew = cfg.target === 'new' || cfg.target === 'both'
  const touchRefurb = cfg.target === 'refurb' || cfg.target === 'both'

  let oldTotal = 0
  let newTotal = 0
  const items = rows
    .map((r) => {
      const newNew = touchNew && r.price_new != null ? adjust(r.price_new, cfg) : r.price_new
      const newRefurb =
        touchRefurb && r.price_refurb != null ? adjust(r.price_refurb, cfg) : r.price_refurb
      const changed = newNew !== r.price_new || newRefurb !== r.price_refurb
      if (!changed) return null
      if (touchNew && r.price_new != null) {
        oldTotal += r.price_new
        newTotal += newNew ?? 0
      }
      if (touchRefurb && r.price_refurb != null) {
        oldTotal += r.price_refurb
        newTotal += newRefurb ?? 0
      }
      return {
        id: r.id,
        label: rowLabel(cfg.entity, r as unknown as Record<string, unknown>),
        oldNew: r.price_new,
        newNew,
        oldRefurb: r.price_refurb,
        newRefurb,
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  return { affectedCount: items.length, oldTotal, newTotal, items }
}

function scopeLabel(cfg: BulkPriceConfig): string {
  const scope = cfg.filterField && cfg.filterValue ? `${cfg.filterField}=${cfg.filterValue}` : 'all'
  const adj =
    cfg.adjustmentType === 'percent'
      ? `${cfg.adjustmentValue > 0 ? '+' : ''}${cfg.adjustmentValue}%`
      : `${cfg.adjustmentValue > 0 ? '+₹' : '-₹'}${Math.abs(cfg.adjustmentValue)}`
  return `${cfg.entity} · ${scope} · ${cfg.target} · ${adj}`
}

export const useMockDb = create<MockDbState>()(
  persist(
    (set, get) => ({
      db: buildSeed(),
      seedVersion: SEED_VERSION,

      listCatalog: (e) => get().db[CATALOG_KEY[e]] as never,
      createCatalog: (e, row) => {
        const key = CATALOG_KEY[e]
        const arr = get().db[key] as { id: number }[]
        const created = { ...(row as object), id: nextId(arr) } as never
        set((s) => ({ db: { ...s.db, [key]: [created, ...arr] } }))
        return created
      },
      updateCatalog: (e, id, patch) => {
        const key = CATALOG_KEY[e]
        set((s) => ({
          db: {
            ...s.db,
            [key]: (s.db[key] as { id: number }[]).map((r) =>
              r.id === id ? { ...r, ...(patch as object) } : r,
            ),
          },
        }))
      },
      removeCatalog: (e, id) => {
        const key = CATALOG_KEY[e]
        set((s) => ({
          db: { ...s.db, [key]: (s.db[key] as { id: number }[]).filter((r) => r.id !== id) },
        }))
      },

      listStock: (k) => get().db[STOCK_KEY[k]] as GenericStockRow[],
      createStock: (k, row) => {
        const key = STOCK_KEY[k]
        const arr = get().db[key] as GenericStockRow[]
        const created: GenericStockRow = { ...row, id: nextId(arr) }
        set((s) => ({ db: { ...s.db, [key]: [created, ...arr] } }))
        return created
      },
      updateStock: (k, id, patch) => {
        const key = STOCK_KEY[k]
        set((s) => ({
          db: {
            ...s.db,
            [key]: (s.db[key] as GenericStockRow[]).map((r) =>
              r.id === id ? { ...r, ...patch } : r,
            ),
          },
        }))
      },
      removeStock: (k, id) => {
        const key = STOCK_KEY[k]
        set((s) => ({
          db: { ...s.db, [key]: (s.db[key] as GenericStockRow[]).filter((r) => r.id !== id) },
        }))
      },

      listOverrides: (kind) => get().db.overrides.filter((o) => o.kind === kind),
      createOverride: (row) =>
        set((s) => ({
          db: { ...s.db, overrides: [{ ...row, id: nextId(s.db.overrides) }, ...s.db.overrides] },
        })),
      updateOverride: (id, patch) =>
        set((s) => ({
          db: {
            ...s.db,
            overrides: s.db.overrides.map((o) => (o.id === id ? { ...o, ...patch } : o)),
          },
        })),
      removeOverride: (id) =>
        set((s) => ({ db: { ...s.db, overrides: s.db.overrides.filter((o) => o.id !== id) } })),

      previewBulk: (cfg) => computePreview(get().db, cfg),
      commitBulk: (cfg) => {
        const preview = computePreview(get().db, cfg)
        const key = CATALOG_KEY[cfg.entity]
        const changes = new Map(preview.items.map((i) => [i.id, i]))
        set((s) => ({
          db: {
            ...s.db,
            [key]: (s.db[key] as unknown as PricedRow[]).map((r) => {
              const c = changes.get(r.id)
              return c ? { ...r, price_new: c.newNew, price_refurb: c.newRefurb } : r
            }),
          },
        }))
        const run: BulkPriceRun = {
          id: nextId(get().db.runs),
          entity: cfg.entity,
          scopeLabel: scopeLabel(cfg),
          target: cfg.target,
          adjustmentType: cfg.adjustmentType,
          adjustmentValue: cfg.adjustmentValue,
          affectedCount: preview.affectedCount,
          reason: cfg.reason,
          runAt: new Date().toISOString(),
        }
        set((s) => ({ db: { ...s.db, runs: [run, ...s.db.runs] } }))
        return run
      },
      listRuns: () => get().db.runs,

      resetDemo: () => set({ db: buildSeed(), seedVersion: SEED_VERSION }),
    }),
    {
      name: 'sheeltron.mockdb',
      // If the seed shape changed, discard persisted data and rebuild.
      migrate: (persisted: unknown) => {
        const p = persisted as { seedVersion?: number } | undefined
        if (!p || p.seedVersion !== SEED_VERSION) {
          return { db: buildSeed(), seedVersion: SEED_VERSION } as never
        }
        return persisted as never
      },
      version: SEED_VERSION,
    },
  ),
)
