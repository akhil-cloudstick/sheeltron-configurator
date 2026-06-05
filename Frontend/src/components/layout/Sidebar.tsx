import { NavLink } from 'react-router-dom'
import { navForRole } from './navConfig'
import type { Role } from '@/types/auth'
import { cn } from '@/lib/cn'

export function Sidebar({ role }: { role: Role }) {
  const groups = navForRole(role)

  return (
    <nav className="scroll-thin flex h-full w-[220px] shrink-0 flex-col gap-5 overflow-y-auto border-r border-border bg-surface px-3 py-5">
      {groups.map((g) => (
        <div key={g.id}>
          <p className="px-2 pb-1.5 text-meta uppercase text-muted">{g.title}</p>
          <ul className="flex flex-col gap-0.5">
            {g.items.map((it) => (
              <li key={it.to}>
                <NavLink
                  to={it.to}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center justify-between rounded-control px-2.5 py-1.5 text-caption font-medium transition-colors duration-fast',
                      isActive
                        ? 'bg-accent-soft text-accent-on-soft'
                        : 'text-secondary hover:bg-subtle',
                    )
                  }
                >
                  <span>{it.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}
