// Shared types for the salesman configurator wizard.

export type Condition = 'new' | 'refurbished' | 'unset'

export type Category = 'processor' | 'chassis' | 'ram' | 'storage'

// One selectable wizard option = a catalog row × one condition (mirrors the backend
// ConfigOption DTO from /api/configurator/*).
export interface ConfigOption {
  stock_id: number
  kind: string // cpu | chassis | ram | ssd | hdd
  brand: string
  label: string
  condition: Condition
  price: number | null
  socket?: string
  family?: string
  series?: string
  cores?: string
  threads?: string
  ram_type?: string
  drive_form_factors?: string
  max_sockets?: number | null
  capacity?: string
  speed?: string
  interface?: string
  form_factor?: string
  type?: string // storage: HDD | SSD | NVMe
}

/** Stable identity for an option (row + chosen condition). */
export function optionKey(o: ConfigOption): string {
  return `${o.kind}-${o.stock_id}-${o.condition}`
}

export interface Selection {
  option: ConfigOption
  qty: number
}

export interface Customer {
  name: string
  company: string
  email: string
}

export interface QuoteLine {
  category: Category
  stock_id: number
  label: string
  condition: Condition
  qty: number
  unit_price: number | null
}

export interface QuotePayload {
  customer_name: string
  customer_company: string
  customer_email: string
  lines: QuoteLine[]
}

export interface SavedQuoteLine {
  category: string
  stock_id: number
  label: string
  condition: string
  qty: number
  unit_price: number
  line_total: number
}

export interface SavedQuote {
  id: number
  quote_number: string
  customer_name: string
  customer_company: string
  customer_email: string
  lines: SavedQuoteLine[]
  subtotal: number
  gst: number
  grand_total: number
  created_by: string
  created_at: string
}

export const GST_RATE = 0.18

// --- Compatible packs (admin-built bundles a salesman can pick) ---------------

// One line on a pack: the full chosen option snapshot + qty (mirrors the backend
// PackLine). line_total is filled by the backend on read.
export interface PackLine {
  category: Category
  qty: number
  option: ConfigOption
  line_total?: number
}

export interface PackPayload {
  name: string
  description: string
  lines: { category: Category; qty: number; option: ConfigOption }[]
}

export interface SavedPack {
  id: number
  pack_number: string
  name: string
  description: string
  lines: PackLine[]
  subtotal: number
  gst: number
  grand_total: number
  created_by: string
  created_at: string
}
