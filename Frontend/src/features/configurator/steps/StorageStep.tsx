import { StepPicker } from '../StepPicker'
import { UsageBanner } from '../UsageBanner'
import { listStorage } from '../configuratorApi'
import { useConfiguratorStore, storageBaysUsed } from '@/store/configuratorStore'

export function StorageStep() {
  const chassis = useConfiguratorStore((s) => s.chassis)
  const storage = useConfiguratorStore((s) => s.storage)
  const formFactors = chassis?.option.drive_form_factors ?? ''
  const supportedInterfaces = chassis?.option.supported_interfaces ?? ''
  const driveBays = chassis?.option.drive_bays ?? null

  const baysUsed = storageBaysUsed({ processor: null, chassis: null, ram: null, storage })
  const hasRoom = driveBays == null || baysUsed < driveBays

  const banner = (
    <UsageBanner
      items={[
        {
          label: 'Drive bays',
          text: driveBays != null ? `${baysUsed} / ${driveBays}` : `${baysUsed} (no limit)`,
          full: driveBays != null && baysUsed >= driveBays,
        },
      ]}
    />
  )

  return (
    <StepPicker
      category="storage"
      stepNo={4}
      title="Storage"
      hint="Drives that fit the chassis bays and interfaces — add any mix of SSD/HDD/NVMe."
      ready={!!chassis}
      notReadyHint="Pick a chassis first — storage is filtered by its bays and interfaces."
      load={() => listStorage(formFactors, supportedInterfaces)}
      loadKey={`${formFactors || 'all'}|${supportedInterfaces || 'all'}`}
      multi
      capBanner={banner}
      // Cap the total number of drives at the chassis bay count (unlimited if unset).
      canSelect={() => hasRoom}
      canIncrement={() => hasRoom}
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
