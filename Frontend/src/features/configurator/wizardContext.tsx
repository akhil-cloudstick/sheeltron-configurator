import { createContext, useContext } from 'react'
import { STEP_ORDER, type StepDef } from './configuratorSteps'

// The wizard's step list is provided by the layout so the same step components can
// drive two flows: the salesman quote wizard (/configurator/*) and the admin pack
// builder (/compatibility/build/*). StepPicker reads its Back/Continue targets from
// here instead of importing a fixed STEP_ORDER.
const WizardContext = createContext<StepDef[]>(STEP_ORDER)

export function WizardProvider({ steps, children }: { steps: StepDef[]; children: React.ReactNode }) {
  return <WizardContext.Provider value={steps}>{children}</WizardContext.Provider>
}

export function useWizardSteps(): StepDef[] {
  return useContext(WizardContext)
}
