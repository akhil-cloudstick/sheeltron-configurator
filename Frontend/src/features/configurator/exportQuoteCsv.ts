import type { SavedQuote } from './types'

// RFC-4180 quoting (same rule as the stock CSV export).
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function download(filename: string, body: string): void {
  const blob = new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Export a saved quote (header + line items + totals) as a CSV. */
export function exportQuoteCsv(q: SavedQuote): void {
  const meta = [
    ['Quote', q.quote_number],
    ['Customer', q.customer_name],
    ['Company', q.customer_company],
    ['Email', q.customer_email],
  ].map((r) => r.map(csvCell).join(','))

  const header = ['CATEGORY', 'PART', 'CONDITION', 'QTY', 'UNIT PRICE', 'LINE TOTAL'].join(',')
  const rows = q.lines.map((l) =>
    [l.category, l.label, l.condition, l.qty, l.unit_price, l.line_total].map(csvCell).join(','),
  )
  const totals = [
    ['', '', '', '', 'SUBTOTAL', q.subtotal],
    ['', '', '', '', 'GST 18%', q.gst],
    ['', '', '', '', 'GRAND TOTAL', q.grand_total],
  ].map((r) => r.map(csvCell).join(','))

  download(`${q.quote_number || 'quote'}.csv`, [...meta, '', header, ...rows, '', ...totals].join('\r\n'))
}
