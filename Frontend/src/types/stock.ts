// Generic (mock) stock inventory rows for CPU / RAM / Storage / Network.
// Servers have their own typed model (types/server.ts) and a real backend.

export type StockKind = 'cpus' | 'ram' | 'storage' | 'network'

export type StockCondition = 'new' | 'refurb'
export type StockState = 'in_stock' | 'allocated' | 'rma' | 'scrap'

export interface GenericStockRow {
  id: number
  sku: string
  label: string
  condition: StockCondition
  quantity: number
  location: string
  state: StockState
  remark: string
  // entity-specific spec, e.g. socket / capacity / interface / speed
  spec: string
}

export const STOCK_STATES: StockState[] = ['in_stock', 'allocated', 'rma', 'scrap']
export const STOCK_CONDITIONS: StockCondition[] = ['new', 'refurb']
