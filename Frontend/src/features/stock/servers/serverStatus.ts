import type { PillTone } from '@/components/ui'
import type { ServerStatus, ServerCondition } from '@/types/server'
import { SERVER_STATUSES } from '@/types/server'

interface StatusMeta {
  label: string
  tone: PillTone
}

export const SERVER_STATUS_META: Record<ServerStatus, StatusMeta> = {
  need_check: { label: 'Need check', tone: 'neutral' },
  testing: { label: 'Testing', tone: 'info' },
  ready: { label: 'Ready', tone: 'success' },
  reserved: { label: 'Reserved', tone: 'warning' },
  shipped: { label: 'Shipped', tone: 'neutral' },
  rma: { label: 'RMA', tone: 'danger' },
  scrap: { label: 'Scrap', tone: 'danger' },
}

export const STATUS_OPTIONS = SERVER_STATUSES.map((s) => ({
  value: s,
  label: SERVER_STATUS_META[s].label,
}))

export const SERVER_CONDITION_META: Record<ServerCondition, { label: string; tone: PillTone }> = {
  new: { label: 'New', tone: 'info' },
  refurbished: { label: 'Refurbished', tone: 'warning' },
}
