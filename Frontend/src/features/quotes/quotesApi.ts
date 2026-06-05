import { api, toApiError } from '@/lib/api'
import type { ApiSingle } from '@/types/server'
import type { SavedQuote } from '@/features/configurator/types'

export async function listQuotes(): Promise<SavedQuote[]> {
  try {
    const res = await api.get<ApiSingle<SavedQuote[]>>('/api/quotes')
    return res.data.data ?? []
  } catch (err) {
    throw toApiError(err)
  }
}

export async function getQuote(id: number): Promise<SavedQuote> {
  try {
    const res = await api.get<ApiSingle<SavedQuote>>(`/api/quotes/${id}`)
    return res.data.data
  } catch (err) {
    throw toApiError(err)
  }
}
