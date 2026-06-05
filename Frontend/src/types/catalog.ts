// Catalog (priced SKU) entities — mirror docs/data_model.md.
// All catalog data is mock for now (no backend yet).

export type CatalogEntity = 'chassis' | 'cpus' | 'ram' | 'storage' | 'network'

export interface BaseCatalog {
  id: number
  sku: string
  price_new: number | null // NULL => not offered as new
  price_refurb: number | null // NULL => not offered as refurb
  is_active: boolean
}

export interface Chassis extends BaseCatalog {
  brand: string
  model_name: string
  form_factor: string // 1U / 2U / 4U / Tower
  drive_bays: string // "8SFF" / "12LFF"
  cpu_socket: string // "LGA4189" / "SP3"
  max_sockets: number
  ram_type: string // "DDR4 ECC" / "DDR5 ECC"
  max_dimm_slots: number
  motherboard_pn: string
  default_raid: string
  onboard_nic: string
  backplane: string
  riser_slots: number
  psu_options: string[]
  default_psu: string
  badge_label: string
  badge_highlight: boolean
}

export interface Cpu extends BaseCatalog {
  vendor: string // INTEL / AMD
  family: string
  socket: string
  cores: number
  threads: number
  base_clock_ghz: number
  tdp_watts: number
  stock_count: number
}

export interface Ram extends BaseCatalog {
  label: string
  capacity_gb: number
  type: string // "DDR4 ECC" / "DDR5 ECC"
  speed_mhz: number
  stock_count: number
}

export interface Storage extends BaseCatalog {
  label: string
  capacity_gb: number
  interface: string // NVMe / SATA / SAS
  form_factor: string
}

export interface Network extends BaseCatalog {
  label: string
  speed_gbps: number
  ports: number
  controller: string
}

// Map an entity key to its row type.
export interface CatalogTypeMap {
  chassis: Chassis
  cpus: Cpu
  ram: Ram
  storage: Storage
  network: Network
}

export const CATALOG_ENTITIES: { key: CatalogEntity; label: string }[] = [
  { key: 'chassis', label: 'Chassis' },
  { key: 'cpus', label: 'CPUs' },
  { key: 'ram', label: 'RAM' },
  { key: 'storage', label: 'Storage' },
  { key: 'network', label: 'Network' },
]
