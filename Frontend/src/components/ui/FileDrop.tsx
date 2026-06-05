import { useRef, useState, type DragEvent } from 'react'
import { IconUpload } from './Icons'
import { cn } from '@/lib/cn'

export function FileDrop({
  accept,
  file,
  onFile,
  hint,
}: {
  accept: string
  file: File | null
  onFile: (f: File | null) => void
  hint?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) onFile(f)
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        'flex w-full flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed px-4 py-8 text-center transition-colors duration-fast',
        dragging ? 'border-accent bg-accent-soft/40' : 'border-border-strong bg-subtle hover:bg-subtle/70',
      )}
    >
      <span className="text-muted">
        <IconUpload width={22} height={22} />
      </span>
      {file ? (
        <span className="text-caption font-semibold text-primary">{file.name}</span>
      ) : (
        <span className="text-caption font-semibold text-secondary">
          Drop a file here or click to browse
        </span>
      )}
      {hint && <span className="text-[11px] text-muted">{hint}</span>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
    </button>
  )
}
