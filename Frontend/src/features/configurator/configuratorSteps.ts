import type { Category } from './types'

export interface StepDef {
  category: Category | 'review'
  path: string
  label: string
}

// The fixed wizard order. Review is the terminal step (its own actions).
export const STEP_ORDER: StepDef[] = [
  { category: 'processor', path: '/configurator/processor', label: 'Processor' },
  { category: 'chassis', path: '/configurator/chassis', label: 'Chassis' },
  { category: 'ram', path: '/configurator/ram', label: 'RAM' },
  { category: 'storage', path: '/configurator/storage', label: 'Storage' },
  { category: 'review', path: '/configurator/review', label: 'Review' },
]

type StoreSlice = {
  processor: unknown | null
  chassis: unknown | null
  ram: unknown | null
  storage: unknown | null
}

/** Whether a picker step has a selection (Review is never "complete" itself). */
export function isComplete(store: StoreSlice, category: Category | 'review'): boolean {
  if (category === 'review') return false
  return store[category] != null
}

/**
 * Highest step index the rep may currently sit on. You can be on any step whose
 * predecessors are all complete. All four picker steps are required before Review.
 */
export function maxReachableIndex(store: StoreSlice): number {
  for (let i = 0; i < STEP_ORDER.length; i++) {
    const prev = STEP_ORDER[i - 1]
    if (prev && !isComplete(store, prev.category)) return i - 1
  }
  return STEP_ORDER.length - 1
}

export function stepIndexFromPath(pathname: string): number {
  const i = STEP_ORDER.findIndex((s) => pathname.startsWith(s.path))
  return i === -1 ? 0 : i
}
