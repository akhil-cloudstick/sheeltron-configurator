import { StepPicker } from '../StepPicker'
import { listStorage } from '../configuratorApi'
import { useConfiguratorStore } from '@/store/configuratorStore'

export function StorageStep() {
  const chassis = useConfiguratorStore((s) => s.chassis)
  const formFactors = chassis?.option.drive_form_factors ?? ''

  return (
    <StepPicker
      category="storage"
      stepNo={4}
      title="Storage"
      hint="Drives that fit the chassis's bay form factor(s)."
      ready={!!chassis}
      notReadyHint="Pick a chassis first — storage is filtered by its drive bays."
      load={() => listStorage(formFactors)}
      loadKey={formFactors || 'all'}
      facets={[
        { key: 'type', label: 'Type', get: (o) => o.type },
        { key: 'brand', label: 'Brand', get: (o) => o.brand },
        { key: 'speed', label: 'Speed', get: (o) => o.speed, numeric: true },
      ]}
      searchText={(o) => `${o.label} ${o.brand}`}
      specs={(o) => [
        ...(o.capacity ? [{ text: o.capacity }] : []),
        ...(o.type ? [{ text: o.type, tone: 'info' as const }] : []),
        ...(o.interface ? [{ text: o.interface }] : []),
        ...(o.form_factor ? [{ text: o.form_factor, tone: 'warning' as const }] : []),
      ]}
    />
  )
}
