import { useState } from 'react'
import { Button, Modal, FileDrop, ErrorBanner } from '@/components/ui'
import { importServers } from './serversApi'
import { ApiError } from '@/lib/api'
import { toast } from '@/store/uiStore'
import type { ImportResult } from '@/types/server'

export function ImportDialog({
  open,
  onClose,
  onImported,
}: {
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
      const res = await importServers(file)
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
      title="Bulk import chassis stock"
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
      {error && <div className="mb-3"><ErrorBanner message={error} /></div>}

      {!result ? (
        <div className="flex flex-col gap-3">
          <p className="text-caption text-muted">
            Upload an <code className="font-mono">.xlsx</code> or{' '}
            <code className="font-mono">.csv</code>. Rows are matched by <strong>model</strong>:
            a new model is added, an existing model has its changed fields refreshed, and
            unchanged rows are skipped. <strong>Condition and prices are not imported</strong> —
            set those in the UI after import.
          </p>
          <FileDrop
            accept=".xlsx,.xls,.xlsm,.csv"
            file={file}
            onFile={setFile}
            hint="Accepted: .xlsx, .xls, .xlsm, .csv"
          />
        </div>
      ) : (
        <ImportSummary result={result} />
      )}
    </Modal>
  )
}

function ImportSummary({ result }: { result: ImportResult }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Saved" value={result.inserted} tone="text-success" />
        <Stat label="Updated" value={result.updated} tone="text-info" />
        <Stat label="Skipped" value={result.skipped} tone="text-warning" />
      </div>
      <p className="text-caption text-muted">
        <strong className="text-success">{result.inserted}</strong> new model(s) added,{' '}
        <strong className="text-info">{result.updated}</strong> existing refreshed, and{' '}
        <strong className="text-warning">{result.skipped}</strong> unchanged/duplicate row(s)
        skipped.
      </p>
    </div>
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
