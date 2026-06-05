import { useCallback, useEffect, useState } from 'react'
import { listAllProducts } from './productApi'
import { ApiError } from '@/lib/api'
import type { ProductUnit } from '@/types/product'

interface State {
  data: ProductUnit[]
  loading: boolean
  error: string | null
}

/** Loads the FULL product list once; the page filters/searches/pages client-side. */
export function useProductData(apiBase: string) {
  const [state, setState] = useState<State>({ data: [], loading: true, error: null })

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await listAllProducts(apiBase)
      setState({ data, loading: false, error: null })
    } catch (err) {
      setState({ data: [], loading: false, error: err instanceof ApiError ? err.message : 'Failed to load stock.' })
    }
  }, [apiBase])

  useEffect(() => {
    load()
  }, [load])

  return { ...state, refetch: load }
}
