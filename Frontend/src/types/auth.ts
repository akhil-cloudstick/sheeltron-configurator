// Roles supported by the admin portal.
// NOTE: auth is mocked — the chosen role is sent in the X-User-Role header. `super_admin`
// is the only role that may import the correlation (compatibility) catalogs.
export type Role = 'super_admin' | 'admin' | 'stock_manager'

export interface AuthUser {
  username: string
  fullName: string
  role: Role
}

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  stock_manager: 'Stock Manager',
}

/** Roles that can see/edit prices (admin + super_admin); stock managers cannot. */
export function canManagePrice(role: Role | undefined): boolean {
  return role === 'admin' || role === 'super_admin'
}
