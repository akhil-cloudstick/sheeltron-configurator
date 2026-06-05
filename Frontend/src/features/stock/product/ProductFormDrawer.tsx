import { useEffect, useState } from 'react'
import { Button, Drawer, Field, Input, Textarea, ErrorBanner } from '@/components/ui'
import { createProduct, updateProduct } from './productApi'
import type { ProductConfig } from './productConfig'
import { ApiError } from '@/lib/api'
import { toast } from '@/store/uiStore'
import type { ProductUnit } from '@/types/product'

type Form = Record<string, unknown>

function emptyForm(config: ProductConfig): Form {
  const f: Form = {
    condition_new: false,
    condition_refurbished: false,
    price_new: null,
    price_refurbished: null,
    remark: '',
  }
  for (const field of config.formFields) f[field.key] = ''
  for (const field of config.correlationFields ?? []) f[field.key] = field.kind === 'bool' ? false : ''
  return f
}

function toForm(config: ProductConfig, u: ProductUnit): Form {
  const f = emptyForm(config)
  for (const field of config.formFields) f[field.key] = u[field.key] ?? ''
  for (const field of config.correlationFields ?? []) {
    f[field.key] = field.kind === 'bool' ? !!u[field.key] : u[field.key] ?? ''
  }
  f.condition_new = u.condition_new
  f.condition_refurbished = u.condition_refurbished
  f.price_new = u.price_new
  f.price_refurbished = u.price_refurbished
  f.remark = u.remark ?? ''
  return f
}

