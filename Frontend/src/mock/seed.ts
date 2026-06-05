import type { Chassis, Cpu, Network, Ram, Storage } from '@/types/catalog'
import type { CompatOverride, BulkPriceRun } from '@/types/pricing'
import type { GenericStockRow } from '@/types/stock'

export interface MockDb {
  chassis: Chassis[]
  cpus: Cpu[]
  ram: Ram[]
  storage: Storage[]
  network: Network[]
  overrides: CompatOverride[]
  runs: BulkPriceRun[]
  stockCpus: GenericStockRow[]
  stockRam: GenericStockRow[]
  stockStorage: GenericStockRow[]
  stockNetwork: GenericStockRow[]
}

// Bump when the seed shape changes so persisted demo data is rebuilt.
export const SEED_VERSION = 1

const chassis: Chassis[] = [
  {
    id: 1, sku: 'P38411-B21', brand: 'HPE', model_name: 'HPE DL385 Gen10 Plus V2 · 8SFF',
    form_factor: '2U', drive_bays: '8SFF', cpu_socket: 'SP3', max_sockets: 2,
    ram_type: 'DDR4 ECC', max_dimm_slots: 32, motherboard_pn: 'P40453-001',
    default_raid: 'MR416i-a NVMe/SAS 12G 4GB', onboard_nic: 'BCM57412 10GbE 2p SFP+ OCP3',
    backplane: '8SFF U.3 x1 Tri-Mode (P39781-001)', riser_slots: 3,
    psu_options: ['800W ×2', '1600W ×2'], default_psu: '800W ×2',
    price_new: 425000, price_refurb: 165000, badge_label: 'Most Popular', badge_highlight: true, is_active: true,
  },
  {
    id: 2, sku: 'P55080-B21', brand: 'HPE', model_name: 'HPE DL385 Gen11 · 8SFF',
    form_factor: '2U', drive_bays: '8SFF', cpu_socket: 'SP5', max_sockets: 2,
    ram_type: 'DDR5 ECC', max_dimm_slots: 24, motherboard_pn: 'P58367-001',
    default_raid: 'MR408i-o Gen5', onboard_nic: 'BCM5719 1GbE 4p OCP3',
    backplane: '8SFF NVMe/SAS', riser_slots: 3, psu_options: ['1000W ×2', '1600W ×2'],
    default_psu: '1000W ×2', price_new: 720000, price_refurb: null, badge_label: 'New only', badge_highlight: false, is_active: true,
  },
  {
    id: 3, sku: 'P19719-B21', brand: 'HPE', model_name: 'HPE DL380 Gen10 · 8SFF',
    form_factor: '2U', drive_bays: '8SFF', cpu_socket: 'LGA3647', max_sockets: 2,
    ram_type: 'DDR4 ECC', max_dimm_slots: 24, motherboard_pn: 'P03426-001',
    default_raid: 'Smart Array P408i-a', onboard_nic: '331i 1GbE 4p',
    backplane: '8SFF SAS/SATA', riser_slots: 3, psu_options: ['500W ×2', '800W ×2'],
    default_psu: '500W ×2', price_new: 310000, price_refurb: 112000, badge_label: '', badge_highlight: false, is_active: true,
  },
  {
    id: 4, sku: 'PER740-8SFF', brand: 'DELL', model_name: 'Dell PowerEdge R740 · 8SFF',
    form_factor: '2U', drive_bays: '8SFF', cpu_socket: 'LGA3647', max_sockets: 2,
    ram_type: 'DDR4 ECC', max_dimm_slots: 24, motherboard_pn: '0WGD1', default_raid: 'PERC H740P',
    onboard_nic: 'BCM5720 1GbE 4p', backplane: '8x2.5 SAS', riser_slots: 3,
    psu_options: ['750W ×2', '1100W ×2'], default_psu: '750W ×2',
    price_new: 335000, price_refurb: 138000, badge_label: '', badge_highlight: false, is_active: true,
  },
  {
    id: 5, sku: 'PER640-10SFF', brand: 'DELL', model_name: 'Dell PowerEdge R640 · 10SFF',
    form_factor: '1U', drive_bays: '10SFF', cpu_socket: 'LGA3647', max_sockets: 2,
    ram_type: 'DDR4 ECC', max_dimm_slots: 24, motherboard_pn: '06NWG', default_raid: 'PERC H730P',
    onboard_nic: 'BCM5720 1GbE 2p', backplane: '10x2.5 NVMe', riser_slots: 2,
    psu_options: ['750W ×2'], default_psu: '750W ×2',
    price_new: 285000, price_refurb: 104000, badge_label: 'Compact', badge_highlight: false, is_active: true,
  },
  {
    id: 6, sku: 'PER750-8SFF', brand: 'DELL', model_name: 'Dell PowerEdge R750 · 8SFF',
    form_factor: '2U', drive_bays: '8SFF', cpu_socket: 'LGA4189', max_sockets: 2,
    ram_type: 'DDR4 ECC', max_dimm_slots: 32, motherboard_pn: '0PVT4', default_raid: 'PERC H755',
    onboard_nic: 'BCM57414 25GbE 2p', backplane: '8x2.5 NVMe', riser_slots: 3,
    psu_options: ['800W ×2', '1400W ×2'], default_psu: '800W ×2',
    price_new: 465000, price_refurb: 198000, badge_label: '', badge_highlight: false, is_active: true,
  },
  {
    id: 7, sku: 'R282-Z90', brand: 'GIGABYTE', model_name: 'Gigabyte R282-Z90 · 24NVMe',
    form_factor: '2U', drive_bays: '24SFF', cpu_socket: 'SP3', max_sockets: 2,
    ram_type: 'DDR4 ECC', max_dimm_slots: 32, motherboard_pn: 'MZ92-FS0', default_raid: 'none (HBA optional)',
    onboard_nic: 'Intel X550 10GbE 2p', backplane: '24x2.5 NVMe', riser_slots: 2,
    psu_options: ['1600W ×2'], default_psu: '1600W ×2',
    price_new: 540000, price_refurb: 245000, badge_label: 'GPU-ready', badge_highlight: false, is_active: true,
  },
  {
    id: 8, sku: 'R182-Z91', brand: 'GIGABYTE', model_name: 'Gigabyte R182-Z91 · 12LFF',
    form_factor: '1U', drive_bays: '12LFF', cpu_socket: 'SP3', max_sockets: 2,
    ram_type: 'DDR4 ECC', max_dimm_slots: 16, motherboard_pn: 'MZ12-HD0', default_raid: 'none',
    onboard_nic: 'Intel I350 1GbE 2p', backplane: '12x3.5 SATA', riser_slots: 1,
    psu_options: ['1200W ×2'], default_psu: '1200W ×2',
    price_new: 410000, price_refurb: 176000, badge_label: '', badge_highlight: false, is_active: true,
  },
  {
    id: 9, sku: 'D52BQ-2U', brand: 'QUANTA', model_name: 'Quanta D52BQ-2U · 12LFF',
    form_factor: '2U', drive_bays: '12LFF', cpu_socket: 'LGA3647', max_sockets: 2,
    ram_type: 'DDR4 ECC', max_dimm_slots: 24, motherboard_pn: 'S5BQ', default_raid: 'LSI 3008 HBA',
    onboard_nic: 'Intel X710 10GbE 2p', backplane: '12x3.5 SAS', riser_slots: 2,
    psu_options: ['1600W ×2'], default_psu: '1600W ×2',
    price_new: 295000, price_refurb: 99000, badge_label: 'Value', badge_highlight: false, is_active: true,
  },
  {
    id: 10, sku: 'NF5280M6', brand: 'INSPUR', model_name: 'Inspur NF5280M6 · 8SFF',
    form_factor: '2U', drive_bays: '8SFF', cpu_socket: 'LGA4189', max_sockets: 2,
    ram_type: 'DDR4 ECC', max_dimm_slots: 32, motherboard_pn: 'YZMB-00882', default_raid: 'PM8222 HBA',
    onboard_nic: 'Intel X710 10GbE 4p', backplane: '8x2.5 NVMe', riser_slots: 3,
    psu_options: ['800W ×2', '1300W ×2'], default_psu: '800W ×2',
    price_new: 358000, price_refurb: 142000, badge_label: '', badge_highlight: false, is_active: true,
  },
  {
    id: 11, sku: 'P06667-B21', brand: 'HPE', model_name: 'HPE DL360 Gen10 · 8SFF',
    form_factor: '1U', drive_bays: '8SFF', cpu_socket: 'LGA3647', max_sockets: 2,
    ram_type: 'DDR4 ECC', max_dimm_slots: 24, motherboard_pn: 'P03427-001', default_raid: 'Smart Array P408i-a',
    onboard_nic: '331i 1GbE 4p', backplane: '8x2.5 SAS', riser_slots: 2,
    psu_options: ['500W ×2', '800W ×2'], default_psu: '500W ×2',
    price_new: 298000, price_refurb: 108000, badge_label: '', badge_highlight: false, is_active: true,
  },
  {
    id: 12, sku: 'PER650-8SFF', brand: 'DELL', model_name: 'Dell PowerEdge R650 · 8SFF',
    form_factor: '1U', drive_bays: '8SFF', cpu_socket: 'LGA4189', max_sockets: 2,
    ram_type: 'DDR4 ECC', max_dimm_slots: 32, motherboard_pn: '04Y89C', default_raid: 'PERC H755N',
    onboard_nic: 'BCM57414 25GbE 2p', backplane: '8x2.5 NVMe', riser_slots: 2,
    psu_options: ['800W ×2', '1100W ×2'], default_psu: '800W ×2',
    price_new: 452000, price_refurb: 189000, badge_label: '', badge_highlight: false, is_active: false,
  },
]

