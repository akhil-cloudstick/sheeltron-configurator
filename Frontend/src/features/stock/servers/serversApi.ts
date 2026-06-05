import { api, toApiError } from '@/lib/api'
import type {
  ApiListResponse,
  ApiMessage,
  ApiSingle,
  BulkDeleteResult,
  ImportResult,
  ServerListParams,
  ServerUnit,
  ServerUnitInput,
} from '@/types/server'

const BASE = '/api/stock/servers'

/** List with optional filters + pagination. Always sends page/limit so the
 *  paginated `response` envelope (with total) comes back. */
export async function listServers(
  params: ServerListParams,
): Promise<{ data: ServerUnit[]; total: number; page: number; limit: number }> {
  try {
    const res = await api.get<ApiListResponse<ServerUnit>>(BASE, {
      params: {
        q: params.q || undefined,
        brand: params.brand || undefined,
        model: params.model || undefined,
        status: params.status || undefined,
        page: params.page ?? 1,
        limit: params.limit ?? 50,
      },
    })
    const r = res.data.response
    return { data: r.data ?? [], total: r.total, page: r.page, limit: r.limit }
  } catch (err) {
    throw toApiError(err)
  }
}

/** Fetch every server unit (no pagination — backend returns all when page/limit omitted).
 *  The Chassis UI does search / filtering / paging client-side over this set. */
export async function listAllServers(): Promise<ServerUnit[]> {
  try {
    const res = await api.get<ApiListResponse<ServerUnit>>(BASE)
    return res.data.response?.data ?? []
  } catch (err) {
    throw toApiError(err)
  }
}

export async function getServer(id: number): Promise<ServerUnit> {
  try {
    const res = await api.get<ApiSingle<ServerUnit>>(`${BASE}/${id}`)
    return res.data.data
  } catch (err) {
    throw toApiError(err)
  }
}

export async function createServer(input: ServerUnitInput): Promise<ServerUnit> {
  try {
    const res = await api.post<ApiSingle<ServerUnit>>(BASE, input)
    return res.data.data
  } catch (err) {
    throw toApiError(err)
  }
}

export async function updateServer(id: number, input: ServerUnitInput): Promise<ServerUnit> {
  try {
    const res = await api.put<ApiSingle<ServerUnit>>(`${BASE}/${id}`, input)
    return res.data.data
  } catch (err) {
    throw toApiError(err)
  }
}

export async function deleteServer(id: number): Promise<void> {
  try {
    await api.delete<ApiMessage>(`${BASE}/${id}`)
  } catch (err) {
    throw toApiError(err)
  }
}

/** Delete many units at once. Returns how many rows were removed. */
export async function deleteServers(ids: number[]): Promise<number> {
  try {
    const res = await api.post<BulkDeleteResult>(`${BASE}/bulk-delete`, { ids })
    return res.data.deleted
  } catch (err) {
    throw toApiError(err)
  }
}

export async function importServers(file: File): Promise<ImportResult> {
  try {
    const form = new FormData()
    form.append('file', file)
    const res = await api.post<ImportResult>(`${BASE}/import`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  } catch (err) {
    throw toApiError(err)
  }
}

export function templateUrl(): string {
  return `${api.defaults.baseURL ?? ''}${BASE}/template.csv`
}

/** Super-admin: import Corelation/chassis.csv to enrich chassis with compatibility keys. */
export async function importServerCorrelation(file: File): Promise<ImportResult> {
  try {
    const form = new FormData()
    form.append('file', file)
    const res = await api.post<ImportResult>(`${BASE}/import-correlation`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  } catch (err) {
    throw toApiError(err)
  }
}

export function serverCorrelationTemplateUrl(): string {
  return `${api.defaults.baseURL ?? ''}${BASE}/correlation-template.csv`
}
