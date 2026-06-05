import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  IconButton,
  Pill,
  PageHeader,
  PillTabs,
  Drawer,
  Field,
  Select,
  Input,
  TableWrap,
  THead,
  TH,
  TR,
  TD,
  TDActions,
  EmptyState,
  ConfirmModal,
  IconPlus,
  IconEdit,
  IconTrash,
  IconSliders,
} from '@/components/ui'
import { useMockDb } from '@/store/mockDbStore'
import { toast } from '@/store/uiStore'
import type { CompatOverride, OverrideKind } from '@/types/pricing'

export function CompatibilityOverrides() {
  const [kind, setKind] = useState<OverrideKind>('cpu')

  const chassis = useMockDb((s) => s.listCatalog('chassis'))
  const cpus = useMockDb((s) => s.listCatalog('cpus'))
  const ram = useMockDb((s) => s.listCatalog('ram'))
  const overrides = useMockDb((s) => s.listOverrides(kind))
  const removeOverride = useMockDb((s) => s.removeOverride)

  const targets = kind === 'cpu' ? cpus : ram

  const chassisName = useMemo(() => new Map(chassis.map((c) => [c.id, c.model_name])), [chassis])
  // RAM uses `label`; CPU uses `sku`.
  const targetLabel = useMemo(() => {
    const m = new Map<number, string>()
    for (const t of targets) m.set(t.id, kind === 'ram' ? (t as { label: string }).label : (t as { sku: string }).sku)
    return m
  }, [targets, kind])

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<CompatOverride | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CompatOverride | null>(null)

  function openAdd() {
    setEditing(null)
    setDrawerOpen(true)
  }
  function openEdit(o: CompatOverride) {
    setEditing(o)
    setDrawerOpen(true)
  }
  function confirmDelete() {
    if (!deleteTarget) return
    removeOverride(deleteTarget.id)
    toast.success('Override removed.')
    setDeleteTarget(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Compatibility overrides"
        description="Exceptions to the socket / RAM-type compatibility rules. Block wins when both exist."
        actions={
          <Button size="sm" onClick={openAdd}>
            <IconPlus width={14} height={14} />
            Add override
          </Button>
        }
      />

      <PillTabs
        value={kind}
        onChange={setKind}
        options={[
          { value: 'cpu', label: 'Chassis ↔ CPU' },
          { value: 'ram', label: 'Chassis ↔ RAM' },
        ]}
      />

      <TableWrap>
        <THead>
          <TR>
            <TH>Chassis</TH>
            <TH>{kind === 'cpu' ? 'CPU' : 'RAM'}</TH>
            <TH>Decision</TH>
            <TH>Note</TH>
            <TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <tbody>
          {overrides.length === 0 ? (
            <tr>
              <td colSpan={5}>
                <EmptyState
                  icon={<IconSliders width={28} height={28} />}
                  title="No overrides"
                  hint="Compatibility is fully rule-based until you add an exception."
                  action={
                    <Button size="sm" onClick={openAdd}>
                      <IconPlus width={14} height={14} />
                      Add override
                    </Button>
                  }
                />
              </td>
            </tr>
          ) : (
            overrides.map((o) => (
              <TR key={o.id}>
                <TD className="text-primary">{chassisName.get(o.chassisId) ?? `#${o.chassisId}`}</TD>
                <TD className="font-mono">{targetLabel.get(o.targetId) ?? `#${o.targetId}`}</TD>
                <TD>
                  <Pill tone={o.isCompatible ? 'success' : 'danger'}>
                    {o.isCompatible ? 'Allow' : 'Block'}
                  </Pill>
                </TD>
                <TD className="text-muted">{o.note || '—'}</TD>
                <TDActions>
                  <IconButton label="Edit" onClick={() => openEdit(o)}>
                    <IconEdit width={15} height={15} />
                  </IconButton>
                  <IconButton label="Delete" tone="danger" onClick={() => setDeleteTarget(o)}>
                    <IconTrash width={15} height={15} />
                  </IconButton>
                </TDActions>
              </TR>
            ))
          )}
        </tbody>
      </TableWrap>

      <OverrideDrawer
        kind={kind}
        open={drawerOpen}
        editing={editing}
        chassisOptions={chassis.map((c) => ({ id: c.id, label: c.model_name }))}
        targetOptions={targets.map((t) => ({
          id: t.id,
          label: kind === 'ram' ? (t as { label: string }).label : (t as { sku: string }).sku,
        }))}
        onClose={() => setDrawerOpen(false)}
      />

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Remove override"
        confirmLabel="Remove"
        danger
      >
        Remove this compatibility override?
      </ConfirmModal>
    </div>
  )
}

interface Opt {
  id: number
  label: string
}

function OverrideDrawer({
  kind,
  open,
  editing,
  chassisOptions,
  targetOptions,
  onClose,
}: {
  kind: OverrideKind
  open: boolean
  editing: CompatOverride | null
  chassisOptions: Opt[]
  targetOptions: Opt[]
  onClose: () => void
}) {
  const createOverride = useMockDb((s) => s.createOverride)
  const updateOverride = useMockDb((s) => s.updateOverride)

  const [chassisId, setChassisId] = useState<number>(0)
  const [targetId, setTargetId] = useState<number>(0)
  const [isCompatible, setIsCompatible] = useState(true)
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!open) return
    if (editing) {
      setChassisId(editing.chassisId)
      setTargetId(editing.targetId)
      setIsCompatible(editing.isCompatible)
      setNote(editing.note)
    } else {
      setChassisId(chassisOptions[0]?.id ?? 0)
      setTargetId(targetOptions[0]?.id ?? 0)
      setIsCompatible(true)
      setNote('')
    }
  }, [open, editing, chassisOptions, targetOptions])

  function save() {
    if (!chassisId || !targetId) {
      toast.error('Pick both a chassis and a target.')
      return
    }
    if (editing) {
      updateOverride(editing.id, { chassisId, targetId, isCompatible, note })
      toast.success('Override updated.')
    } else {
      createOverride({ kind, chassisId, targetId, isCompatible, note })
      toast.success('Override added.')
    }
    onClose()
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={editing ? 'Edit override' : 'Add override'}
      subtitle={kind === 'cpu' ? 'Chassis ↔ CPU exception' : 'Chassis ↔ RAM exception'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>{editing ? 'Save changes' : 'Add override'}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Chassis">
          <Select value={chassisId} onChange={(e) => setChassisId(Number(e.target.value))}>
            {chassisOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={kind === 'cpu' ? 'CPU' : 'RAM module'}>
          <Select value={targetId} onChange={(e) => setTargetId(Number(e.target.value))}>
            {targetOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Decision">
          <PillTabs
            value={isCompatible ? 'allow' : 'block'}
            onChange={(v) => setIsCompatible(v === 'allow')}
            options={[
              { value: 'allow', label: 'Allow' },
              { value: 'block', label: 'Block' },
            ]}
          />
        </Field>
        <Field label="Note" hint="Why this exception exists (BIOS cert, known issue…).">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Cert'd 2024" />
        </Field>
      </div>
    </Drawer>
  )
}
