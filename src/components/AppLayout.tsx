import { Link, useLocation, Outlet } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';
import { Flame } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/my-leads', label: 'My Leads' },
  { to: '/coverage', label: 'Coverage' },
  { to: '/settings', label: 'Settings' },
] as const;

export function AppLayout() {
  const location = useLocation();
  const path = location.pathname;

  return (
    // Changed background to a dark slate blue
    <div className="min-h-screen bg-[#0F172A]">
      <header className="sticky top-0 z-50 bg-white shadow-md">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Flame className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-slate-800">Hot Leads</span>
          </div>
          <nav className="flex items-center gap-6">
            {NAV_ITEMS.map(({ to, label }) => {
              const active = path === to || (to !== '/dashboard' && path.startsWith(to));
              return (
                <Link
                  key={to}
                  to={to}
                  className={`relative text-base font-medium transition-colors duration-200 ${
                    active ? 'text-blue-600' : 'text-slate-600 hover:text-blue-600'
                  }`}
                >
                  {label}
                  {active && (
                    <span className="absolute -bottom-3 left-0 h-1 w-full rounded-full bg-blue-600"></span>
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center">
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-screen-xl p-4">
        <Outlet />
      </main>
    </div>
  );
}