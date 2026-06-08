import { StepPicker } from '../StepPicker'
import { UsageBanner } from '../UsageBanner'
import { listMemory } from '../configuratorApi'
import { useConfiguratorStore } from '@/store/configuratorStore'

export function RamStep() {
  const chassis = useConfiguratorStore((s) => s.chassis)
  const ram = useConfiguratorStore((s) => s.ram)
  const ramType = chassis?.option.ram_type ?? ''
  const maxSlots = chassis?.option.max_dimm_slots ?? null
  const maxGb = chassis?.option.max_memory_gb ?? null

  const slotsUsed = ram ? ram.qty : 0
  const gbUsed = ram ? (ram.option.capacity_gb ?? 0) * ram.qty : 0

  const banner = (
    <UsageBanner
      items={[
        {
          label: 'DIMM slots',
          text: maxSlots != null ? `${slotsUsed} / ${maxSlots}` : `${slotsUsed}`,
          full: maxSlots != null && slotsUsed >= maxSlots,
        },
        {
          label: 'Memory',
          text: maxGb != null ? `${gbUsed} / ${maxGb} GB` : `${gbUsed} GB`,
          full: maxGb != null && gbUsed >= maxGb,
        },
      ]}
    />
  )

  return (
    <StepPicker
      category="ram"
      stepNo={3}
      title="RAM"
      hint="Memory limited to the chassis's DDR generation, DIMM slots and max capacity."
      ready={!!ramType}
      notReadyHint="Pick a chassis first — memory is filtered by its RAM type."
      load={() => listMemory(ramType)}
      loadKey={ramType}
      maxQty={maxSlots ?? undefined}
      capBanner={banner}
      // Block adding another module if it would exceed the chassis max memory.
      canIncrement={(o, qty) =>
        maxGb == null ? true : (qty + 1) * (o.capacity_gb ?? 0) <= maxGb
      }
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
