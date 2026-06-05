import type { Condition } from './types'

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

/** Format a price; null/undefined → "Price on request". */
export function money(v: number | null | undefined): string {
  return v === null || v === undefined ? 'Price on request' : inr.format(v)
}

export function conditionLabel(c: Condition): string {
  return c === 'new' ? 'New' : c === 'refurbished' ? 'Refurbished' : 'No condition set'
}

export function conditionTone(c: Condition): 'success' | 'warning' | 'neutral' {
  return c === 'new' ? 'success' : c === 'refurbished' ? 'warning' : 'neutral'
}