export function ProductFormDrawer({
  config,
  open,
  editing,
  canEditPrice = true,
  canEditCompat = false,
  highlightFields = [],
  onClose,
  onSaved,
}: {
  config: ProductConfig
  open: boolean
  editing: ProductUnit | null
  canEditPrice?: boolean
  canEditCompat?: boolean
  highlightFields?: string[]
  onClose: () => void
  onSaved: (id: number) => void
}) {
  const [form, setForm] = useState<Form>(() => emptyForm(config))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [idError, setIdError] = useState<string | null>(null)
  const highlight = new Set(highlightFields)

  useEffect(() => {
    if (open) {
      setForm(editing ? toForm(config, editing) : emptyForm(config))
      setError(null)
      setIdError(null)
    }
  }, [open, editing, config])

  function set(key: string, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }))
  }
  function toggleCondition(which: 'new' | 'refurbished', on: boolean) {
    setForm((f) =>
      which === 'new'
        ? { ...f, condition_new: on, price_new: on ? f.price_new : null }
        : { ...f, condition_refurbished: on, price_refurbished: on ? f.price_refurbished : null },
    )
  }

  async function save() {
    setError(null)
    setIdError(null)
    if (!String(form[config.identityKey] ?? '').trim()) {
      setIdError(`${config.identityLabel} is required.`)
      return
    }
    setBusy(true)
    try {
      let savedId: number
      if (editing) {
        const saved = await updateProduct(config.apiBase, editing.id, form)
        savedId = saved.id
        toast.success(`${config.noun} #${saved.id} updated.`)
      } else {
        const saved = await createProduct(config.apiBase, form)
        savedId = saved.id
        toast.success(`${config.noun} #${saved.id} created.`)
      }
      onSaved(savedId)
      onClose()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Save failed.'
      if (new RegExp(config.identityLabel, 'i').test(msg)) setIdError(msg)
      else setError(msg)
    } finally {
      setBusy(false)
    }
  }

  const identityValue = String(form[config.identityKey] ?? '')

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={editing ? `Edit ${config.noun}` : `Add ${config.noun}`}
      subtitle={editing ? `#${editing.id} · ${identityValue || '—'}` : `New ${config.noun} record`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy ? 'Saving…' : editing ? 'Save changes' : `Create ${config.noun}`}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {error && <ErrorBanner message={error} />}
        {highlightFields.length > 0 && (
          <div className="rounded-card border border-warning/40 bg-warning-soft/40 px-3 py-2 text-caption text-secondary">
            This {config.noun} was imported with missing data. The highlighted field(s) are empty —
            fill them and save to clear the issue.
          </div>
        )}

        <Section title="Details">
          <div className="grid grid-cols-2 gap-3">
            {config.formFields.map((field) => {
              const isIdentity = field.key === config.identityKey
              return (
                <Field
                  key={field.key}
                  label={field.label}
                  required={isIdentity}
                  error={isIdentity ? idError ?? undefined : undefined}
                  hint={highlight.has(field.key) ? 'Missing — please fill' : undefined}
                >
                  <Input
                    value={String(form[field.key] ?? '')}
                    invalid={(isIdentity && !!idError) || highlight.has(field.key)}
                    onChange={(e) => set(field.key, e.target.value)}
                  />
                </Field>
              )
            })}
          </div>
        </Section>

        {canEditCompat && (config.correlationFields?.length ?? 0) > 0 && (
          <Section title="Compatibility (derived)">
            <p className="mb-2 text-[11px] text-muted">
              Keys the configurator filters on. Usually set by importing the correlation CSV —
              edit here to correct a row.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {config.correlationFields!.map((field) =>
                field.kind === 'bool' ? (
                  <div key={field.key} className="flex items-center pt-6">
                    <CheckRow
                      label={field.label}
                      checked={!!form[field.key]}
                      onChange={(on) => set(field.key, on)}
                    />
                  </div>
                ) : (
                  <Field key={field.key} label={field.label}>
                    <Input
                      value={String(form[field.key] ?? '')}
                      onChange={(e) => set(field.key, e.target.value)}
                    />
                  </Field>
                ),
              )}
            </div>
          </Section>
        )}

        <Section title="Condition & pricing">
          <p className="mb-2 text-[11px] text-muted">
            A unit can be both New and Refurbished.
            {canEditPrice ? ' Set a price per selected condition.' : ' Prices are set by an admin.'}
          </p>
          <div className="flex flex-col gap-3">
            <div className="flex gap-5">
              <CheckRow label="New" checked={!!form.condition_new} onChange={(on) => toggleCondition('new', on)} />
              <CheckRow
                label="Refurbished"
                checked={!!form.condition_refurbished}
                onChange={(on) => toggleCondition('refurbished', on)}
              />
            </div>

            {canEditPrice && (!!form.condition_new || !!form.condition_refurbished) && (
              <div className="grid grid-cols-2 gap-3">
                {!!form.condition_new && (
                  <PriceField
                    label="Price — New (₹)"
                    value={form.price_new as number | null}
                    onChange={(v) => set('price_new', v)}
                  />
                )}
                {!!form.condition_refurbished && (
                  <PriceField
                    label="Price — Refurbished (₹)"
                    value={form.price_refurbished as number | null}
                    onChange={(v) => set('price_refurbished', v)}
                  />
                )}
              </div>
            )}

            <Field label="Remark">
              <Textarea value={String(form.remark ?? '')} onChange={(e) => set('remark', e.target.value)} />
            </Field>
          </div>
        </Section>
      </div>
    </Drawer>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-meta uppercase text-muted">{title}</h3>
      {children}
    </section>
  )
}

function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (on: boolean) => void
}) {
  return (
    <label className="inline-flex cursor-pointer select-none items-center gap-2 text-body text-primary">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 cursor-pointer rounded border-border accent-accent"
      />
      {label}
    </label>
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
    <Field label={label} hint="Leave blank to set later.">
      <Input
        type="number"
        min={0}
        value={value ?? ''}
        placeholder="not set"
        className="font-mono"
        onChange={(e) => {
          const t = e.target.value.trim()
          onChange(t === '' ? null : Math.max(0, Number(t) || 0))
        }}
      />
    </Field>
  )
}
