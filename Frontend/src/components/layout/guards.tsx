import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import type { Role } from '@/types/auth'

/** Redirects to /login when not authenticated. */
export function ProtectedRoute({ children }: { children?: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const location = useLocation()
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return children ? <>{children}</> : <Outlet />
}

/** Restricts a route subtree to specific roles; others are bounced to /stock/chassis. */
export function RoleRoute({ roles, children }: { roles: Role[]; children?: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  if (!roles.includes(user.role)) {
    return <Navigate to="/stock/chassis" replace />
  }
  return children ? <>{children}</> : <Outlet />
}
