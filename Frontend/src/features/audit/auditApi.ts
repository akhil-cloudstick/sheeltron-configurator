import { api, toApiError } from '@/lib/api'

export interface IssueRow {
  id: number
  product_type: string
  product_id: number
  label: string
  missing_fields: string[]
  created_at: string
}

export interface ChangeLogChange {
  field: string
  old: string
  new: string
}

export interface ChangeLogRow {
  id: number
  product_type: string
  product_id: number
  label: string
  source: string
  action: string
  actor: string // admin | stock_manager | system
  changes: ChangeLogChange[]
  reason?: string // free-text justification; present only for bulk price runs
  changed_at: string
}

export function actorLabel(actor: string): string {
  if (actor === 'super_admin') return 'Super admin'
  if (actor === 'admin') return 'Admin'
  if (actor === 'stock_manager') return 'Stock manager'
  return actor ? actor : 'System'
}

interface ListEnvelope<T> {
  success: boolean
  data: T[]
}

/** Local YYYY-MM-DD for today — the default value for the date filter. */
export function todayStr(): string {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

/**
 * Half-open instant range [from, to) covering a single local calendar day
 * (YYYY-MM-DD). Empty date → no bounds (all dates). Computed in the browser's
 * timezone so the day lines up with what the user sees.
 */
export function dayRange(date: string): { from?: string; to?: string } {
  if (!date) return {}
  const start = new Date(`${date}T00:00:00`)
  if (Number.isNaN(start.getTime())) return {}
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { from: start.toISOString(), to: end.toISOString() }
}

export async function listIssues(
  params: { productType?: string; from?: string; to?: string } = {},
): Promise<IssueRow[]> {
  try {
    const res = await api.get<ListEnvelope<IssueRow>>('/api/issues', {
      params: {
        product_type: params.productType || undefined,
        from: params.from || undefined,
        to: params.to || undefined,
      },
    })
    return res.data.data ?? []
  } catch (err) {
    throw toApiError(err)
  }
}

export async function listChangeLogs(
  params: { productType?: string; from?: string; to?: string; limit?: number },
): Promise<ChangeLogRow[]> {
  try {
    const res = await api.get<ListEnvelope<ChangeLogRow>>('/api/change-logs', {
      params: {
        product_type: params.productType || undefined,
        from: params.from || undefined,
        to: params.to || undefined,
        limit: params.limit ?? 500,
      },
    })
    return res.data.data ?? []
  } catch (err) {
    throw toApiError(err)
  }
}

// Maps the backend product_type to its frontend stock route + display label.
export const PRODUCT_TYPE_META: Record<string, { label: string; route: string }> = {
  chassis: { label: 'Chassis', route: '/stock/chassis' },
  cpu: { label: 'Processor', route: '/stock/processor' },
  ram: { label: 'Memory', route: '/stock/memory' },
  ssd: { label: 'SSD', route: '/stock/ssd' },
  hdd: { label: 'HDD', route: '/stock/hdd' },
}

export function productTypeLabel(t: string): string {
  return PRODUCT_TYPE_META[t]?.label ?? t
}
