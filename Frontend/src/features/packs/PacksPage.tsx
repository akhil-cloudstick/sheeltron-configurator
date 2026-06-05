import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PageHeader,
  Button,
  IconButton,
  TableWrap,
  THead,
  TH,
  TR,
  TD,
  TDActions,
  LoadingRow,
  EmptyState,
  ErrorBanner,
  ConfirmModal,
  IconPlus,
  IconTrash,
  IconBox,
} from '@/components/ui'
import { ApiError } from '@/lib/api'
import { toast } from '@/store/uiStore'
import { listPacks, deletePack } from '@/features/configurator/configuratorApi'
import { money } from '@/features/configurator/format'
import type { SavedPack } from '@/features/configurator/types'

export function PacksPage() {
  const navigate = useNavigate()
  const [packs, setPacks] = useState<SavedPack[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<SavedPack | null>(null)
  const [busy, setBusy] = useState(false)

  function load() {
    setLoading(true)
    setError(null)
    listPacks()
      .then(setPacks)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load packs.'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  async function confirmDelete() {
    if (!toDelete) return
    setBusy(true)
    try {
      await deletePack(toDelete.id)
      toast.success(`Pack ${toDelete.pack_number} deleted.`)
      setToDelete(null)
      load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not delete the pack.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <PageHeader
          title="Compatibility"
          description="Prebuilt, socket-compatible server setups your sales team can sell in one pick."
        />
        <Button onClick={() => navigate('/compatibility/build')}>
          <IconPlus width={14} height={14} />
          Build new pack
        </Button>
      </div>

      {error && <ErrorBanner message={error} onRetry={load} />}

      <TableWrap className="min-h-0 flex-1 overflow-auto">
        <THead>
          <TR>
            <TH className="w-32">Pack</TH>
            <TH>Name</TH>
            <TH className="w-24 text-right">Items</TH>
            <TH className="w-32 text-right">Grand total</TH>
            <TH className="w-28">By</TH>
            <TH className="w-44">Created</TH>
            <TH className="w-16 text-right">Actions</TH>
          </TR>
        </THead>
        <tbody>
          {loading ? (
            <LoadingRow colSpan={7} />
          ) : packs.length === 0 ? (
            <tr>
              <td colSpan={7}>
                <EmptyState
                  icon={<IconBox width={28} height={28} />}
                  title="No packs yet"
                  hint="Build a compatible pack so salesmen can sell it without the full wizard."
                />
              </td>
            </tr>
          ) : (
            packs.map((p) => (
              <tr
                key={p.id}
                onClick={() => navigate(`/compatibility/${p.id}`)}
                className="cursor-pointer border-b border-border last:border-0 hover:bg-subtle/70"
              >
                <TD className="font-mono font-semibold text-primary">{p.pack_number}</TD>
                <TD>
                  <div className="text-primary">{p.name || '—'}</div>
                  {p.description && <div className="text-[11px] text-muted">{p.description}</div>}
                </TD>
                <TD className="text-right tabular-nums text-secondary">{p.lines.length}</TD>
                <TD className="text-right font-mono tabular-nums text-primary">{money(p.grand_total)}</TD>
                <TD className="text-secondary">{p.created_by}</TD>
                <TD className="text-secondary">
                  {p.created_at ? new Date(p.created_at).toLocaleString() : '—'}
                </TD>
                <TDActions>
                  <IconButton
                    label="Delete pack"
                    onClick={(e) => {
                      e.stopPropagation()
                      setToDelete(p)
                    }}
                  >
                    <IconTrash width={15} height={15} />
                  </IconButton>
                </TDActions>
              </tr>
            ))
          )}
        </tbody>
      </TableWrap>

      <ConfirmModal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title={`Delete pack ${toDelete?.pack_number ?? ''}?`}
        confirmLabel="Delete"
        danger
        busy={busy}
      >
        This removes the pack for everyone. Saved quotes are not affected.
      </ConfirmModal>
    </div>
  )
}
