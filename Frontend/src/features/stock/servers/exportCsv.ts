import type { ServerUnit } from '@/types/server'

// Columns exported to CSV, in order. Price columns are dropped for stock managers.
const BASE_COLS: { key: keyof ServerUnit; header: string }[] = [
  { key: 'id', header: 'ID' },
  { key: 'brand', header: 'BRAND' },
  { key: 'model', header: 'MODEL' },
  { key: 'motherboard', header: 'MOTHER BOARD' },
  { key: 'heat_sink', header: 'HEAT SINK' },
  { key: 'fan', header: 'FAN' },
  { key: 'raid_card', header: 'RAID CARD' },
  { key: 'cards', header: 'CARDS' },
  { key: 'riser_1', header: 'RISER-1' },
  { key: 'riser_2', header: 'RISER-II' },
  { key: 'riser_3', header: 'RISER-III' },
  { key: 'back_plane', header: 'BACK PLANE' },
  { key: 'power_supply', header: 'POWER SUPPLY' },
  { key: 'status', header: 'STATUS' },
  { key: 'condition_new', header: 'CONDITION NEW' },
  { key: 'condition_refurbished', header: 'CONDITION REFURBISHED' },
]

const PRICE_COLS: { key: keyof ServerUnit; header: string }[] = [
  { key: 'price_new', header: 'PRICE NEW' },
  { key: 'price_refurbished', header: 'PRICE REFURBISHED' },
]

const TAIL_COLS: { key: keyof ServerUnit; header: string }[] = [
  { key: 'remark', header: 'REMARK' },
  { key: 'created_at', header: 'CREATED AT' },
  { key: 'updated_at', header: 'UPDATED AT' },
]

// RFC-4180 quoting: wrap in quotes and double any embedded quotes when the value
// contains a comma, quote, or newline.
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const s = typeof value === 'boolean' ? (value ? 'yes' : 'no') : String(value)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * Build a CSV from the given units and trigger a browser download.
 * `includePrice` should be true only for admins — stock managers' prices are
 * already redacted by the backend, but we also omit the columns entirely.
 */
export function exportServersCsv(units: ServerUnit[], opts: { includePrice: boolean }): void {
  const cols = [...BASE_COLS, ...(opts.includePrice ? PRICE_COLS : []), ...TAIL_COLS]
  const lines = [
    cols.map((c) => c.header).join(','),
    ...units.map((u) => cols.map((c) => csvCell(u[c.key])).join(',')),
  ]
  // Prefix BOM so Excel reads UTF-8 correctly.
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `chassis-stock-${units.length}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
