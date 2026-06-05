// Full key/value detail view for a stock record — shows EVERY column the backend
// returns (including the derived compatibility keys: socket, ram_type, form factors,
// needs_review, datasheet, …). Rendered as an expandable detail row for super-admins.

const money = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v)

// Friendly labels for keys that don't humanize cleanly.
const LABELS: Record<string, string> = {
  id: 'ID',
  cpu_socket: 'CPU socket',
  ram_type: 'RAM type',
  max_sockets: 'Max sockets',
  drive_form_factors: 'Drive form factors',
  is_server: 'Is server',
  needs_review: 'Needs review',
  socket_note: 'Socket note',
  compat_note: 'Compatibility note',
  rpm_speed: 'RPM speed',
  ssd_brand: 'SSD brand',
  hdd_brand: 'HDD brand',
  memory_brand: 'Memory brand',
  total_threads: 'Total threads',
  base_frequency: 'Base frequency',
  max_turbo_frequency: 'Max turbo frequency',
  cache_memory: 'Cache memory',
  product_name: 'Product name',
  model_family: 'Model family',
  price_new: 'Price (new)',
  price_refurbished: 'Price (refurbished)',
  condition_new: 'Condition: new',
  condition_refurbished: 'Condition: refurbished',
  created_at: 'Created',
  updated_at: 'Updated',
}

function humanize(key: string): string {
  if (LABELS[key]) return LABELS[key]
  return key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}

function formatValue(key: string, value: unknown): { text: string; tone?: string } {
  if (value === null || value === undefined || value === '') return { text: '—', tone: 'text-muted' }
  if (typeof value === 'boolean') {
    return value
      ? { text: 'Yes', tone: 'text-success' }
      : { text: 'No', tone: 'text-muted' }
  }
  if ((key === 'price_new' || key === 'price_refurbished') && typeof value === 'number') {
    return { text: money(value) }
  }
  if (key === 'created_at' || key === 'updated_at') {
    const d = new Date(String(value))
    return { text: isNaN(d.getTime()) ? String(value) : d.toLocaleString() }
  }
  return { text: String(value) }
}

export function DetailGrid({
  record,
  hideKeys = [],
}: {
  record: Record<string, unknown>
  hideKeys?: string[]
}) {
  const entries = Object.entries(record).filter(([k]) => !hideKeys.includes(k))
  return (
    <div className="rounded-card border border-border bg-subtle p-3">
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 md:grid-cols-3 lg:grid-cols-4">
        {entries.map(([k, v]) => {
          const { text, tone } = formatValue(k, v)
          return (
            <div key={k} className="flex min-w-0 flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                {humanize(k)}
              </span>
              <span className={`truncate text-caption ${tone ?? 'text-primary'}`} title={text}>
                {text}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
