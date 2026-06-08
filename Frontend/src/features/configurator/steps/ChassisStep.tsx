import { StepPicker } from '../StepPicker'
import { listChassis } from '../configuratorApi'
import { allowedChassisSockets } from '../types'
import { useConfiguratorStore } from '@/store/configuratorStore'

export function ChassisStep() {
  const processor = useConfiguratorStore((s) => s.processor)
  const socket = processor?.option.socket ?? ''
  const cpuQty = processor?.qty ?? 1
  const allowed = allowedChassisSockets(cpuQty)

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
