import type { Role } from '@/types/auth'

export interface NavLeaf {
  to: string
  label: string
  real?: boolean // true = wired to the live backend; false/undefined = mock
}

export interface NavGroup {
  id: string
  title: string
  items: NavLeaf[]
}

const PRODUCT_ITEMS: NavLeaf[] = [
  { to: '/stock/chassis', label: 'Chassis', real: true },
  { to: '/stock/processor', label: 'Processor', real: true },
  { to: '/stock/memory', label: 'Memory', real: true },
  { to: '/stock/ssd', label: 'SSD', real: true },
  { to: '/stock/hdd', label: 'HDD', real: true },
]

const IMPORT_ITEMS: NavLeaf[] = [
  { to: '/issues', label: 'Issues', real: true },
  { to: '/change-logs', label: 'Change logs', real: true },
]

/** admin + super_admin can see/edit prices and the pricing/coverage tools. */
function isPriceManager(role: Role): boolean {
  return role === 'admin' || role === 'super_admin'
}

/** Landing route for a role after login / when bounced from a forbidden route. */
export function homeForRole(role: Role): string {
  return role === 'salesman' ? '/configurator' : '/stock/chassis'
}

/**
 * Nav is role-aware. Stock manager, admin and super_admin see the SAME product
 * tables (no separate Stock vs Catalog). The section is titled "Catalog" for the
 * price managers (admin / super_admin) and "Stock" for the stock manager (prices
 * hidden). Price managers also get the Coverage dashboard; admin/super_admin get
 * Pricing & Rules. super_admin additionally gets the per-product correlation import
 * (surfaced as a button on each product page, not a separate nav item).
 */
export function navForRole(role: Role): NavGroup[] {
  // Salesman has its own slim nav: the two ways to start a quote (build to order or
  // pick a ready compatible setup) + their own quotes.
  if (role === 'salesman') {
    return [
      {
        id: 'sell',
        title: 'Sell',
        items: [
          { to: '/configurator/processor', label: 'Build to order', real: true },
          { to: '/configurator/compatibility', label: 'Compatibility', real: true },
          { to: '/quotes', label: 'My quotes', real: true },
        ],
      },
    ]
  }

  const groups: NavGroup[] = [
    {
      id: 'product',
      title: isPriceManager(role) ? 'Catalog' : 'Stock',
      items: PRODUCT_ITEMS,
    },
    {
      id: 'imports',
      title: 'Imports',
      items: IMPORT_ITEMS,
    },
  ]
  // Coverage dashboard is a super-admin tool only (not shown to admin).
  if (role === 'super_admin') {
    groups.push({
      id: 'insights',
      title: 'Insights',
      items: [{ to: '/coverage', label: 'Coverage by socket', real: true }],
    })
  }
  if (isPriceManager(role)) {
    groups.push({
      id: 'sales',
      title: 'Sales',
      items: [{ to: '/quotes', label: 'All quotes', real: true }],
    })
    groups.push({
      id: 'pricing',
      title: 'Pricing & Rules',
      items: [
        { to: '/pricing/bulk', label: 'Bulk price update' },
        { to: '/compatibility', label: 'Compatibility', real: true },
      ],
    })
  }
  return groups
}
