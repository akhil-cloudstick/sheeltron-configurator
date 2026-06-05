import { api, toApiError } from '@/lib/api'
import { listAllProducts } from '@/features/stock/product/productApi'
import { listAllServers } from '@/features/stock/servers/serversApi'

// Bulk price update talks to the real Go backend (POST /api/stock/bulk-price) and
// reuses the existing stock list endpoints to populate the type/filter dropdowns.

export type BulkType = 'chassis' | 'cpu' | 'ram' | 'ssd' | 'hdd'
export type PriceTarget = 'new' | 'refurb' | 'both'
export type Direction = 'increase' | 'decrease'
export type AdjType = 'percent' | 'absolute'

/** Minimal shape we need off a stock unit for the bulk page (prices + filter/label fields). */
export interface BulkUnit {
  id: number
  price_new: number | null
  price_refurbished: number | null
  [k: string]: unknown
}

export interface BulkTypeMeta {
  label: string // "Apply to" option label
  filterField: string // column the Filter dropdown narrows by (backend owns the same map)
  filterLabel: string // human label for the filter
  labelField: string // field used to label a row in the table
  list: () => Promise<BulkUnit[]>
}

export const BULK_TYPES: BulkType[] = ['chassis', 'cpu', 'ram', 'ssd', 'hdd']

export const BULK_TYPE_META: Record<BulkType, BulkTypeMeta> = {
  chassis: {
    label: 'Chassis',
    filterField: 'model',
    filterLabel: 'Model',
    labelField: 'model',
    list: () => listAllServers() as unknown as Promise<BulkUnit[]>,
  },
  cpu: {
    label: 'Processor',
    filterField: 'family',
    filterLabel: 'Family',
    labelField: 'model',
    list: () => listAllProducts('/api/stock/processor') as unknown as Promise<BulkUnit[]>,
  },
  ram: {
    label: 'Memory',
    filterField: 'generation',
    filterLabel: 'Generation',
    labelField: 'product_name',
    list: () => listAllProducts('/api/stock/memory') as unknown as Promise<BulkUnit[]>,
  },
  ssd: {
    label: 'SSD',
    filterField: 'interface',
    filterLabel: 'Interface',
    labelField: 'product_name',
    list: () => listAllProducts('/api/stock/ssd') as unknown as Promise<BulkUnit[]>,
  },
  hdd: {
    label: 'HDD',
    filterField: 'interface',
    filterLabel: 'Interface',
    labelField: 'product_name',
    list: () => listAllProducts('/api/stock/hdd') as unknown as Promise<BulkUnit[]>,
  },
}

export interface BulkPriceRequest {
  type: BulkType
  filter_value: string
  ids?: number[] // explicit allow-list; when set, only these rows are updated
  target: PriceTarget
  direction: Direction
  adjustment_type: AdjType
  adjustment_value: number
  reason: string
}

export interface BulkPriceItem {
  id: number
  label: string
  old_new: number | null
  new_new: number | null
  old_refurb: number | null
  new_refurb: number | null
  changed: boolean // whether any targeted price actually moves for this item
}

export interface BulkPriceResult {
  success: boolean
  committed: boolean
  affected: number
  old_total: number
  new_total: number
  items: BulkPriceItem[]
}

/** Commit a bulk price run (records to the change-log on the backend). */
export async function bulkPriceCommit(req: BulkPriceRequest): Promise<BulkPriceResult> {
  try {
    const res = await api.post<BulkPriceResult>('/api/stock/bulk-price', { ...req, dry_run: false })
    return res.data
  } catch (err) {
    throw toApiError(err)
  }
}

/** Distinct, sorted, non-empty string values of a field across the units. */
export function distinctValues(units: BulkUnit[], field: string): string[] {
  const set = new Set<string>()
  for (const u of units) {
    const v = u[field]
    if (v !== null && v !== undefined && String(v).trim() !== '') set.add(String(v))
  }
  return [...set].sort((a, b) => a.localeCompare(b))
}

/**
 * Adjust one price. MUST stay in sync with the backend (bulk_price.go adjustPrice):
 * percent/flat in the chosen direction, clamped at 0, rounded to 2 decimals.
 */
export function adjustPrice(price: number, direction: Direction, type: AdjType, value: number): number {
  const delta = type === 'percent' ? (price * value) / 100 : value
  let out = direction === 'increase' ? price + delta : price - delta
  if (out < 0) out = 0
  return Math.round(out * 100) / 100
}

export interface PreviewOpts {
  filterField: string
  filterValue: string
  labelField: string
  target: PriceTarget
  direction: Direction
  adjustmentType: AdjType
  adjustmentValue: number
}

/**
 * Client-side preview mirroring the backend. Lists EVERY matching unit (even ones with
 * no price set yet) so the admin sees the full scope; `changed` flags the rows that will
 * actually be updated and `affected` counts them. Totals run over all listed rows.
 */
export function computePreview(units: BulkUnit[], o: PreviewOpts): Omit<BulkPriceResult, 'success' | 'committed'> {
  const touchNew = o.target === 'new' || o.target === 'both'
  const touchRef = o.target === 'refurb' || o.target === 'both'
  const items: BulkPriceItem[] = []
  let oldTotal = 0
  let newTotal = 0
  let affected = 0

  for (const u of units) {
    if (o.filterValue && String(u[o.filterField] ?? '') !== o.filterValue) continue
    const oldNew = u.price_new ?? null
    const oldRef = u.price_refurbished ?? null
    let newNew = oldNew
    let newRef = oldRef
    let changed = false

    // An unset (null) price is treated as 0 so a flat adjustment can seed it from empty.
    if (touchNew) {
      const base = oldNew ?? 0
      const v = adjustPrice(base, o.direction, o.adjustmentType, o.adjustmentValue)
      if (v !== base) {
        newNew = v
        changed = true
      }
    }
    if (touchRef) {
      const base = oldRef ?? 0
      const v = adjustPrice(base, o.direction, o.adjustmentType, o.adjustmentValue)
      if (v !== base) {
        newRef = v
        changed = true
      }
    }

    if (changed) affected += 1
    items.push({
      id: u.id,
      label: String(u[o.labelField] ?? `#${u.id}`),
      old_new: oldNew,
      new_new: newNew,
      old_refurb: oldRef,
      new_refurb: newRef,
      changed,
    })
    oldTotal += (oldNew ?? 0) + (oldRef ?? 0)
    newTotal += (newNew ?? 0) + (newRef ?? 0)
  }

  return { affected, old_total: oldTotal, new_total: newTotal, items }
}
