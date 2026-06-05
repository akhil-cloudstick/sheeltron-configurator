import { api, toApiError } from '@/lib/api'
import type { ApiSingle } from '@/types/server'

export interface CoverageBar {
  label: string
  count: number
}

export interface SocketRow {
  socket: string
  cpus: number
  chassis: number
  status: 'ok' | 'no_cpus'
}

export interface Coverage {
  socket_matrix: SocketRow[]
  chassis_by_brand: CoverageBar[]
  chassis_by_ram_type: CoverageBar[]
  chassis_by_form_factor: CoverageBar[]
  ram_by_generation: CoverageBar[]
  ram_by_speed: CoverageBar[]
  storage_by_type: CoverageBar[]
  storage_by_form_factor: CoverageBar[]
  storage_by_interface: CoverageBar[]
}

/** CPU↔chassis socket matrix + coverage cards, computed from the live enriched tables. */
export async function fetchCoverage(): Promise<Coverage> {
  try {
    const res = await api.get<ApiSingle<Coverage>>('/api/stock/coverage')
    return res.data.data
  } catch (err) {
    throw toApiError(err)
  }
}
