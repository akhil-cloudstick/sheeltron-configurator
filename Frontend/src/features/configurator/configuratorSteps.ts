import type { Category } from './types'

export interface StepDef {
  category: Category | 'review' | 'save'
  path: string
  label: string
}

// The salesman quote wizard order. Review is the terminal step (its own actions).
export const STEP_ORDER: StepDef[] = [
  { category: 'processor', path: '/configurator/processor', label: 'Processor' },
  { category: 'chassis', path: '/configurator/chassis', label: 'Chassis' },
  { category: 'ram', path: '/configurator/ram', label: 'RAM' },
  { category: 'storage', path: '/configurator/storage', label: 'Storage' },
  { category: 'review', path: '/configurator/review', label: 'Review' },
]

// The admin pack-builder order — same four pickers, then "Save pack" as the terminal step.
export const PACK_STEP_ORDER: StepDef[] = [
  { category: 'processor', path: '/compatibility/build/processor', label: 'Processor' },
  { category: 'chassis', path: '/compatibility/build/chassis', label: 'Chassis' },
  { category: 'ram', path: '/compatibility/build/ram', label: 'RAM' },
  { category: 'storage', path: '/compatibility/build/storage', label: 'Storage' },
  { category: 'save', path: '/compatibility/build/save', label: 'Save pack' },
]

type StoreSlice = {
  processor: unknown | null
  chassis: unknown | null
  ram: unknown | null
  storage: unknown[]
}

/** Whether a picker step has a selection (the terminal step is never "complete" itself). */
export function isComplete(store: StoreSlice, category: Category | 'review' | 'save'): boolean {
  if (category === 'review' || category === 'save') return false
  // Storage is a list (multiple drives) → complete only once at least one is chosen.
  if (category === 'storage') return store.storage.length > 0
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

export function stepIndexFromPath(pathname: string, steps: StepDef[] = STEP_ORDER): number {
  const i = steps.findIndex((s) => pathname.startsWith(s.path))
  return i === -1 ? 0 : i
}
