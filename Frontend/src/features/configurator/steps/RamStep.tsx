import { StepPicker } from '../StepPicker'
import { listMemory } from '../configuratorApi'
import { useConfiguratorStore } from '@/store/configuratorStore'

export function RamStep() {
  const chassis = useConfiguratorStore((s) => s.chassis)
  const ramType = chassis?.option.ram_type ?? ''

  return (
    <StepPicker
      category="ram"
      stepNo={3}
      title="RAM"
      hint="Memory limited to the chassis's DDR generation."
      ready={!!ramType}
      notReadyHint="Pick a chassis first — memory is filtered by its RAM type."
      load={() => listMemory(ramType)}
      loadKey={ramType}
      facets={[
        { key: 'brand', label: 'Brand', get: (o) => o.brand },
        { key: 'speed', label: 'Speed', get: (o) => o.speed, numeric: true },
      ]}
      searchText={(o) => `${o.label} ${o.brand}`}
      specs={(o) => [
        ...(o.capacity ? [{ text: o.capacity }] : []),
        ...(o.ram_type ? [{ text: o.ram_type, tone: 'success' as const }] : []),
        ...(o.speed ? [{ text: `${o.speed} MT/s` }] : []),
      ]}
    />
  )
}
