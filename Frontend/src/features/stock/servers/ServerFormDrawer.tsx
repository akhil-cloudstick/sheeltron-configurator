import { useEffect, useState } from 'react'
import { Button, Drawer, Field, Input, Dropdown, Textarea, ErrorBanner } from '@/components/ui'
import { STATUS_OPTIONS } from './serverStatus'
import { createServer, updateServer } from './serversApi'
import { ApiError } from '@/lib/api'
import { toast } from '@/store/uiStore'
import type { ServerUnit, ServerUnitInput } from '@/types/server'

const EMPTY: ServerUnitInput = {
  brand: '', model: '',
  motherboard: '', heat_sink: '', fan: '', raid_card: '', cards: '', riser_1: '', riser_2: '',
  riser_3: '', back_plane: '', power_supply: '', status: 'need_check',
  model_family: '', cpu_socket: '', max_sockets: null, ram_type: '', drive_form_factors: '',
  datasheet: '', source: '', is_server: true, needs_review: false, compat_note: '',
  condition_new: false, condition_refurbished: false, price_new: null, price_refurbished: null,
  remark: '',
}

function toInput(s: ServerUnit): ServerUnitInput {
  const { id: _id, created_at: _c, updated_at: _u, ...rest } = s
  return rest
}

export function ServerFormDrawer({
  open,
  editing,
  canEditPrice = true,
  canEditCompat = false,
  onClose,
  onSaved,
}: {
  open: boolean
  editing: ServerUnit | null
  canEditPrice?: boolean
  canEditCompat?: boolean
  onClose: () => void
  onSaved: (id: number) => void
}) {
  const [form, setForm] = useState<ServerUnitInput>(EMPTY)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modelError, setModelError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setForm(editing ? toInput(editing) : EMPTY)
      setError(null)
      setModelError(null)
    }
  }, [open, editing])

  function set<K extends keyof ServerUnitInput>(key: K, value: ServerUnitInput[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  // Toggle a condition; turning one off also clears its price.
  function toggleCondition(which: 'new' | 'refurbished', on: boolean) {
    setForm((f) =>
      which === 'new'
        ? { ...f, condition_new: on, price_new: on ? f.price_new : null }
        : { ...f, condition_refurbished: on, price_refurbished: on ? f.price_refurbished : null },
    )
  }

  async function save() {
    setError(null)
    setModelError(null)
    if (!form.model.trim()) {
      setModelError('Model is required.')
      return
    }
    setBusy(true)
    try {
      let savedId: number
      if (editing) {
        const saved = await updateServer(editing.id, form)
        savedId = saved.id
        toast.success(`Chassis #${saved.id} (${saved.model || '—'}) updated.`)
      } else {
        const saved = await createServer(form)
        savedId = saved.id
        toast.success(`Chassis #${saved.id} (${saved.model || '—'}) created.`)
      }
      onSaved(savedId)
      onClose()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Save failed.'
      if (/model/i.test(msg)) setModelError(msg)
      else setError(msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={editing ? 'Edit chassis' : 'Add chassis'}
      subtitle={editing ? `#${editing.id} · ${editing.model || '—'}` : 'New physical chassis inventory record'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Create chassis'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {error && <ErrorBanner message={error} />}

        <Section title="Identity">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Brand" htmlFor="brand">
              <Input id="brand" value={form.brand} onChange={(e) => set('brand', e.target.value)} />
            </Field>
            <Field
              label="Model"
              htmlFor="model"
              required
              error={modelError ?? undefined}
            >
              <Input
                id="model"
                value={form.model}
                invalid={!!modelError}
                onChange={(e) => set('model', e.target.value)}
              />
            </Field>
          </div>
        </Section>

        <Section title="Hardware">
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Motherboard" value={form.motherboard} onChange={(v) => set('motherboard', v)} />
            <TextField label="Heat sink" value={form.heat_sink} onChange={(v) => set('heat_sink', v)} />
            <TextField label="Fan" value={form.fan} onChange={(v) => set('fan', v)} />
            <TextField label="RAID card" value={form.raid_card} onChange={(v) => set('raid_card', v)} />
            <TextField label="Cards" value={form.cards} onChange={(v) => set('cards', v)} className="col-span-2" />
            <TextField label="Riser 1" value={form.riser_1} onChange={(v) => set('riser_1', v)} />
            <TextField label="Riser 2" value={form.riser_2} onChange={(v) => set('riser_2', v)} />
            <TextField label="Riser 3" value={form.riser_3} onChange={(v) => set('riser_3', v)} />
            <TextField label="Back plane" value={form.back_plane} onChange={(v) => set('back_plane', v)} />
            <TextField label="Power supply" value={form.power_supply} onChange={(v) => set('power_supply', v)} className="col-span-2" />
          </div>
        </Section>

        <Section title="Status">
          <Field label="Status">
            <Dropdown
              value={form.status}
              onChange={(v) => set('status', v as ServerUnitInput['status'])}
              options={STATUS_OPTIONS}
              ariaLabel="Status"
            />
          </Field>
        </Section>

        {canEditCompat && (
          <Section title="Compatibility (derived)">
            <p className="mb-2 text-[11px] text-muted">
              Keys the configurator filters on. Usually set by importing the correlation CSV —
              edit here to correct a row.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Model family" value={form.model_family} onChange={(v) => set('model_family', v)} />
              <TextField label="CPU socket" value={form.cpu_socket} onChange={(v) => set('cpu_socket', v)} />
              <Field label="Max sockets">
                <Input
                  type="number"
                  min={0}
                  value={form.max_sockets ?? ''}
                  placeholder="not set"
                  onChange={(e) => {
                    const t = e.target.value.trim()
                    set('max_sockets', t === '' ? null : Math.max(0, Number(t) || 0))
                  }}
                />
              </Field>
              <TextField label="RAM type" value={form.ram_type} onChange={(v) => set('ram_type', v)} />
              <TextField
                label="Drive form factors"
                value={form.drive_form_factors}
                onChange={(v) => set('drive_form_factors', v)}
                className="col-span-2"
              />
              <TextField label="Datasheet" value={form.datasheet} onChange={(v) => set('datasheet', v)} />
              <TextField label="Source" value={form.source} onChange={(v) => set('source', v)} />
              <div className="col-span-2 flex gap-5 pt-1">
                <CheckRow label="Is server" checked={form.is_server} onChange={(on) => set('is_server', on)} />
                <CheckRow
                  label="Needs review"
                  checked={form.needs_review}
                  onChange={(on) => set('needs_review', on)}
                />
              </div>
              <Field label="Compatibility note" className="col-span-2">
                <Textarea value={form.compat_note} onChange={(e) => set('compat_note', e.target.value)} />
              </Field>
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
              <CheckRow
                label="New"
                checked={form.condition_new}
                onChange={(on) => toggleCondition('new', on)}
              />
              <CheckRow
                label="Refurbished"
                checked={form.condition_refurbished}
                onChange={(on) => toggleCondition('refurbished', on)}
              />
            </div>

            {canEditPrice && (form.condition_new || form.condition_refurbished) && (
              <div className="grid grid-cols-2 gap-3">
                {form.condition_new && (
                  <PriceField
                    label="Price — New (₹)"
                    value={form.price_new}
                    onChange={(v) => set('price_new', v)}
                  />
                )}
                {form.condition_refurbished && (
                  <PriceField
                    label="Price — Refurbished (₹)"
                    value={form.price_refurbished}
                    onChange={(v) => set('price_refurbished', v)}
                  />
                )}
              </div>
            )}

            <Field label="Remark" htmlFor="remark">
              <Textarea id="remark" value={form.remark} onChange={(e) => set('remark', e.target.value)} />
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

function TextField({
  label,
  value,
  onChange,
  className,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  className?: string
}) {
  return (
    <Field label={label} className={className}>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </Field>
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