const cpus: Cpu[] = [
  { id: 1, vendor: 'AMD', family: 'EPYC 7003', sku: 'EPYC 7763', socket: 'SP3', cores: 64, threads: 128, base_clock_ghz: 2.45, tdp_watts: 280, price_new: 285000, price_refurb: 96000, stock_count: 6, is_active: true },
  { id: 2, vendor: 'AMD', family: 'EPYC 7003', sku: 'EPYC 7543', socket: 'SP3', cores: 32, threads: 64, base_clock_ghz: 2.8, tdp_watts: 225, price_new: 158000, price_refurb: 58000, stock_count: 11, is_active: true },
  { id: 3, vendor: 'AMD', family: 'EPYC 7003', sku: 'EPYC 7313', socket: 'SP3', cores: 16, threads: 32, base_clock_ghz: 3.0, tdp_watts: 155, price_new: 74000, price_refurb: 28000, stock_count: 14, is_active: true },
  { id: 4, vendor: 'AMD', family: 'EPYC 9004', sku: 'EPYC 9354', socket: 'SP5', cores: 32, threads: 64, base_clock_ghz: 3.25, tdp_watts: 280, price_new: 312000, price_refurb: null, stock_count: 3, is_active: true },
  { id: 5, vendor: 'AMD', family: 'EPYC 9004', sku: 'EPYC 9554', socket: 'SP5', cores: 64, threads: 128, base_clock_ghz: 3.1, tdp_watts: 360, price_new: 585000, price_refurb: null, stock_count: 2, is_active: true },
  { id: 6, vendor: 'INTEL', family: 'Xeon Gold', sku: 'Xeon Gold 6330', socket: 'LGA4189', cores: 28, threads: 56, base_clock_ghz: 2.0, tdp_watts: 205, price_new: 142000, price_refurb: 52000, stock_count: 9, is_active: true },
  { id: 7, vendor: 'INTEL', family: 'Xeon Gold', sku: 'Xeon Gold 6348', socket: 'LGA4189', cores: 28, threads: 56, base_clock_ghz: 2.6, tdp_watts: 235, price_new: 198000, price_refurb: 78000, stock_count: 5, is_active: true },
  { id: 8, vendor: 'INTEL', family: 'Xeon Gold', sku: 'Xeon Gold 6230', socket: 'LGA3647', cores: 20, threads: 40, base_clock_ghz: 2.1, tdp_watts: 125, price_new: 86000, price_refurb: 24000, stock_count: 22, is_active: true },
  { id: 9, vendor: 'INTEL', family: 'Xeon Gold', sku: 'Xeon Gold 6248R', socket: 'LGA3647', cores: 24, threads: 48, base_clock_ghz: 3.0, tdp_watts: 205, price_new: 132000, price_refurb: 41000, stock_count: 8, is_active: true },
  { id: 10, vendor: 'INTEL', family: 'Xeon Silver', sku: 'Xeon Silver 4214', socket: 'LGA3647', cores: 12, threads: 24, base_clock_ghz: 2.2, tdp_watts: 85, price_new: 38000, price_refurb: 12000, stock_count: 31, is_active: true },
  { id: 11, vendor: 'INTEL', family: 'Xeon Silver', sku: 'Xeon Silver 4310', socket: 'LGA4189', cores: 12, threads: 24, base_clock_ghz: 2.1, tdp_watts: 120, price_new: 46000, price_refurb: 17000, stock_count: 18, is_active: true },
  { id: 12, vendor: 'AMD', family: 'EPYC 7002', sku: 'EPYC 7402', socket: 'SP3', cores: 24, threads: 48, base_clock_ghz: 2.8, tdp_watts: 180, price_new: 62000, price_refurb: 21000, stock_count: 16, is_active: true },
]

