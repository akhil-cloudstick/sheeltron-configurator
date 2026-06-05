import { create } from 'zustand'
import type { Category, ConfigOption, Customer, Selection } from '@/features/configurator/types'
import { GST_RATE } from '@/features/configurator/types'

// The build is deliberately session-only — it lives in memory and starts empty on
// every page load. A refresh, a fresh visit, or a saved quote should never leave a
// stale configuration in the rail. Drop any config persisted by older builds.
const LEGACY_PERSIST_KEY = 'sheeltron.configurator'
if (typeof localStorage !== 'undefined') localStorage.removeItem(LEGACY_PERSIST_KEY)

interface ConfiguratorState {
  processor: Selection | null
  chassis: Selection | null
  ram: Selection | null
  storage: Selection | null
  customer: Customer

  select: (category: Category, option: ConfigOption) => void
  setQty: (category: Category, qty: number) => void
  clear: (category: Category) => void
  setCustomer: (patch: Partial<Customer>) => void
  reset: () => void
}

const EMPTY_CUSTOMER: Customer = { name: '', company: '', email: '' }

export const useConfiguratorStore = create<ConfiguratorState>()((set) => ({
  processor: null,
  chassis: null,
  ram: null,
  storage: null,
  customer: EMPTY_CUSTOMER,

  // Selecting a part applies the explorer's reset cascade: changing the CPU clears
  // chassis + spares; changing the chassis clears the spares.
  select: (category, option) =>
    set((s) => {
      const sel: Selection = { option, qty: s[category]?.qty ?? 1 }
      if (category === 'processor') {
        return { processor: sel, chassis: null, ram: null, storage: null }
      }
      if (category === 'chassis') {
        return { chassis: sel, ram: null, storage: null }
      }
      return { [category]: sel } as Pick<ConfiguratorState, Category>
    }),

  setQty: (category, qty) =>
    set((s) => {
      const cur = s[category]
      if (!cur) return {}
      return { [category]: { ...cur, qty: Math.max(1, qty) } } as Pick<ConfiguratorState, Category>
    }),

  clear: (category) => set({ [category]: null } as Pick<ConfiguratorState, Category>),

  setCustomer: (patch) => set((s) => ({ customer: { ...s.customer, ...patch } })),

  reset: () =>
    set({ processor: null, chassis: null, ram: null, storage: null, customer: EMPTY_CUSTOMER }),
}))

/** Derived line items (in BOM order), skipping empty slots. */
export function selectionLines(s: {
  processor: Selection | null
  chassis: Selection | null
  ram: Selection | null
  storage: Selection | null
}): { category: Category; sel: Selection }[] {
  const order: Category[] = ['processor', 'chassis', 'ram', 'storage']
  return order
    .map((category) => ({ category, sel: s[category] }))
    .filter((x): x is { category: Category; sel: Selection } => x.sel !== null)
}

export function lineTotal(sel: Selection): number {
  return (sel.option.price ?? 0) * sel.qty
}

export function quoteTotals(lines: { sel: Selection }[]): {
  subtotal: number
  gst: number
  grand: number
  hasUnpriced: boolean
} {
  const subtotal = lines.reduce((sum, l) => sum + lineTotal(l.sel), 0)
  const gst = subtotal * GST_RATE
  const hasUnpriced = lines.some((l) => l.sel.option.price == null)
  return { subtotal, gst, grand: subtotal + gst, hasUnpriced }
}
