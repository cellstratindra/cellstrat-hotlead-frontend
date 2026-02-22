import { Link, useLocation } from 'react-router-dom'
import { Home, Users, Settings, MoreHorizontal } from 'lucide-react'
import { useState } from 'react'

const MOBILE_NAV_ITEMS = [
  { to: '/dashboard', label: 'Home', icon: Home },
  { to: '/my-leads', label: 'My Leads', icon: Users },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const

const MORE_ITEMS = [
  { to: '/coverage', label: 'Coverage' },
] as const

export function BottomNav() {
  const location = useLocation()
  const path = location.pathname
  const [moreOpen, setMoreOpen] = useState(false)

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
          minHeight: 'var(--touch-min)',
        }}
        aria-label="Bottom navigation"
      >
        <div
          className="flex items-center justify-around px-[var(--edge-padding)] py-2"
          style={{ minHeight: 'var(--touch-min)' }}
        >
          {MOBILE_NAV_ITEMS.map(({ to, label, icon: Icon }) => {
            const active = path === to || (to !== '/dashboard' && path.startsWith(to))
            return (
              <Link
                key={to}
                to={to}
                className={`touch-target flex flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  active
                    ? 'text-[var(--color-primary)]'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="h-6 w-6 shrink-0" aria-hidden />
                <span>{label}</span>
              </Link>
            )
          })}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMoreOpen((o) => !o)}
              className="touch-target flex flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
              aria-expanded={moreOpen}
              aria-haspopup="true"
            >
              <MoreHorizontal className="h-6 w-6 shrink-0" aria-hidden />
              <span>More</span>
            </button>
            {moreOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  aria-hidden
                  onClick={() => setMoreOpen(false)}
                />
                <ul
                  className="absolute bottom-full left-0 mb-1 w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-lg z-50"
                  role="menu"
                >
                  {MORE_ITEMS.map(({ to, label }) => (
                    <li key={to} role="none">
                      <Link
                        to={to}
                        role="menuitem"
                        onClick={() => setMoreOpen(false)}
                        className="block px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </nav>
    </>
  )
}
