import { useCallback, useEffect, useState } from 'react'
import { listAllServers } from './serversApi'
import { ApiError } from '@/lib/api'
import type { ServerUnit } from '@/types/server'

interface State {
  data: ServerUnit[]
  loading: boolean
  error: string | null
}

/** Loads the FULL chassis list once; the page filters/searches/pages client-side. */
export function useChassisData() {
  const [state, setState] = useState<State>({ data: [], loading: true, error: null })

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await listAllServers()
      setState({ data, loading: false, error: null })
    } catch (err) {
      setState({ data: [], loading: false, error: err instanceof ApiError ? err.message : 'Failed to load chassis.' })
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { ...state, refetch: load }
}
