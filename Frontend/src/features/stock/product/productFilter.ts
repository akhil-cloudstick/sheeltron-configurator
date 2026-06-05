import type { ProductUnit } from '@/types/product'
import type { FieldDef } from './productConfig'

export interface ActiveFilter {
  field: string
  value: string
}

// Conditions a unit currently has, as filterable string values.
function conditionsOf(row: ProductUnit): string[] {
  const out: string[] = []
  if (row.condition_new) out.push('new')
  if (row.condition_refurbished) out.push('refurbished')
  return out
}

export function fieldLabel(fields: FieldDef[], key: string): string {
  return fields.find((f) => f.key === key)?.label ?? key
}

/** Distinct, sorted, non-empty values present for a field across the dataset. */
export function distinctValues(data: ProductUnit[], field: string): string[] {
  if (field === 'condition') {
    const set = new Set<string>()
    for (const row of data) conditionsOf(row).forEach((c) => set.add(c))
    return [...set].sort((a, b) => a.localeCompare(b))
  }
  const set = new Set<string>()
  for (const row of data) {
    const v = row[field]
    if (v !== null && v !== undefined && String(v).trim() !== '') set.add(String(v))
  }
  return [...set].sort((a, b) => a.localeCompare(b))
}

/** Apply the search box + all active filters (AND) to the dataset. */
export function applyProductFilters(
  data: ProductUnit[],
  search: string,
  filters: ActiveFilter[],
  searchFields: string[],
): ProductUnit[] {
  const needle = search.trim().toLowerCase()
  return data.filter((row) => {
    if (needle) {
      const hit = searchFields.some((f) => String(row[f] ?? '').toLowerCase().includes(needle))
      if (!hit) return false
    }
    for (const f of filters) {
      if (!f.value) continue
      if (f.field === 'condition') {
        if (!conditionsOf(row).includes(f.value)) return false
      } else if (String(row[f.field] ?? '') !== f.value) {
        return false
      }
    }
    return true
  })
}
