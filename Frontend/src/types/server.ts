// Mirrors the Go backend ServerUnit model (modules/stock/models/servers.go)
// and the API response envelopes (modules/stock/controllers/servers.go).

export const SERVER_STATUSES = [
  'need_check',
  'testing',
  'ready',
  'reserved',
  'shipped',
  'rma',
  'scrap',
] as const

export type ServerStatus = (typeof SERVER_STATUSES)[number]

// A unit can hold multiple conditions at once (new and/or refurbished), each with its
// own price. Conditions are set manually in the UI; prices are admin-only.
export const SERVER_CONDITIONS = ['new', 'refurbished'] as const
export type ServerCondition = (typeof SERVER_CONDITIONS)[number]

export interface ServerUnit {
  id: number
  brand: string
  model: string
  motherboard: string
  heat_sink: string
  fan: string
  raid_card: string
  cards: string
  riser_1: string
  riser_2: string
  riser_3: string
  back_plane: string
  power_supply: string
  status: ServerStatus
  // Derived compatibility keys (from Corelation/, edited by super-admins).
  model_family: string
  cpu_socket: string
  max_sockets: number | null
  ram_type: string
  drive_form_factors: string
  datasheet: string
  source: string
  is_server: boolean
  needs_review: boolean
  compat_note: string
  condition_new: boolean
  condition_refurbished: boolean
  price_new: number | null
  price_refurbished: number | null
  remark: string
  created_at: string
  updated_at: string
}

// Payload accepted by create/update (server assigns id/timestamps).
export type ServerUnitInput = Omit<ServerUnit, 'id' | 'created_at' | 'updated_at'>

// ---- API envelopes -------------------------------------------------------

export interface ApiSingle<T> {
  success: boolean
  data: T
  error?: string
}

export interface ApiListResponse<T> {
  success: boolean
  response: {
    total: number
    page: number
    limit: number
    data: T[]
  }
  error?: string
}

export interface ApiMessage {
  success: boolean
  message?: string
  error?: string
}

export interface ImportResult {
  success: boolean
  inserted: number
  updated: number
  skipped: number
  issues?: number // rows imported with empty fields → see the Issues page
  error?: string
}

export interface BulkDeleteResult {
  success: boolean
  deleted: number
  error?: string
}

export interface ServerListParams {
  q?: string
  brand?: string
  model?: string
  status?: ServerStatus | ''
  page?: number
  limit?: number
}
