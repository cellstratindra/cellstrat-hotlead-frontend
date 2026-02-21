import { Link, useLocation, Outlet } from 'react-router-dom'
import { UserButton } from '@clerk/clerk-react'
import { LayoutDashboard, Users, MapPin, ListTodo, GitBranch } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/lifecycle', label: 'Lead Lifecycle', icon: GitBranch },
  { to: '/my-leads', label: 'Leads', icon: Users },
  { to: '/coverage', label: 'Coverage', icon: MapPin },
  { to: '/product-backlog', label: 'Product backlog', icon: ListTodo },
] as const

export function AppLayout() {
  const location = useLocation()
  const path = location.pathname

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* Persistent slim sidebar */}
      <aside
        className="flex w-[200px] flex-col border-r border-slate-200/80 bg-white shadow-sm"
        aria-label="Main navigation"
      >
        <div className="flex h-14 items-center border-b border-slate-100 px-4">
          <span className="text-lg font-semibold tracking-tight text-slate-900">Hot Leads</span>
        </div>
        <nav className="flex-1 space-y-0.5 p-2">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
            const active = path === to || (to !== '/dashboard' && path.startsWith(to))
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden />
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="border-t border-slate-100 p-2">
          <div className="flex items-center justify-between rounded-lg px-3 py-2">
            <span className="text-xs text-slate-500">Account</span>
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
