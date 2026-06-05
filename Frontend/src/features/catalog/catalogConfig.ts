import type { CatalogEntity } from '@/types/catalog'

export type FieldType = 'text' | 'number' | 'select' | 'bool' | 'list'

export interface FieldDef {
  key: string
  label: string
  type: FieldType
  options?: string[]
  grid?: boolean // show as a column in the grid
  required?: boolean
  mono?: boolean
  placeholder?: string
  default?: unknown
}

export interface EntityConfig {
  title: string
  description: string
  /** field used to label a row in pickers / previews */
  primaryKey: 'model_name' | 'label' | 'sku'
  /** optional filter dropdown for the grid toolbar */
  filterField?: string
  filterLabel?: string
  fields: FieldDef[]
}

const ACTIVE: FieldDef = { key: 'is_active', label: 'Active', type: 'bool', default: true }

export const CATALOG_CONFIG: Record<CatalogEntity, EntityConfig> = {
  chassis: {
    title: 'Chassis catalog',
    description: 'Priced server-model SKUs (one row per part number).',
    primaryKey: 'model_name',
    filterField: 'brand',
    filterLabel: 'Brand',
    fields: [
      { key: 'brand', label: 'Brand', type: 'text', grid: true },
      { key: 'sku', label: 'SKU / Part #', type: 'text', grid: true, required: true, mono: true },
      { key: 'model_name', label: 'Model name', type: 'text', grid: true, required: true },
      { key: 'form_factor', label: 'Form factor', type: 'text', placeholder: '2U' },
      { key: 'drive_bays', label: 'Drive bays', type: 'text', placeholder: '8SFF' },
      { key: 'cpu_socket', label: 'CPU socket', type: 'text', grid: true, placeholder: 'SP3' },
      { key: 'max_sockets', label: 'Max sockets', type: 'number', default: 2 },
      { key: 'ram_type', label: 'RAM type', type: 'text', grid: true, placeholder: 'DDR4 ECC' },
      { key: 'max_dimm_slots', label: 'Max DIMM slots', type: 'number', default: 24 },
      { key: 'motherboard_pn', label: 'Motherboard PN', type: 'text', mono: true },
      { key: 'default_raid', label: 'Default RAID', type: 'text' },
      { key: 'onboard_nic', label: 'Onboard NIC', type: 'text' },
      { key: 'backplane', label: 'Backplane', type: 'text' },
      { key: 'riser_slots', label: 'Riser slots', type: 'number', default: 0 },
      { key: 'psu_options', label: 'PSU options', type: 'list', placeholder: '800W ×2, 1600W ×2' },
      { key: 'default_psu', label: 'Default PSU', type: 'text' },
      { key: 'badge_label', label: 'Badge label', type: 'text' },
      { key: 'badge_highlight', label: 'Highlight badge', type: 'bool', default: false },
      ACTIVE,
    ],
  },
  cpus: {
    title: 'CPU catalog',
    description: 'Priced processor SKUs.',
    primaryKey: 'sku',
    filterField: 'vendor',
    filterLabel: 'Vendor',
    fields: [
      { key: 'vendor', label: 'Vendor', type: 'select', options: ['INTEL', 'AMD'], grid: true, default: 'INTEL' },
      { key: 'family', label: 'Family', type: 'text', placeholder: 'Xeon Gold' },
      { key: 'sku', label: 'SKU', type: 'text', grid: true, required: true, mono: true },
      { key: 'socket', label: 'Socket', type: 'text', grid: true, placeholder: 'LGA4189' },
      { key: 'cores', label: 'Cores', type: 'number', grid: true, default: 0 },
      { key: 'threads', label: 'Threads', type: 'number', default: 0 },
      { key: 'base_clock_ghz', label: 'Base clock (GHz)', type: 'number', default: 0 },
      { key: 'tdp_watts', label: 'TDP (W)', type: 'number', default: 0 },
      { key: 'stock_count', label: 'Stock count', type: 'number', grid: true, default: 0 },
      ACTIVE,
    ],
  },
  ram: {
    title: 'RAM catalog',
    description: 'Priced memory module SKUs.',
    primaryKey: 'label',
    filterField: 'type',
    filterLabel: 'Type',
    fields: [
      { key: 'sku', label: 'SKU', type: 'text', grid: true, required: true, mono: true },
      { key: 'label', label: 'Label', type: 'text', grid: true, required: true },
      { key: 'capacity_gb', label: 'Capacity (GB)', type: 'number', grid: true, default: 0 },
      { key: 'type', label: 'Type', type: 'text', grid: true, placeholder: 'DDR4 ECC' },
      { key: 'speed_mhz', label: 'Speed (MHz)', type: 'number', default: 3200 },
      { key: 'stock_count', label: 'Stock count', type: 'number', grid: true, default: 0 },
      ACTIVE,
    ],
  },
  storage: {
    title: 'Storage catalog',
    description: 'Priced drive SKUs.',
    primaryKey: 'label',
    filterField: 'interface',
    filterLabel: 'Interface',
    fields: [
      { key: 'sku', label: 'SKU', type: 'text', grid: true, required: true, mono: true },
      { key: 'label', label: 'Label', type: 'text', grid: true, required: true },
      { key: 'capacity_gb', label: 'Capacity (GB)', type: 'number', grid: true, default: 0 },
      { key: 'interface', label: 'Interface', type: 'select', options: ['NVMe', 'SATA', 'SAS'], grid: true, default: 'SATA' },
      { key: 'form_factor', label: 'Form factor', type: 'text', placeholder: '2.5" SFF' },
      ACTIVE,
    ],
  },
  network: {
    title: 'Network catalog',
    description: 'Priced NIC SKUs.',
    primaryKey: 'label',
    fields: [
      { key: 'sku', label: 'SKU', type: 'text', grid: true, required: true, mono: true },
      { key: 'label', label: 'Label', type: 'text', grid: true, required: true },
      { key: 'speed_gbps', label: 'Speed (Gbps)', type: 'number', grid: true, default: 10 },
      { key: 'ports', label: 'Ports', type: 'number', grid: true, default: 2 },
      { key: 'controller', label: 'Controller', type: 'text', placeholder: 'Intel X710' },
      ACTIVE,
    ],
  },
}

/** Build an empty row (without id / prices) from a config's field defaults. */
export function emptyCatalogRow(entity: CatalogEntity): Record<string, unknown> {
  const row: Record<string, unknown> = { price_new: null, price_refurb: null }
  for (const f of CATALOG_CONFIG[entity].fields) {
    if (f.default !== undefined) row[f.key] = f.default
    else if (f.type === 'number') row[f.key] = 0
    else if (f.type === 'bool') row[f.key] = false
    else if (f.type === 'list') row[f.key] = []
    else if (f.type === 'select') row[f.key] = f.options?.[0] ?? ''
    else row[f.key] = ''
  }
  return row
}

/** Distinct values of a field across rows (for filter dropdowns). */
export function distinctValues(rows: Record<string, unknown>[], field: string): string[] {
  const set = new Set<string>()
  for (const r of rows) {
    const v = r[field]
    if (v !== undefined && v !== null && v !== '') set.add(String(v))
  }
  return [...set].sort()
}
