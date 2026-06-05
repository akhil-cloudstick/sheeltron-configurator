import type { PillTone } from '@/components/ui'
import type { StockKind, StockState } from '@/types/stock'

export interface StockKindConfig {
  title: string
  description: string
  specLabel: string // column header for the entity-specific `spec` field
  specPlaceholder: string
}

export const STOCK_KIND_CONFIG: Record<StockKind, StockKindConfig> = {
  cpus: {
    title: 'CPU stock',
    description: 'Processor inventory on hand.',
    specLabel: 'Socket · TDP',
    specPlaceholder: 'SP3 · 280W',
  },
  ram: {
    title: 'RAM stock',
    description: 'Memory module inventory on hand.',
    specLabel: 'Capacity · Speed',
    specPlaceholder: '64GB · 3200',
  },
  storage: {
    title: 'Storage stock',
    description: 'Drive inventory on hand.',
    specLabel: 'Interface · Form',
    specPlaceholder: 'NVMe · 2.5"',
  },
  network: {
    title: 'Network stock',
    description: 'NIC inventory on hand.',
    specLabel: 'Speed · Ports',
    specPlaceholder: '10G · 2p',
  },
}

export const STOCK_STATE_META: Record<StockState, { label: string; tone: PillTone }> = {
  in_stock: { label: 'In stock', tone: 'success' },
  allocated: { label: 'Allocated', tone: 'warning' },
  rma: { label: 'RMA', tone: 'danger' },
  scrap: { label: 'Scrap', tone: 'danger' },
}
