// Generic stock product (cpu / ram / ssd / hdd) — mirrors the per-type Go models.
// Spec fields are plain strings keyed by the config; the fixed fields below are shared.

export type ProductUnit = {
  id: number
  condition_new: boolean
  condition_refurbished: boolean
  price_new: number | null
  price_refurbished: number | null
  remark: string
  created_at: string
  updated_at: string
} & Record<string, unknown>

// Payload sent to create/update (everything except server-assigned fields).
export type ProductInput = Record<string, unknown>
