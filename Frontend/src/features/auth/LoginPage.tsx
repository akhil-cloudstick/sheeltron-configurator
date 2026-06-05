import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Field, Input, PillTabs } from '@/components/ui'
import { Logo } from '@/components/layout/Logo'
import { useAuthStore } from '@/store/authStore'
import type { Role } from '@/types/auth'

export function LoginPage() {
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('admin')
  const [error, setError] = useState<string | null>(null)

  function signIn(u: string, p: string, r: Role) {
    const err = login(u, p, r)
    if (err) {
      setError(err)
      return
    }
    setError(null)
    navigate('/stock/chassis', { replace: true })
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    signIn(username, password, role)
  }

  function demo(r: Role) {
    const usernames: Record<Role, string> = {
      super_admin: 'super.admin',
      admin: 'admin',
      stock_manager: 'stock.manager',
    }
    signIn(usernames[r], 'demo', r)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-subtle px-4">
      <div className="w-[360px]">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>

        <div className="rounded-card border border-border bg-surface p-6 shadow-hover">
          <h1 className="font-display text-xl font-bold text-primary">Sign in</h1>
          <p className="mt-1 text-caption text-muted">Sheeltron Configurator · Admin Portal</p>

          <form className="mt-5 flex flex-col gap-4" onSubmit={onSubmit}>
            <Field label="Role" htmlFor="role">
              <PillTabs
                value={role}
                onChange={setRole}
                options={[
                  { value: 'super_admin', label: 'Super Admin' },
                  { value: 'admin', label: 'Admin' },
                  { value: 'stock_manager', label: 'Stock Manager' },
                ]}
              />
            </Field>

            <Field label="Username" htmlFor="username" required>
              <Input
                id="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your.name"
                invalid={!!error}
              />
            </Field>

            <Field label="Password" htmlFor="password" required error={error ?? undefined}>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                invalid={!!error}
              />
            </Field>

            <Button type="submit" className="mt-1 w-full">
              Sign in
            </Button>
          </form>

          <div className="mt-5 border-t border-border pt-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
              Quick demo sign-in
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => demo('super_admin')}>
                As Super Admin
              </Button>
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => demo('admin')}>
                As Admin
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={() => demo('stock_manager')}
              >
                As Stock Manager
              </Button>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-muted">
          Mock authentication — no real backend. Any non-empty credentials work. · v0.1
        </p>
      </div>
    </div>
  )
}