const ram: Ram[] = [
  { id: 1, sku: 'RAM-16-DDR4-3200', label: '16 GB DDR4 ECC 3200', capacity_gb: 16, type: 'DDR4 ECC', speed_mhz: 3200, price_new: 4200, price_refurb: 2200, stock_count: 120, is_active: true },
  { id: 2, sku: 'RAM-32-DDR4-3200', label: '32 GB DDR4 ECC 3200', capacity_gb: 32, type: 'DDR4 ECC', speed_mhz: 3200, price_new: 7600, price_refurb: 4200, stock_count: 84, is_active: true },
  { id: 3, sku: 'RAM-64-DDR4-3200', label: '64 GB DDR4 ECC 3200', capacity_gb: 64, type: 'DDR4 ECC', speed_mhz: 3200, price_new: 14800, price_refurb: 8200, stock_count: 52, is_active: true },
  { id: 4, sku: 'RAM-128-DDR4-3200', label: '128 GB DDR4 ECC 3200', capacity_gb: 128, type: 'DDR4 ECC', speed_mhz: 3200, price_new: 38000, price_refurb: 21000, stock_count: 12, is_active: true },
  { id: 5, sku: 'RAM-32-DDR5-4800', label: '32 GB DDR5 ECC 4800', capacity_gb: 32, type: 'DDR5 ECC', speed_mhz: 4800, price_new: 12500, price_refurb: null, stock_count: 30, is_active: true },
  { id: 6, sku: 'RAM-64-DDR5-4800', label: '64 GB DDR5 ECC 4800', capacity_gb: 64, type: 'DDR5 ECC', speed_mhz: 4800, price_new: 24500, price_refurb: null, stock_count: 18, is_active: true },
  { id: 7, sku: 'RAM-128-DDR5-4800', label: '128 GB DDR5 ECC 4800', capacity_gb: 128, type: 'DDR5 ECC', speed_mhz: 4800, price_new: 62000, price_refurb: null, stock_count: 6, is_active: true },
  { id: 8, sku: 'RAM-256-DDR4-3200', label: '256 GB DDR4 ECC 3200', capacity_gb: 256, type: 'DDR4 ECC', speed_mhz: 3200, price_new: 88000, price_refurb: 52000, stock_count: 3, is_active: true },
]

