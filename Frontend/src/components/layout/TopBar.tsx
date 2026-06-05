import { useNavigate } from 'react-router-dom'
import { Logo } from './Logo'
import { Button, Pill } from '@/components/ui'
import { IconLogout } from '@/components/ui'
import { useAuthStore } from '@/store/authStore'
import { ROLE_LABELS } from '@/types/auth'

export function TopBar() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-4">
      <div className="flex items-center gap-3">
        <Logo />
        <span className="hidden text-caption text-muted sm:inline">Admin Portal</span>
      </div>

      <div className="flex items-center gap-3">
        {user && (
          <div className="hidden items-center gap-2 sm:flex">
            {/* <span className="text-caption text-muted">{user.fullName}</span> */}
            <Pill tone={user.role === 'admin' ? 'accent' : 'info'}>{ROLE_LABELS[user.role]}</Pill>
          </div>
        )}
        <Button variant="secondary" size="sm" onClick={handleLogout}>
          <IconLogout width={14} height={14} />
          Sign out
        </Button>
      </div>
    </header>
  )
}
