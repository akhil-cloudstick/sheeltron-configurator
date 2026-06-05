import axios, { AxiosError } from 'axios'
import { useAuthStore } from '@/store/authStore'

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    // Skip ngrok's free-tier browser-warning interstitial so API calls
    // return JSON instead of the warning HTML page. No-op on other hosts.
    'ngrok-skip-browser-warning': 'true',
  },
})

// Send the (mocked) role so the backend can redact price for stock managers.
api.interceptors.request.use((config) => {
  const role = useAuthStore.getState().user?.role
  if (role) config.headers['X-User-Role'] = role
  return config
})

/** Error carrying the backend's `error` message so callers can show it inline. */
export class ApiError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/** Normalize any thrown error (Axios/network/backend envelope) into an ApiError. */
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err
  if (axios.isAxiosError(err)) {
    const ax = err as AxiosError<{ error?: string; success?: boolean }>
    const msg =
      ax.response?.data?.error ??
      ax.message ??
      'Request failed. Is the backend running on the configured URL?'
    return new ApiError(msg, ax.response?.status)
  }
  if (err instanceof Error) return new ApiError(err.message)
  return new ApiError('Unknown error')
}