const storage: Storage[] = [
  { id: 1, sku: 'SSD-960-SATA', label: '960 GB SATA SSD', capacity_gb: 960, interface: 'SATA', form_factor: '2.5" SFF', price_new: 9800, price_refurb: 5200, is_active: true },
  { id: 2, sku: 'SSD-1920-SATA', label: '1.92 TB SATA SSD', capacity_gb: 1920, interface: 'SATA', form_factor: '2.5" SFF', price_new: 18500, price_refurb: 10200, is_active: true },
  { id: 3, sku: 'SSD-1920-NVME', label: '1.92 TB NVMe SSD', capacity_gb: 1920, interface: 'NVMe', form_factor: '2.5" SFF', price_new: 24500, price_refurb: 14500, is_active: true },
  { id: 4, sku: 'SSD-3840-NVME', label: '3.84 TB NVMe SSD', capacity_gb: 3840, interface: 'NVMe', form_factor: '2.5" SFF', price_new: 46000, price_refurb: 28000, is_active: true },
  { id: 5, sku: 'SAS-1200-10K', label: '1.2 TB SAS 10K HDD', capacity_gb: 1200, interface: 'SAS', form_factor: '2.5" SFF', price_new: 8200, price_refurb: 3600, is_active: true },
  { id: 6, sku: 'SATA-4000-7K', label: '4 TB SATA 7.2K HDD', capacity_gb: 4000, interface: 'SATA', form_factor: '3.5" LFF', price_new: 9600, price_refurb: 4800, is_active: true },
  { id: 7, sku: 'SATA-8000-7K', label: '8 TB SATA 7.2K HDD', capacity_gb: 8000, interface: 'SATA', form_factor: '3.5" LFF', price_new: 16800, price_refurb: 9200, is_active: true },
  { id: 8, sku: 'SSD-480-SATA', label: '480 GB SATA SSD', capacity_gb: 480, interface: 'SATA', form_factor: '2.5" SFF', price_new: 6200, price_refurb: 3100, is_active: true },
]

