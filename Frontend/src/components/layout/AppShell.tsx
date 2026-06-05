import { Outlet } from 'react-router-dom'
import { TopBar } from './TopBar'
import { Sidebar } from './Sidebar'
import { useAuthStore } from '@/store/authStore'

export function AppShell() {
  const user = useAuthStore((s) => s.user)
  if (!user) return null // ProtectedRoute handles the redirect

  return (
    <div className="flex h-screen flex-col bg-page">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar role={user.role} />
        <main className="scroll-thin min-w-0 flex-1 overflow-y-auto px-6 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
