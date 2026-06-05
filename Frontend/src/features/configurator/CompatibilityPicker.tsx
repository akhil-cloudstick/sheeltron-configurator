import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader, Button, Pill, ErrorBanner, EmptyState, IconBox } from '@/components/ui'
import { ApiError } from '@/lib/api'
import { useConfiguratorStore } from '@/store/configuratorStore'
import { listPacks } from './configuratorApi'
import { money, conditionLabel, conditionTone } from './format'
import { cn } from '@/lib/cn'
import type { SavedPack } from './types'

// Salesman "Compatibility" page — pick a ready, admin-built compatible setup and jump
// straight to the quote overview with it prefilled. Renders inside the admin shell.
export function CompatibilityPicker() {
  const navigate = useNavigate()
  const loadFromPack = useConfiguratorStore((s) => s.loadFromPack)

  const [packs, setPacks] = useState<SavedPack[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  function load() {
    setLoading(true)
    setError(null)
    listPacks()
      .then(setPacks)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load compatible setups.'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const selected = packs.find((p) => p.id === selectedId) ?? null

  function useSelected() {
    if (!selected) return
    loadFromPack(selected.lines.map((l) => ({ category: l.category, qty: l.qty, option: l.option })))
    navigate('/configurator/review')
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <PageHeader
        title="Compatibility"
        description="Ready, fully-compatible builds prepared by the team — pick one to quote in seconds."
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      {loading ? (
        <div className="py-10 text-center text-caption text-muted">Loading…</div>
      ) : packs.length === 0 ? (
        <EmptyState
          icon={<IconBox width={28} height={28} />}
          title="No compatible setups yet"
          hint="Once an admin prepares a compatible setup, it'll show up here for one-click selling."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {packs.map((p) => {
              const active = p.id === selectedId
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  style={active ? { boxShadow: '0 0 0 3px var(--color-accent-soft)' } : undefined}
                  className={cn(
                    'flex flex-col gap-2 rounded-card border bg-surface p-4 text-left transition-all duration-fast',
                    active ? 'border-accent' : 'border-border hover:-translate-y-px hover:border-border-strong hover:shadow-hover',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-body-strong text-body font-semibold text-primary">
                      {p.name || p.pack_number}
                    </span>
                    <span className="shrink-0 font-mono text-body font-bold tabular-nums text-primary">
                      {money(p.grand_total)}
                    </span>
                  </div>
                  {p.description && <p className="text-caption text-muted">{p.description}</p>}
                  <ul className="mt-1 flex flex-col gap-1">
                    {p.lines.map((l, i) => (
                      <li key={i} className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="truncate text-secondary">{l.option.label}</span>
                        <Pill tone={conditionTone(l.option.condition)}>{conditionLabel(l.option.condition)}</Pill>
                      </li>
                    ))}
                  </ul>
                </button>
              )
            })}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            {selected && (
              <span className="text-caption text-muted">
                Selected: <b className="text-secondary">{selected.name || selected.pack_number}</b>
              </span>
            )}
            <Button disabled={!selected} onClick={useSelected}>
              Use this setup →
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