const network: Network[] = [
  { id: 1, sku: 'NIC-1G-4P', label: '1 GbE quad-port', speed_gbps: 1, ports: 4, controller: 'Intel I350', price_new: 6800, price_refurb: 2800, is_active: true },
  { id: 2, sku: 'NIC-10G-2P', label: '10 GbE dual-port SFP+', speed_gbps: 10, ports: 2, controller: 'Intel X710', price_new: 14500, price_refurb: 6500, is_active: true },
  { id: 3, sku: 'NIC-25G-2P', label: '25 GbE dual-port SFP28', speed_gbps: 25, ports: 2, controller: 'Mellanox CX4', price_new: 28000, price_refurb: 14000, is_active: true },
  { id: 4, sku: 'NIC-100G-2P', label: '100 GbE dual-port QSFP28', speed_gbps: 100, ports: 2, controller: 'Mellanox CX5', price_new: 72000, price_refurb: 38000, is_active: true },
  { id: 5, sku: 'NIC-10G-4P', label: '10 GbE quad-port SFP+', speed_gbps: 10, ports: 4, controller: 'Broadcom 57840', price_new: 22000, price_refurb: 9800, is_active: true },
]

const overrides: CompatOverride[] = [
  { id: 1, kind: 'cpu', chassisId: 3, targetId: 9, isCompatible: true, note: "Cert'd 2024 — BIOS U30 2.66+" },
  { id: 2, kind: 'cpu', chassisId: 1, targetId: 1, isCompatible: false, note: 'BIOS bug — thermal trip under load' },
  { id: 3, kind: 'ram', chassisId: 6, targetId: 4, isCompatible: false, note: 'Unstable above 16 DIMMs' },
]

const runs: BulkPriceRun[] = []

function stockRows(
  prefix: string,
  rows: Array<[string, string, string]>,
): GenericStockRow[] {
  // tuple = [sku, label, spec]
  const states = ['in_stock', 'in_stock', 'allocated', 'rma'] as const
  const conditions = ['refurb', 'new'] as const
  return rows.map((r, i) => ({
    id: i + 1,
    sku: r[0],
    label: r[1],
    spec: r[2],
    condition: conditions[i % conditions.length],
    quantity: ((i * 7 + 3) % 40) + 1,
    location: `Rack ${prefix}-${(i % 6) + 1}`,
    state: states[i % states.length],
    remark: '',
  }))
}

const stockCpus = stockRows('C', [
  ['EPYC 7763', 'AMD EPYC 7763 64C', 'SP3 · 280W'],
  ['EPYC 7543', 'AMD EPYC 7543 32C', 'SP3 · 225W'],
  ['XG-6330', 'Intel Xeon Gold 6330 28C', 'LGA4189 · 205W'],
  ['XG-6230', 'Intel Xeon Gold 6230 20C', 'LGA3647 · 125W'],
  ['XS-4214', 'Intel Xeon Silver 4214 12C', 'LGA3647 · 85W'],
])

const stockRam = stockRows('R', [
  ['RAM-32-DDR4', '32 GB DDR4 ECC 3200', '32GB · 3200'],
  ['RAM-64-DDR4', '64 GB DDR4 ECC 3200', '64GB · 3200'],
  ['RAM-32-DDR5', '32 GB DDR5 ECC 4800', '32GB · 4800'],
  ['RAM-16-DDR4', '16 GB DDR4 ECC 3200', '16GB · 3200'],
])

const stockStorage = stockRows('S', [
  ['SSD-1920-NVME', '1.92 TB NVMe SSD', 'NVMe · 2.5"'],
  ['SSD-960-SATA', '960 GB SATA SSD', 'SATA · 2.5"'],
  ['SATA-4000-7K', '4 TB SATA 7.2K HDD', 'SATA · 3.5"'],
])

const stockNetwork = stockRows('N', [
  ['NIC-10G-2P', '10 GbE dual-port SFP+', '10G · 2p'],
  ['NIC-25G-2P', '25 GbE dual-port SFP28', '25G · 2p'],
])

export function buildSeed(): MockDb {
  // Deep clone so the seed array objects are never mutated in place.
  return JSON.parse(
    JSON.stringify({
      chassis, cpus, ram, storage, network, overrides, runs,
      stockCpus, stockRam, stockStorage, stockNetwork,
    }),
  ) as MockDb
}
