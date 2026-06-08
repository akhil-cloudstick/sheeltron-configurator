import { create } from 'zustand'
import type { Category, ConfigOption, Customer, Selection } from '@/features/configurator/types'
import { GST_RATE, optionKey, allowedChassisSockets } from '@/features/configurator/types'

// The build is deliberately session-only — it lives in memory and starts empty on
// every page load. A refresh, a fresh visit, or a saved quote should never leave a
// stale configuration in the rail. Drop any config persisted by older builds.
const LEGACY_PERSIST_KEY = 'sheeltron.configurator'
if (typeof localStorage !== 'undefined') localStorage.removeItem(LEGACY_PERSIST_KEY)

// processor/chassis/ram are single picks; storage is a list (multiple drives, each
// with its own qty, capped by the chassis drive bays). `units` multiplies the whole
// configuration on the quote (N identical servers).
interface ConfiguratorState {
  processor: Selection | null
  chassis: Selection | null
  ram: Selection | null
  storage: Selection[]
  units: number
  customer: Customer

  select: (category: Category, option: ConfigOption) => void
  setQty: (category: Category, qty: number) => void
  clear: (category: Category) => void
  toggleStorage: (option: ConfigOption) => void
  setStorageQty: (key: string, qty: number) => void
  setUnits: (units: number) => void
  setCustomer: (patch: Partial<Customer>) => void
  loadFromPack: (lines: { category: Category; qty: number; option: ConfigOption }[]) => void
  reset: () => void
}

const EMPTY_CUSTOMER: Customer = { name: '', company: '', email: '' }

export const useConfiguratorStore = create<ConfiguratorState>()((set) => ({
  processor: null,
  chassis: null,
  ram: null,
  storage: [],
  units: 1,
  customer: EMPTY_CUSTOMER,

  // Selecting a part applies the explorer's reset cascade: changing the CPU clears
  // chassis + spares; changing the chassis clears the spares. (Storage is a list, so
  // it resets to []). Storage itself is managed via toggleStorage/setStorageQty.
  select: (category, option) =>
    set((s) => {
      if (category === 'storage') return {} // storage uses toggleStorage
      const sel: Selection = { option, qty: s[category]?.qty ?? 1 }
      if (category === 'processor') {
        return { processor: sel, chassis: null, ram: null, storage: [] }
      }
      if (category === 'chassis') {
        return { chassis: sel, ram: null, storage: [] }
      }
      return { [category]: sel } as Pick<ConfiguratorState, 'ram'>
    }),

  setQty: (category, qty) =>
    set((s) => {
      if (category === 'storage') return {}
      const cur = s[category]
      if (!cur) return {}
      const nq = Math.max(1, qty)
      if (category === 'processor') {
        // Changing the CPU count changes which chassis socket counts are valid. If the
        // chosen chassis no longer fits, drop it (and the spares derived from it).
        const sock = s.chassis?.option.max_sockets
        const stillFits = s.chassis != null && sock != null && allowedChassisSockets(nq).includes(sock)
        return s.chassis && !stillFits
          ? { processor: { ...cur, qty: nq }, chassis: null, ram: null, storage: [] }
          : { processor: { ...cur, qty: nq } }
      }
      return { [category]: { ...cur, qty: nq } } as Pick<ConfiguratorState, 'ram'>
    }),

  // Clearing a pick cascades like selecting: dropping the CPU invalidates the chassis +
  // spares, dropping the chassis invalidates the spares (their compatibility was derived
  // from it). Removing a single storage drive uses toggleStorage, not clear.
  clear: (category) =>
    set(() => {
      if (category === 'processor') return { processor: null, chassis: null, ram: null, storage: [] }
      if (category === 'chassis') return { chassis: null, ram: null, storage: [] }
      if (category === 'storage') return { storage: [] }
      return { [category]: null } as Pick<ConfiguratorState, 'ram'>
    }),

  // Add the drive if new, otherwise remove it (toggle). Keyed by optionKey so the same
  // SKU in New vs Refurbished are distinct lines.
  toggleStorage: (option) =>
    set((s) => {
      const key = optionKey(option)
      const exists = s.storage.some((sel) => optionKey(sel.option) === key)
      return {
        storage: exists
          ? s.storage.filter((sel) => optionKey(sel.option) !== key)
          : [...s.storage, { option, qty: 1 }],
      }
    }),

  setStorageQty: (key, qty) =>
    set((s) => ({
      storage: s.storage.map((sel) =>
        optionKey(sel.option) === key ? { ...sel, qty: Math.max(1, qty) } : sel,
      ),
    })),

  setUnits: (units) => set({ units: Math.max(1, Math.floor(units) || 1) }),

  setCustomer: (patch) => set((s) => ({ customer: { ...s.customer, ...patch } })),

  // Replace the whole build from an admin-saved pack (salesman "use this pack" flow).
  // Starts from a clean slate so leftover picks never bleed in.
  loadFromPack: (lines) =>
    set(() => {
      const next: {
        processor: Selection | null
        chassis: Selection | null
        ram: Selection | null
        storage: Selection[]
      } = { processor: null, chassis: null, ram: null, storage: [] }
      for (const l of lines) {
        const sel: Selection = { option: l.option, qty: Math.max(1, l.qty) }
        if (l.category === 'storage') next.storage.push(sel)
        else next[l.category] = sel
      }
      return next
    }),

  reset: () =>
    set({ processor: null, chassis: null, ram: null, storage: [], units: 1, customer: EMPTY_CUSTOMER }),
}))

type StoreSlots = {
  processor: Selection | null
  chassis: Selection | null
  ram: Selection | null
  storage: Selection[]
}

/** Derived line items (BOM order); storage expands to one line per drive. */
export function selectionLines(s: StoreSlots): { category: Category; sel: Selection; key: string }[] {
  const out: { category: Category; sel: Selection; key: string }[] = []
  if (s.processor) out.push({ category: 'processor', sel: s.processor, key: 'processor' })
  if (s.chassis) out.push({ category: 'chassis', sel: s.chassis, key: 'chassis' })
  if (s.ram) out.push({ category: 'ram', sel: s.ram, key: 'ram' })
  for (const sel of s.storage) {
    out.push({ category: 'storage', sel, key: `storage-${optionKey(sel.option)}` })
  }
  return out
}

export function lineTotal(sel: Selection): number {
  return (sel.option.price ?? 0) * sel.qty
}

/** Totals over the line items, scaled by `units` identical configurations. */
export function quoteTotals(
  lines: { sel: Selection }[],
  units = 1,
): { subtotal: number; gst: number; grand: number; hasUnpriced: boolean } {
  const perUnit = lines.reduce((sum, l) => sum + lineTotal(l.sel), 0)
  const subtotal = perUnit * Math.max(1, units)
  const gst = subtotal * GST_RATE
  const hasUnpriced = lines.some((l) => l.sel.option.price == null)
  return { subtotal, gst, grand: subtotal + gst, hasUnpriced }
}

// --- RAM / storage usage helpers (for the step cap banners) -------------------

export function ramSlotsUsed(s: StoreSlots): number {
  return s.ram ? s.ram.qty : 0
}

export function ramGbUsed(s: StoreSlots): number {
  return s.ram ? (s.ram.option.capacity_gb ?? 0) * s.ram.qty : 0
}

export function storageBaysUsed(s: StoreSlots): number {
  return s.storage.reduce((n, sel) => n + sel.qty, 0)
}
