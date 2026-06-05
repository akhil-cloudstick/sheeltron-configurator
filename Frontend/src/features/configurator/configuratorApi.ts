import { api, toApiError } from '@/lib/api'
import type { ApiSingle } from '@/types/server'
import type { ConfigOption, QuotePayload, SavedQuote } from './types'

async function listOptions(path: string, params?: Record<string, string>): Promise<ConfigOption[]> {
  try {
    const res = await api.get<ApiSingle<ConfigOption[]>>(path, { params })
    return res.data.data ?? []
  } catch (err) {
    throw toApiError(err)
  }
}

export const listProcessors = () => listOptions('/api/configurator/processors')
export const listChassis = (socket: string) => listOptions('/api/configurator/chassis', { socket })
export const listMemory = (ramType: string) => listOptions('/api/configurator/memory', { ram_type: ramType })
export const listStorage = (formFactors: string) =>
  listOptions('/api/configurator/storage', { form_factors: formFactors })

export async function createQuote(payload: QuotePayload): Promise<SavedQuote> {
  try {
    const res = await api.post<ApiSingle<SavedQuote>>('/api/quotes', payload)
    return res.data.data
  } catch (err) {
    throw toApiError(err)
  }
}
