import { api, toApiError } from '@/lib/api'
import type { ApiListResponse, ApiMessage, ApiSingle, BulkDeleteResult, ImportResult } from '@/types/server'
import type { ProductInput, ProductUnit } from '@/types/product'

// All product stock endpoints share the chassis shape; only the base path differs.

export async function listAllProducts(base: string): Promise<ProductUnit[]> {
  try {
    const res = await api.get<ApiListResponse<ProductUnit>>(base)
    return res.data.response?.data ?? []
  } catch (err) {
    throw toApiError(err)
  }
}

export async function createProduct(base: string, input: ProductInput): Promise<ProductUnit> {
  try {
    const res = await api.post<ApiSingle<ProductUnit>>(base, input)
    return res.data.data
  } catch (err) {
    throw toApiError(err)
  }
}

export async function updateProduct(base: string, id: number, input: ProductInput): Promise<ProductUnit> {
  try {
    const res = await api.put<ApiSingle<ProductUnit>>(`${base}/${id}`, input)
    return res.data.data
  } catch (err) {
    throw toApiError(err)
  }
}

export async function deleteProducts(base: string, ids: number[]): Promise<number> {
  try {
    const res = await api.post<BulkDeleteResult>(`${base}/bulk-delete`, { ids })
    return res.data.deleted
  } catch (err) {
    throw toApiError(err)
  }
}

export async function importProducts(base: string, file: File): Promise<ImportResult> {
  try {
    const form = new FormData()
    form.append('file', file)
    const res = await api.post<ImportResult>(`${base}/import`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  } catch (err) {
    throw toApiError(err)
  }
}

export async function getProduct(base: string, id: number): Promise<ProductUnit> {
  try {
    const res = await api.get<ApiSingle<ProductUnit>>(`${base}/${id}`)
    return res.data.data
  } catch (err) {
    throw toApiError(err)
  }
}

export async function deleteProduct(base: string, id: number): Promise<void> {
  try {
    await api.delete<ApiMessage>(`${base}/${id}`)
  } catch (err) {
    throw toApiError(err)
  }
}

export function productTemplateUrl(base: string): string {
  return `${api.defaults.baseURL ?? ''}${base}/template.csv`
}

/** Super-admin: import a Corelation/ CSV to enrich rows with compatibility keys. */
export async function importProductCorrelation(base: string, file: File): Promise<ImportResult> {
  try {
    const form = new FormData()
    form.append('file', file)
    const res = await api.post<ImportResult>(`${base}/import-correlation`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  } catch (err) {
    throw toApiError(err)
  }
}

export function productCorrelationTemplateUrl(base: string): string {
  return `${api.defaults.baseURL ?? ''}${base}/correlation-template.csv`
}
