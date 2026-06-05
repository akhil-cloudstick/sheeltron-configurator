import { useState } from 'react'
import { Button, Modal, FileDrop, ErrorBanner } from '@/components/ui'
import { importProducts } from './productApi'
import type { ProductConfig } from './productConfig'
import { ApiError } from '@/lib/api'
import { toast } from '@/store/uiStore'
import type { ImportResult } from '@/types/server'

export function ProductImportDialog({
  config,
  open,
  onClose,
  onImported,
}: {
  config: ProductConfig
  open: boolean
  onClose: () => void
  onImported: () => void
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
      const res = await importProducts(config.apiBase, file)
      setResult(res)
      toast.success(`Imported: ${res.inserted} new, ${res.updated} updated.`)
      onImported()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Import failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={`Bulk import ${config.noun} stock`}
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
              {busy ? 'Importing…' : 'Import file'}
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
            Upload an <code className="font-mono">.xlsx</code> or{' '}
            <code className="font-mono">.csv</code>. Rows are matched by{' '}
            <strong>{config.identityLabel.toLowerCase()}</strong>: a new one is added, an existing
            one has its changed fields refreshed, and unchanged rows are skipped.{' '}
            <strong>Condition and prices are not imported</strong> — set those in the UI. Rows with
            empty fields are still saved and flagged on the <strong>Issues</strong> page.
          </p>
          <FileDrop
            accept=".xlsx,.xls,.xlsm,.csv"
            file={file}
            onFile={setFile}
            hint="Accepted: .xlsx, .xls, .xlsm, .csv"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-4 gap-2 text-center">
            <Stat label="Saved" value={result.inserted} tone="text-success" />
            <Stat label="Updated" value={result.updated} tone="text-info" />
            <Stat label="Skipped" value={result.skipped} tone="text-warning" />
            <Stat label="Issues" value={result.issues ?? 0} tone="text-danger" />
          </div>
          <p className="text-caption text-muted">
            <strong className="text-success">{result.inserted}</strong> added,{' '}
            <strong className="text-info">{result.updated}</strong> refreshed,{' '}
            <strong className="text-warning">{result.skipped}</strong> unchanged/duplicate.
            {(result.issues ?? 0) > 0 && (
              <>
                {' '}
                <strong className="text-danger">{result.issues}</strong> row(s) have missing fields —
                fix them on the <strong>Issues</strong> page.
              </>
            )}
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
