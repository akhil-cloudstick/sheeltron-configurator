import { useCallback, useEffect, useState } from 'react'
import { listServers } from './serversApi'
import { ApiError } from '@/lib/api'
import type { ServerListParams, ServerUnit } from '@/types/server'

interface State {
  data: ServerUnit[]
  total: number
  loading: boolean
  error: string | null
}

/** Loads the server list whenever `params` changes; exposes a manual `refetch`. */
export function useServers(params: ServerListParams) {
  const [state, setState] = useState<State>({ data: [], total: 0, loading: true, error: null })

  const key = JSON.stringify(params)

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const res = await listServers(params)
      setState({ data: res.data, total: res.total, loading: false, error: null })
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load servers.'
      setState((s) => ({ ...s, loading: false, error: msg }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  useEffect(() => {
    load()
  }, [load])

  return { ...state, refetch: load }
}
