import { useState } from 'react'
import { Button, Modal, FileDrop, ErrorBanner, IconDownload } from '@/components/ui'
import { ApiError } from '@/lib/api'
import { toast } from '@/store/uiStore'
import type { ImportResult } from '@/types/server'

/**
 * Super-admin only. Uploads a Corelation/ CSV (cpus / chassis / ram / storage) to
 * enrich existing stock rows with derived compatibility keys (socket, ram_type,
 * form factor, needs_review…). Rows are matched by identity; unmatched rows are
 * inserted. Distinct from the normal stock import — it writes only the compat keys.
 */
export function CorrelationImportDialog({
  open,
  onClose,
  onImported,
  noun,
  identityLabel,
  importFn,
  templateUrl,
  extraNote,
}: {
  open: boolean
  onClose: () => void
  onImported: () => void
  noun: string
  identityLabel: string
  importFn: (file: File) => Promise<ImportResult>
  templateUrl: string
  extraNote?: string
}) {
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)

  function reset() {
    setFile(null)
    setError(null)
    setResult(null)
    setBusy(false)
  }
  function close() {
    reset()
    onClose()
  }

  async function run() {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const res = await importFn(file)
      setResult(res)
      toast.success(`Correlation applied: ${res.inserted} new, ${res.updated} enriched.`)
      onImported()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Correlation import failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={`Import ${noun} correlation`}
      width={760}
      footer={
        result ? (
          <Button onClick={close}>Done</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={close} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={run} disabled={!file || busy}>
              {busy ? 'Importing…' : 'Apply correlation'}
            </Button>
          </>
        )
      }
    >
      {error && (
        <div className="mb-3">
          <ErrorBanner message={error} />
        </div>
      )}

      {!result ? (
        <div className="flex flex-col gap-3">
          <p className="text-caption text-muted">
            Upload the generated <code className="font-mono">{noun}</code> correlation{' '}
            <code className="font-mono">.csv</code> from <code className="font-mono">Corelation/</code>.
            Rows are matched by <strong>{identityLabel.toLowerCase()}</strong> and their{' '}
            <strong>compatibility keys</strong> (socket / RAM type / form factor / needs-review) are
            filled in; rows with no stock match are added. Conditions and prices are not touched.
            {extraNote && (
              <>
                {' '}
                <strong>{extraNote}</strong>
              </>
            )}
          </p>
          <div>
            <a href={templateUrl} download>
              <Button variant="secondary" size="sm">
                <IconDownload width={14} height={14} />
                Correlation template
              </Button>
            </a>
          </div>
          <FileDrop
            accept=".xlsx,.xls,.xlsm,.csv"
            file={file}
            onFile={setFile}
            hint="Accepted: .xlsx, .xls, .xlsm, .csv"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="Added" value={result.inserted} tone="text-success" />
            <Stat label="Enriched" value={result.updated} tone="text-info" />
            <Stat label="Skipped" value={result.skipped} tone="text-warning" />
          </div>
          <p className="text-caption text-muted">
            <strong className="text-success">{result.inserted}</strong> added,{' '}
            <strong className="text-info">{result.updated}</strong> enriched with compatibility keys,{' '}
            <strong className="text-warning">{result.skipped}</strong> unchanged/duplicate.
          </p>
        </div>
      )}
    </Modal>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-card border border-border bg-subtle px-2 py-3">
      <div className={`font-display text-2xl font-bold ${tone}`}>{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
    </div>
  )
}
