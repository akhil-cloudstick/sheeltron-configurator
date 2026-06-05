import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser, Role } from '@/types/auth'

interface AuthState {
  user: AuthUser | null
  /**
   * Mock login. There is NO real auth backend yet — any non-empty username/password
   * is accepted and the chosen role is applied. Returns an error string on failure.
   */
  login: (username: string, password: string, role: Role) => string | null
  logout: () => void
}

function fullNameFor(username: string): string {
  const base = username.trim().split(/[@\s._-]+/)[0] || username
  return base.charAt(0).toUpperCase() + base.slice(1)
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      login: (username, password, role) => {
        if (!username.trim() || !password.trim()) {
          return 'Enter a username and password.'
        }
        set({ user: { username: username.trim(), fullName: fullNameFor(username), role } })
        return null
      },
      logout: () => set({ user: null }),
    }),
    { name: 'sheeltron.auth' },
  ),
)
