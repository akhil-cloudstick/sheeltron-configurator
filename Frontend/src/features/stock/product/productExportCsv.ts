import type { ProductUnit } from '@/types/product'
import type { ProductConfig } from './productConfig'

// RFC-4180 quoting.
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const s = typeof value === 'boolean' ? (value ? 'yes' : 'no') : String(value)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * Export selected product rows to CSV (client-side). Columns: id, every form field,
 * conditions, prices (only when includePrice — admins), remark, timestamps.
 */
export function exportProductsCsv(
  config: ProductConfig,
  units: ProductUnit[],
  opts: { includePrice: boolean },
): void {
  const cols: { key: string; header: string }[] = [
    { key: 'id', header: 'ID' },
    ...config.formFields.map((f) => ({ key: f.key, header: f.label.toUpperCase() })),
    { key: 'condition_new', header: 'CONDITION NEW' },
    { key: 'condition_refurbished', header: 'CONDITION REFURBISHED' },
    ...(opts.includePrice
      ? [
          { key: 'price_new', header: 'PRICE NEW' },
          { key: 'price_refurbished', header: 'PRICE REFURBISHED' },
        ]
      : []),
    { key: 'remark', header: 'REMARK' },
    { key: 'created_at', header: 'CREATED AT' },
    { key: 'updated_at', header: 'UPDATED AT' },
  ]
  const lines = [
    cols.map((c) => c.header).join(','),
    ...units.map((u) => cols.map((c) => csvCell(u[c.key])).join(',')),
  ]
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${config.key}-stock-${units.length}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
