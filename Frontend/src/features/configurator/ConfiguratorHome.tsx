import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Pill,
  PillTabs,
  ErrorBanner,
  LoadingRow,
  EmptyState,
  IconBox,
  IconSliders,
} from '@/components/ui'
import { ApiError } from '@/lib/api'
import { useConfiguratorStore } from '@/store/configuratorStore'
import { listPacks } from './configuratorApi'
import { money, conditionLabel, conditionTone } from './format'
import { cn } from '@/lib/cn'
import type { SavedPack } from './types'

type Mode = 'build' | 'packs'

// Salesman entry — renders inside the admin shell (sidebar stays visible). Two options:
// build to order (default) or start from an admin-built ready-made pack.
export function ConfiguratorHome() {
  const navigate = useNavigate()
  const loadFromPack = useConfiguratorStore((s) => s.loadFromPack)

  const [mode, setMode] = useState<Mode>('build')

  function startFresh() {
    useConfiguratorStore.getState().reset()
    navigate('/configurator/processor')
  }

  function usePack(pack: SavedPack) {
    loadFromPack(pack.lines.map((l) => ({ category: l.category, qty: l.qty, option: l.option })))
    navigate('/configurator/review')
  }

  return (
    <div className="flex h-full flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-bold leading-tight text-primary">Start a quote</h1>
        <p className="mt-0.5 text-caption text-muted">
          Configure a server yourself, or start from a ready-made pack the team has prepared.
        </p>
      </div>

      <PillTabs
        value={mode}
        onChange={setMode}
        options={[
          { value: 'build', label: 'Build to order' },
          { value: 'packs', label: 'Ready-made packs' },
        ]}
      />

      {mode === 'build' ? <BuildPane onStart={startFresh} /> : <PacksPane onUse={usePack} />}
    </div>
  )
}

function BuildPane({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="max-w-md rounded-card border border-border bg-surface p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent-on-soft">
          <IconSliders width={22} height={22} />
        </div>
        <h2 className="mt-4 font-display text-lg font-bold text-primary">Build to order</h2>
        <p className="mt-1 text-caption text-muted">
          Pick a CPU first; everything downstream narrows to socket-compatible parts. Five quick steps to a priced quote.
        </p>
        <Button className="mt-5" onClick={onStart}>
          Start configuring →
        </Button>
      </div>
    </div>
  )
}

function PacksPane({ onUse }: { onUse: (pack: SavedPack) => void }) {
  const [packs, setPacks] = useState<SavedPack[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  function load() {
    setLoading(true)
    setError(null)
    listPacks()
      .then(setPacks)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load packs.'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const selected = packs.find((p) => p.id === selectedId) ?? null

  if (loading) {
    return (
      <table className="w-full">
        <tbody>
          <LoadingRow colSpan={1} />
        </tbody>
      </table>
    )
  }
  if (error) return <ErrorBanner message={error} onRetry={load} />
  if (packs.length === 0) {
    return (
      <EmptyState
        icon={<IconBox width={28} height={28} />}
        title="No ready-made packs yet"
        hint="Once an admin builds a compatible pack, it'll show up here for one-click selling."
      />
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
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
                <span className="font-body-strong text-body font-semibold text-primary">{p.name || p.pack_number}</span>
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
        <Button disabled={!selected} onClick={() => selected && onUse(selected)}>
          Use this pack →
        </Button>
      </div>
    </div>
  )
}
