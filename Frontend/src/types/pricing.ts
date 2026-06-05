import type { CatalogEntity } from './catalog'

// ---- Bulk price runs (mock) ---------------------------------------------

export type PriceTarget = 'new' | 'refurb' | 'both'
export type AdjustmentType = 'percent' | 'absolute'

export interface BulkPriceConfig {
  entity: CatalogEntity
  filterField: string // '' = no filter (e.g. 'brand' | 'vendor' | 'type')
  filterValue: string
  target: PriceTarget
  adjustmentType: AdjustmentType
  adjustmentValue: number
  reason: string
}

export interface BulkPreviewItem {
  id: number
  label: string
  oldNew: number | null
  newNew: number | null
  oldRefurb: number | null
  newRefurb: number | null
}

export interface BulkPreview {
  affectedCount: number
  oldTotal: number
  newTotal: number
  items: BulkPreviewItem[]
}

export interface BulkPriceRun {
  id: number
  entity: CatalogEntity
  scopeLabel: string
  target: PriceTarget
  adjustmentType: AdjustmentType
  adjustmentValue: number
  affectedCount: number
  reason: string
  runAt: string
}

// ---- Compatibility overrides (mock) -------------------------------------

export type OverrideKind = 'cpu' | 'ram'

export interface CompatOverride {
  id: number
  kind: OverrideKind
  chassisId: number
  targetId: number // cpu id or ram id depending on kind
  isCompatible: boolean // true = force allow, false = force block
  note: string
}
