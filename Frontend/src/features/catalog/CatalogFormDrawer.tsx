import { useEffect, useState } from 'react'
import { Button, Drawer, Field, Input, Select } from '@/components/ui'
import { CATALOG_CONFIG, emptyCatalogRow, type FieldDef } from './catalogConfig'
import { useMockDb } from '@/store/mockDbStore'
import { toast } from '@/store/uiStore'
import type { CatalogEntity } from '@/types/catalog'

type Row = Record<string, unknown> & { id?: number }

export function CatalogFormDrawer({
  entity,
  open,
  editing,
  onClose,
  onSaved,
}: {
  entity: CatalogEntity
  open: boolean
  editing: Row | null
  onClose: () => void
  onSaved: (id: number) => void
}) {
  const cfg = CATALOG_CONFIG[entity]
  const createCatalog = useMockDb((s) => s.createCatalog)
  const updateCatalog = useMockDb((s) => s.updateCatalog)

  const [form, setForm] = useState<Row>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      setErrors({})
      setForm(editing ? { ...editing } : emptyCatalogRow(entity))
    }
  }, [open, editing, entity])

  function set(key: string, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function save() {
    const errs: Record<string, string> = {}
    for (const f of cfg.fields) {
      if (f.required && !String(form[f.key] ?? '').trim()) errs[f.key] = `${f.label} is required.`
    }
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = form as any
    if (editing?.id != null) {
      updateCatalog(entity, editing.id, payload)
      toast.success(`${cfg.title.replace(' catalog', '')} SKU updated.`)
      onSaved(editing.id)
    } else {
      const created = createCatalog(entity, payload) as { id: number }
      toast.success(`${cfg.title.replace(' catalog', '')} SKU created.`)
      onSaved(created.id)
    }
    onClose()
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={editing ? `Edit ${entity} SKU` : `Add ${entity} SKU`}
      subtitle={editing ? String(editing[cfg.primaryKey] ?? editing.sku ?? '') : 'New catalog entry'}
      width={520}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>{editing ? 'Save changes' : 'Create SKU'}</Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        {cfg.fields.map((f) => (
          <FieldControl
            key={f.key}
            def={f}
            value={form[f.key]}
            error={errors[f.key]}
            onChange={(v) => set(f.key, v)}
          />
        ))}

        <PriceField label="Price · NEW" value={form.price_new as number | null} onChange={(v) => set('price_new', v)} />
        <PriceField label="Price · REFURB" value={form.price_refurb as number | null} onChange={(v) => set('price_refurb', v)} />
      </div>
      <p className="mt-3 text-[11px] text-muted">
        Leave a price empty to mark the SKU as “not offered” in that condition.
      </p>
    </Drawer>
  )
}

function FieldControl({
  def,
  value,
  error,
  onChange,
}: {
  def: FieldDef
  value: unknown
  error?: string
  onChange: (v: unknown) => void
}) {
  const span = def.type === 'list' || def.key === 'model_name' || def.key === 'label' ? 'col-span-2' : ''

  if (def.type === 'bool') {
    return (
      <label className="col-span-2 flex items-center gap-2 py-1 text-caption font-medium text-secondary">
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 accent-[var(--color-accent)]"
        />
        {def.label}
      </label>
    )
  }

  return (
    <Field label={def.label} required={def.required} error={error} className={span}>
      {def.type === 'select' ? (
        <Select value={String(value ?? '')} invalid={!!error} onChange={(e) => onChange(e.target.value)}>
          {def.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
      ) : def.type === 'number' ? (
        <Input
          type="number"
          value={(value as number) ?? 0}
          invalid={!!error}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
        />
      ) : def.type === 'list' ? (
        <Input
          value={Array.isArray(value) ? (value as string[]).join(', ') : ''}
          invalid={!!error}
          placeholder={def.placeholder}
          onChange={(e) =>
            onChange(
              e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
        />
      ) : (
        <Input
          value={String(value ?? '')}
          invalid={!!error}
          placeholder={def.placeholder}
          className={def.mono ? 'font-mono' : ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </Field>
  )
}

function PriceField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number | null
  onChange: (v: number | null) => void
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        min={0}
        value={value ?? ''}
        placeholder="not offered"
        className="font-mono"
        onChange={(e) => {
          const t = e.target.value.trim()
          onChange(t === '' ? null : Math.max(0, Number(t) || 0))
        }}
      />
    </Field>
  )
}
