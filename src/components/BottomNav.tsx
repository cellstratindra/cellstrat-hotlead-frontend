import { Link, useLocation } from 'react-router-dom'
import { Home, Users, Settings } from 'lucide-react'

const MOBILE_NAV_ITEMS = [
  { to: '/dashboard', label: 'Home', icon: Home },
  { to: '/my-leads', label: 'My Leads', icon: Users },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const

export function BottomNav() {
  const location = useLocation()
  const path = location.pathname

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[var(--z-bottom-nav)] md:hidden bg-white/80 backdrop-blur-xl border-t border-slate-200/80 safe-area-bottom"
      style={{
        paddingBottom: 'max(var(--space-2), env(safe-area-inset-bottom, 0px))',
        minHeight: 'calc(var(--touch-min) + env(safe-area-inset-bottom, 0px))',
      }}
      aria-label="Bottom navigation"
    >
      <div
        className="flex items-center justify-around px-[var(--edge-padding)] py-[var(--space-3)]"
        style={{ minHeight: 'var(--touch-min)' }}
      >
        {MOBILE_NAV_ITEMS.map(({ to, label, icon: Icon }) => {
          const active = path === to || (to !== '/dashboard' && path.startsWith(to))
          return (
            <Link
              key={to}
              to={to}
              className={`touch-target flex flex-col items-center justify-center gap-1 rounded-[var(--radius-button)] px-[var(--space-4)] py-[var(--space-2)] text-xs font-medium transition-colors duration-200 focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 ${
                active
                  ? 'text-[var(--color-primary)]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              style={{ minHeight: 'var(--touch-min)' }}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="h-6 w-6 shrink-0" aria-hidden />
              <span>{label}</span>
              {active && (
                <span className="h-1 w-1 rounded-full bg-[var(--color-primary)]" aria-hidden />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
