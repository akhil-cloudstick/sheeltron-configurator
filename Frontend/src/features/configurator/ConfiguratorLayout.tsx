import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/layout/Logo'
import { Button, Pill, IconLogout } from '@/components/ui'
import { useAuthStore } from '@/store/authStore'
import { ROLE_LABELS } from '@/types/auth'
import { useConfiguratorStore } from '@/store/configuratorStore'
import { SummaryRail } from './SummaryRail'
import { SelectedDrivesRail } from './SelectedDrivesRail'
import { STEP_ORDER, isComplete, maxReachableIndex, stepIndexFromPath, type StepDef } from './configuratorSteps'
import { WizardProvider } from './wizardContext'
import { cn } from '@/lib/cn'

export function ConfiguratorLayout({
  steps = STEP_ORDER,
  mode = 'quote',
  embedded = false,
}: {
  steps?: StepDef[]
  mode?: 'quote' | 'pack'
  // When embedded, the wizard renders inside the admin shell (keeping the sidebar) so
  // it skips its own top bar and fills the available height instead of the full screen.
  embedded?: boolean
}) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const location = useLocation()
  const store = useConfiguratorStore()

  const maxReach = maxReachableIndex(store)
  const current = stepIndexFromPath(location.pathname, steps)

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className={cn('flex flex-col', embedded ? 'h-full' : 'h-screen bg-page')}>
      {/* Top bar — only when standalone; the admin shell already has its own. */}
      {!embedded && (
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-5 print:hidden">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="hidden text-caption text-muted sm:inline">Configurator</span>
          </div>
          <div className="flex items-center gap-3">
            {user && <Pill tone="accent">{ROLE_LABELS[user.role]}</Pill>}
            <Button variant="secondary" size="sm" onClick={handleLogout}>
              <IconLogout width={14} height={14} />
              Sign out
            </Button>
          </div>
        </header>
      )}

      {/* Locked step bar — completed steps jump back, future steps are locked */}
      <nav className="shrink-0 border-b border-border bg-surface px-5 py-2.5 print:hidden">
        <ol className="mx-auto flex max-w-[1180px] items-center gap-2">
          {steps.map((step, i) => {
            const state = i === current ? 'current' : i <= maxReach ? 'done' : 'locked'
            const done = isComplete(store, step.category)
            const clickable = state === 'done' && i < current
            return (
              <li key={step.path} className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!clickable}
                  onClick={() => clickable && navigate(step.path)}
                  className={cn(
                    'flex items-center gap-2 rounded-pill px-3 py-1.5 text-caption font-medium transition-colors',
                    state === 'current' && 'bg-accent-soft text-accent-on-soft',
                    state === 'done' && 'text-primary hover:bg-subtle',
                    state === 'locked' && 'cursor-default text-muted/60',
                    !clickable && 'cursor-default',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
                      done ? 'bg-success text-surface' : state === 'current' ? 'bg-accent text-surface' : 'bg-subtle text-muted',
                    )}
                  >
                    {done ? '✓' : i + 1}
                  </span>
                  {step.label}
                </button>
                {i < steps.length - 1 && (
                  <span className={cn('h-px w-6', i < maxReach ? 'bg-border-strong' : 'bg-border')} />
                )}
              </li>
            )
          })}
        </ol>
      </nav>

      {/* Body: centered container with the step panel + summary rail. Each step panel
          carries its own Back/Continue at its bottom. */}
      <div className="min-h-0 flex-1 print:overflow-visible">
        <div className="mx-auto flex h-full w-full max-w-[1180px] gap-6 px-5 py-5">
          <main className="min-w-0 flex-1 overflow-hidden">
            {current > maxReach ? (
              <Navigate to={steps[maxReach].path} replace />
            ) : (
              <WizardProvider steps={steps}>
                <Outlet />
              </WizardProvider>
            )}
          </main>
          <div className="hidden w-[320px] shrink-0 flex-col gap-4 overflow-auto lg:flex print:hidden">
            <SummaryRail mode={mode} />
            <SelectedDrivesRail />
          </div>
        </div>
      </div>
    </div>
  )
}
