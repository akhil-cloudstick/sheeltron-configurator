import { useEffect, useState } from 'react'
import { Button, Drawer, Field, Input, Select, Textarea } from '@/components/ui'
import { STOCK_KIND_CONFIG } from './genericStockConfig'
import { useMockDb } from '@/store/mockDbStore'
import { toast } from '@/store/uiStore'
import {
  STOCK_CONDITIONS,
  STOCK_STATES,
  type GenericStockRow,
  type StockKind,
} from '@/types/stock'

const EMPTY: Omit<GenericStockRow, 'id'> = {
  sku: '', label: '', spec: '', condition: 'refurb', quantity: 1, location: '', state: 'in_stock', remark: '',
}

export function GenericStockDrawer({
  kind,
  open,
  editing,
  onClose,
  onSaved,
}: {
  kind: StockKind
  open: boolean
  editing: GenericStockRow | null
  onClose: () => void
  onSaved: (id: number) => void
}) {
  const cfg = STOCK_KIND_CONFIG[kind]
  const createStock = useMockDb((s) => s.createStock)
  const updateStock = useMockDb((s) => s.updateStock)

  const [form, setForm] = useState<Omit<GenericStockRow, 'id'>>(EMPTY)
  const [skuError, setSkuError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setSkuError(null)
      if (editing) {
        const { id: _id, ...rest } = editing
        setForm(rest)
      } else {
        setForm(EMPTY)
      }
    }
  }, [open, editing])

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function save() {
    if (!form.sku.trim()) {
      setSkuError('SKU is required.')
      return
    }
    if (editing) {
      updateStock(kind, editing.id, form)
      toast.success(`${form.sku} updated.`)
      onSaved(editing.id)
    } else {
      const created = createStock(kind, form)
      toast.success(`${form.sku} added to stock.`)
      onSaved(created.id)
    }
    onClose()
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={editing ? `Edit ${cfg.title.replace(' stock', '')} stock` : `Add ${cfg.title.replace(' stock', '')} stock`}
      subtitle={editing ? `${editing.label || editing.sku}` : 'New mock inventory record'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>{editing ? 'Save changes' : 'Add to stock'}</Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="SKU" required error={skuError ?? undefined}>
          <Input value={form.sku} invalid={!!skuError} onChange={(e) => set('sku', e.target.value)} className="font-mono" />
        </Field>
        <Field label="Quantity">
          <Input
            type="number"
            min={0}
            value={form.quantity}
            onChange={(e) => set('quantity', Number(e.target.value) || 0)}
          />
        </Field>
        <Field label="Label" className="col-span-2">
          <Input value={form.label} onChange={(e) => set('label', e.target.value)} />
        </Field>
        <Field label={cfg.specLabel} className="col-span-2">
          <Input value={form.spec} onChange={(e) => set('spec', e.target.value)} placeholder={cfg.specPlaceholder} />
        </Field>
        <Field label="Condition">
          <Select value={form.condition} onChange={(e) => set('condition', e.target.value as GenericStockRow['condition'])}>
            {STOCK_CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c === 'new' ? 'New' : 'Refurbished'}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="State">
          <Select value={form.state} onChange={(e) => set('state', e.target.value as GenericStockRow['state'])}>
            {STOCK_STATES.map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ')}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Location" className="col-span-2">
          <Input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Rack A-1" />
        </Field>
        <Field label="Remark" className="col-span-2">
          <Textarea value={form.remark} onChange={(e) => set('remark', e.target.value)} />
        </Field>
      </div>
    </Drawer>
  )
}
