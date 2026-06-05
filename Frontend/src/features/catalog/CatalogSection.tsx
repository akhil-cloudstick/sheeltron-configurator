import { Outlet } from 'react-router-dom'
import { TabNav, type TabItem } from '@/components/ui'

const TABS: TabItem[] = [
  { to: '/catalog/chassis', label: 'Chassis' },
  { to: '/catalog/cpus', label: 'CPUs' },
  { to: '/catalog/ram', label: 'RAM' },
  { to: '/catalog/storage', label: 'Storage' },
  { to: '/catalog/network', label: 'Network' },
]

export function CatalogSection() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-meta uppercase text-muted">Module</p>
        <h2 className="font-display text-base font-semibold text-secondary">Catalog · Priced SKUs</h2>
      </div>
      <TabNav items={TABS} />
      <Outlet />
    </div>
  )
}
