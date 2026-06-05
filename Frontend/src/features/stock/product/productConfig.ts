// Config-driven definition of each generic stock product type (processor / memory /
// ssd / hdd). Chassis keeps its own bespoke page. One entry here powers the list page,
// the add/edit drawer, filters, import and CSV export.

export interface FieldDef {
  key: string
  label: string
}

// Derived compatibility fields (from Corelation/) — editable by super-admins only.
export interface CorrFieldDef extends FieldDef {
  kind?: 'text' | 'bool' // default 'text'
}

export interface ProductConfig {
  key: string // 'processor' | 'memory' | 'ssd' | 'hdd'
  title: string // page title, e.g. "Processor stock"
  noun: string // singular, e.g. "processor"
  route: string // frontend route, e.g. "/stock/processor"
  apiBase: string // backend base, e.g. "/api/stock/processor"
  identityKey: string // 'model' | 'product_name'
  identityLabel: string // 'Model' | 'Product name'
  columns: FieldDef[] // inline spec columns shown in the table (besides id/condition/price)
  formFields: FieldDef[] // drawer inputs, including the identity field
  correlationFields?: CorrFieldDef[] // super-admin-only compatibility-key inputs
  filterableFields: FieldDef[] // dynamic "Add filter" options (string fields + 'condition')
  searchFields: string[] // free-text search keys
}

const CONDITION_FILTER: FieldDef = { key: 'condition', label: 'Condition' }

export const PRODUCT_CONFIGS: Record<string, ProductConfig> = {
  processor: {
    key: 'processor',
    title: 'Processor stock',
    noun: 'processor',
    route: '/stock/processor',
    apiBase: '/api/stock/processor',
    identityKey: 'model',
    identityLabel: 'Model',
    columns: [
      { key: 'brand', label: 'Brand' },
      { key: 'family', label: 'Family' },
      { key: 'cores', label: 'Cores' },
      { key: 'total_threads', label: 'Threads' },
      { key: 'base_frequency', label: 'Base freq' },
    ],
    formFields: [
      { key: 'type', label: 'Type' },
      { key: 'family', label: 'Family' },
      { key: 'series', label: 'Series' },
      { key: 'brand', label: 'Brand' },
      { key: 'model', label: 'Model' },
      { key: 'cores', label: 'Cores' },
      { key: 'total_threads', label: 'Total threads' },
      { key: 'base_frequency', label: 'Base frequency' },
      { key: 'max_turbo_frequency', label: 'Max turbo frequency' },
      { key: 'cache_memory', label: 'Cache memory' },
    ],
    correlationFields: [
      { key: 'socket', label: 'Socket' },
      { key: 'socket_note', label: 'Socket note' },
      { key: 'is_server', label: 'Is server', kind: 'bool' },
      { key: 'needs_review', label: 'Needs review', kind: 'bool' },
    ],
    filterableFields: [
      { key: 'brand', label: 'Brand' },
      { key: 'family', label: 'Family' },
      { key: 'series', label: 'Series' },
      CONDITION_FILTER,
    ],
    searchFields: ['model', 'brand', 'family', 'series'],
  },
  memory: {
    key: 'memory',
    title: 'Memory stock',
    noun: 'memory module',
    route: '/stock/memory',
    apiBase: '/api/stock/memory',
    identityKey: 'product_name',
    identityLabel: 'Product name',
    columns: [
      { key: 'memory_brand', label: 'Brand' },
      { key: 'capacity', label: 'Capacity' },
      { key: 'generation', label: 'Generation' },
      { key: 'rank', label: 'Rank' },
    ],
    formFields: [
      { key: 'memory_brand', label: 'Memory brand' },
      { key: 'capacity', label: 'Capacity' },
      { key: 'generation', label: 'Generation' },
      { key: 'rank', label: 'Rank' },
      { key: 'product_name', label: 'Product name' },
    ],
    correlationFields: [
      { key: 'ram_type', label: 'RAM type' },
      { key: 'needs_review', label: 'Needs review', kind: 'bool' },
    ],
    filterableFields: [
      { key: 'memory_brand', label: 'Brand' },
      { key: 'generation', label: 'Generation' },
      CONDITION_FILTER,
    ],
    searchFields: ['product_name', 'memory_brand'],
  },
  ssd: {
    key: 'ssd',
    title: 'SSD stock',
    noun: 'SSD',
    route: '/stock/ssd',
    apiBase: '/api/stock/ssd',
    identityKey: 'product_name',
    identityLabel: 'Product name',
    columns: [
      { key: 'ssd_brand', label: 'Brand' },
      { key: 'interface', label: 'Interface' },
      { key: 'capacity', label: 'Capacity' },
      { key: 'form_factor', label: 'Form factor' },
      { key: 'speed', label: 'Speed' },
    ],
    formFields: [
      { key: 'ssd_brand', label: 'SSD brand' },
      { key: 'interface', label: 'Interface' },
      { key: 'capacity', label: 'Capacity' },
      { key: 'form_factor', label: 'Form factor' },
      { key: 'speed', label: 'Speed' },
      { key: 'product_name', label: 'Product name' },
    ],
    correlationFields: [{ key: 'needs_review', label: 'Needs review', kind: 'bool' }],
    filterableFields: [
      { key: 'ssd_brand', label: 'Brand' },
      { key: 'interface', label: 'Interface' },
      { key: 'form_factor', label: 'Form factor' },
      CONDITION_FILTER,
    ],
    searchFields: ['product_name', 'ssd_brand'],
  },
  hdd: {
    key: 'hdd',
    title: 'HDD stock',
    noun: 'HDD',
    route: '/stock/hdd',
    apiBase: '/api/stock/hdd',
    identityKey: 'product_name',
    identityLabel: 'Product name',
    columns: [
      { key: 'hdd_brand', label: 'Brand' },
      { key: 'interface', label: 'Interface' },
      { key: 'capacity', label: 'Capacity' },
      { key: 'form_factor', label: 'Form factor' },
      { key: 'rpm_speed', label: 'RPM' },
    ],
    formFields: [
      { key: 'hdd_brand', label: 'HDD brand' },
      { key: 'interface', label: 'Interface' },
      { key: 'capacity', label: 'Capacity' },
      { key: 'form_factor', label: 'Form factor' },
      { key: 'speed', label: 'Speed' },
      { key: 'rpm_speed', label: 'RPM speed' },
      { key: 'product_name', label: 'Product name' },
    ],
    correlationFields: [{ key: 'needs_review', label: 'Needs review', kind: 'bool' }],
    filterableFields: [
      { key: 'hdd_brand', label: 'Brand' },
      { key: 'interface', label: 'Interface' },
      { key: 'form_factor', label: 'Form factor' },
      CONDITION_FILTER,
    ],
    searchFields: ['product_name', 'hdd_brand'],
  },
}

export const PRODUCT_KEYS = Object.keys(PRODUCT_CONFIGS)
