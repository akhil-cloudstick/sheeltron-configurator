import type { ServerUnit } from '@/types/server'

export interface ActiveFilter {
  field: string
  value: string
}

// Fields offered in the dynamic "Add filter" picker — every meaningful field
// except unique ids / free-form / housekeeping columns. `condition` is special-cased
// (it maps to the two boolean columns, not a single string field).
export const FILTERABLE_FIELDS: { key: string; label: string }[] = [
  { key: 'brand', label: 'Brand' },
  { key: 'model', label: 'Model' },
  { key: 'condition', label: 'Condition' },
  { key: 'status', label: 'Status' },
  { key: 'motherboard', label: 'Motherboard' },
  { key: 'heat_sink', label: 'Heat sink' },
  { key: 'raid_card', label: 'RAID card' },
  { key: 'power_supply', label: 'Power supply' },
  { key: 'back_plane', label: 'Back plane' },
]

// Columns the free-text search box matches against.
const SEARCH_FIELDS: (keyof ServerUnit)[] = ['brand', 'model']

export function fieldLabel(key: string): string {
  return FILTERABLE_FIELDS.find((f) => f.key === key)?.label ?? key
}

// Conditions a unit currently has, as filterable string values.
function conditionsOf(row: ServerUnit): string[] {
  const out: string[] = []
  if (row.condition_new) out.push('new')
  if (row.condition_refurbished) out.push('refurbished')
  return out
}

/** Distinct, sorted, non-empty values present for a field across the dataset. */
export function distinctValues(data: ServerUnit[], field: string): string[] {
  if (field === 'condition') {
    const set = new Set<string>()
    for (const row of data) conditionsOf(row).forEach((c) => set.add(c))
    return [...set].sort((a, b) => a.localeCompare(b))
  }
  const set = new Set<string>()
  for (const row of data) {
    const v = (row as unknown as Record<string, unknown>)[field]
    if (v !== null && v !== undefined && String(v).trim() !== '') set.add(String(v))
  }
  return [...set].sort((a, b) => a.localeCompare(b))
}

/** Apply the search box + all active filters (AND) to the dataset. */
export function applyChassisFilters(
  data: ServerUnit[],
  search: string,
  filters: ActiveFilter[],
): ServerUnit[] {
  const needle = search.trim().toLowerCase()
  return data.filter((row) => {
    if (needle) {
      const hit = SEARCH_FIELDS.some((f) => String(row[f] ?? '').toLowerCase().includes(needle))
      if (!hit) return false
    }
    for (const f of filters) {
      if (!f.value) continue
      if (f.field === 'condition') {
        if (!conditionsOf(row).includes(f.value)) return false
      } else if (String((row as unknown as Record<string, unknown>)[f.field] ?? '') !== f.value) {
        return false
      }
    }
    return true
  })
}
