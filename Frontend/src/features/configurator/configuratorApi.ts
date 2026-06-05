import { api, toApiError } from '@/lib/api'
import type { ApiSingle } from '@/types/server'
import type { ConfigOption, QuotePayload, SavedQuote, PackPayload, SavedPack } from './types'

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

// --- Compatible packs ---------------------------------------------------------

export async function createPack(payload: PackPayload): Promise<SavedPack> {
  try {
    const res = await api.post<ApiSingle<SavedPack>>('/api/packs', payload)
    return res.data.data
  } catch (err) {
    throw toApiError(err)
  }
}

export async function listPacks(): Promise<SavedPack[]> {
  try {
    const res = await api.get<ApiSingle<SavedPack[]>>('/api/packs')
    return res.data.data ?? []
  } catch (err) {
    throw toApiError(err)
  }
}

export async function getPack(id: number): Promise<SavedPack> {
  try {
    const res = await api.get<ApiSingle<SavedPack>>(`/api/packs/${id}`)
    return res.data.data
  } catch (err) {
    throw toApiError(err)
  }
}

export async function deletePack(id: number): Promise<void> {
  try {
    await api.delete(`/api/packs/${id}`)
  } catch (err) {
    throw toApiError(err)
  }
}
