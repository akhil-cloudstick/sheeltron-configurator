import { StepPicker } from '../StepPicker'
import { listChassis } from '../configuratorApi'
import { useConfiguratorStore } from '@/store/configuratorStore'

// CPU quantity → which chassis socket counts are valid:
//   1 CPU  → 1- or 2-socket chassis
//   2 CPUs → 2-socket only
//   3-4    → 4-socket only
function allowedSockets(cpuQty: number): number[] {
  if (cpuQty <= 1) return [1, 2]
  if (cpuQty === 2) return [2]
  return [4]
}

export function ChassisStep() {
  const processor = useConfiguratorStore((s) => s.processor)
  const socket = processor?.option.socket ?? ''
  const cpuQty = processor?.qty ?? 1
  const allowed = allowedSockets(cpuQty)

  return (
    <StepPicker
      category="chassis"
      stepNo={2}
      title="Chassis"
      hint={`Chassis matching the CPU socket that hold ${cpuQty} processor${cpuQty > 1 ? 's' : ''}.`}
      ready={!!socket}
      notReadyHint="Pick a processor first — the chassis list is filtered by its socket."
      load={() => listChassis(socket)}
      loadKey={`${socket}|${allowed.join(',')}`}
      hideQty
      // Hide chassis that can't seat the chosen CPU count (max_sockets rule).
      prefilter={(o) => o.max_sockets != null && allowed.includes(o.max_sockets)}
      facets={[{ key: 'brand', label: 'Brand', get: (o) => o.brand }]}
      searchText={(o) => `${o.label} ${o.brand}`}
      specs={(o) => [
        ...(o.socket ? [{ text: o.socket, tone: 'info' as const }] : []),
        ...(o.ram_type ? [{ text: o.ram_type, tone: 'success' as const }] : []),
        ...(o.drive_form_factors ? [{ text: o.drive_form_factors, tone: 'warning' as const }] : []),
        ...(o.max_sockets ? [{ text: `${o.max_sockets} socket${o.max_sockets > 1 ? 's' : ''}` }] : []),
      ]}
    />
  )
}
