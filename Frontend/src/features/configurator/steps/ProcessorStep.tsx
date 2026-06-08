import { StepPicker } from '../StepPicker'
import { listProcessors } from '../configuratorApi'

export function ProcessorStep() {
  return (
    <StepPicker
      category="processor"
      stepNo={1}
      title="Processor"
      hint="Pick the CPU — everything downstream narrows to what's socket-compatible."
      ready
      notReadyHint=""
      load={listProcessors}
      loadKey="processors"
      maxQty={4}
      incrementReason={() => 'Maximum 4 processors per configuration.'}
      vendorFacet={{ key: 'brand', label: 'Vendor', get: (o) => o.brand }}
      facets={[
        { key: 'family', label: 'Family', get: (o) => o.family },
        { key: 'series', label: 'Series', get: (o) => o.series },
        { key: 'cores', label: 'Cores', get: (o) => o.cores, numeric: true },
      ]}
      searchText={(o) => `${o.label} ${o.brand} ${o.family} ${o.series}`}
      specs={(o) => [
        ...(o.cores ? [{ text: o.cores }] : []),
        ...(o.threads ? [{ text: `${o.threads}T` }] : []),
        ...(o.socket ? [{ text: o.socket, tone: 'info' as const }] : []),
      ]}
    />
  )
}
