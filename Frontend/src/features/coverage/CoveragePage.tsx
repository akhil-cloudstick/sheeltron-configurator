import { useEffect, useState } from 'react'
import { PageHeader, ErrorBanner } from '@/components/ui'
import { fetchCoverage, type Coverage, type CoverageBar } from './coverageApi'
import { ApiError } from '@/lib/api'

// Theme ported 1:1 from Corelation/compatibility-explorer.html (the "Coverage by socket" tab).
const LINE = '#e6e7eb'
const MUTED = '#6b7280'
const INK = '#1a1a1f'
const RED = '#e53935'
const CHASSIS = '#3730a3'
const FLAG = '#b91c1c'

const boxStyle: React.CSSProperties = {
  background: '#fff',
  border: `1px solid ${LINE}`,
  borderRadius: 14,
  padding: '14px 16px',
}

export function CoveragePage() {
  const [data, setData] = useState<Coverage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  function load() {
    setLoading(true)
    setError(null)
    fetchCoverage()
      .then((d) => setData(d))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load coverage.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const matrixMax = Math.max(
    1,
    ...(data?.socket_matrix.flatMap((r) => [r.cpus, r.chassis]) ?? [0]),
  )

  return (
    <div className="flex h-full flex-col gap-3 overflow-auto">
      <PageHeader
        title="Coverage by socket"
        description="CPU ↔ chassis compatibility coverage, computed live from the imported catalog."
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      {loading ? (
        <div className="py-10 text-center text-caption text-muted">Loading coverage…</div>
      ) : !data ? null : (
        <div className="flex flex-col gap-4" style={{ color: INK }}>
          {/* CPU ↔ Chassis — by socket (full width) */}
          <section style={boxStyle}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>CPU ↔ Chassis — by socket</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Socket', 'Server CPUs', 'Chassis models', 'Status'].map((h) => (
                    <th key={h} style={thStyle}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.socket_matrix.map((row) => {
                  const flagged = row.status === 'no_cpus'
                  return (
                    <tr key={row.socket} style={flagged ? { color: FLAG } : undefined}>
                      <td style={tdStyle}>
                        <b>{row.socket}</b>
                      </td>
                      <td style={tdStyle}>
                        <NumBar value={row.cpus} max={matrixMax} color={RED} />
                      </td>
                      <td style={tdStyle}>
                        <NumBar value={row.chassis} max={matrixMax} color={CHASSIS} />
                      </td>
                      <td style={tdStyle}>{flagged ? '⚠ chassis with no CPUs' : '✓'}</td>
                    </tr>
                  )
                })}
                {data.socket_matrix.length === 0 && (
                  <tr>
                    <td style={tdStyle} colSpan={4}>
                      <span style={{ color: MUTED }}>
                        No socket data yet — import the CPU and chassis correlation CSVs.
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <p style={{ marginTop: 6, fontSize: 13, color: MUTED }}>
              A CPU lists a chassis when sockets match. Red = chassis with no compatible CPU in stock.
            </p>
          </section>

          {/* Coverage cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 14,
            }}
          >
            <Card title="Chassis — by brand" bars={data.chassis_by_brand} color="#3730a3" />
            <Card title="Chassis — by RAM type" bars={data.chassis_by_ram_type} color="#065f46" />
            <Card title="Chassis — by drive form factor" bars={data.chassis_by_form_factor} color="#9a3412" />
            <Card title="RAM — by generation" bars={data.ram_by_generation} color="#065f46" />
            <Card title="RAM — by speed (MT/s)" bars={data.ram_by_speed} color="#16a34a" />
            <Card title="Storage — by type (HDD/SSD/NVMe)" bars={data.storage_by_type} color="#9a3412" />
            <Card title="Storage — by form factor" bars={data.storage_by_form_factor} color="#d97706" />
            <Card title="Storage — by interface" bars={data.storage_by_interface} color="#b45309" />
          </div>
        </div>
      )}
    </div>
  )
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '7px 10px',
  borderBottom: `1px solid ${LINE}`,
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '.05em',
  color: MUTED,
}

const tdStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '7px 10px',
  borderBottom: `1px solid ${LINE}`,
}

/** A count followed by a fixed-width (max 120px) bar — the explorer's row style. */
function NumBar({ value, max, color }: { value: number; max: number; color: string }) {
  const w = value > 0 ? Math.max(4, (120 * value) / max) : 0
  return (
    <span style={{ whiteSpace: 'nowrap' }}>
      {value}{' '}
      <span
        style={{
          height: 8,
          width: w,
          borderRadius: 4,
          background: color,
          display: 'inline-block',
          verticalAlign: 'middle',
        }}
      />
    </span>
  )
}

function Card({ title, bars, color }: { title: string; bars: CoverageBar[]; color: string }) {
  const max = Math.max(1, ...bars.map((b) => b.count))
  return (
    <section style={boxStyle}>
      <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{title}</h2>
      {bars.length === 0 ? (
        <p style={{ fontSize: 13, color: MUTED }}>No data yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <tbody>
            {bars.map((b) => (
              <tr key={b.label}>
                <td style={tdStyle}>
                  <b>{b.label}</b>
                </td>
                <td style={{ ...tdStyle, whiteSpace: 'nowrap', textAlign: 'right' }}>
                  <NumBar value={b.count} max={max} color={color} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
