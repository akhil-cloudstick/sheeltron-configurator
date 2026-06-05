import { Outlet } from 'react-router-dom'

export function PricingSection() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-meta uppercase text-muted">Module</p>
        <h2 className="font-display text-base font-semibold text-secondary">Pricing &amp; Rules</h2>
      </div>
      <Outlet />
    </div>
  )
}
