import { Link, useLocation, Outlet } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';
import { Flame } from 'lucide-react';
import { BottomNav } from './BottomNav';

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
    <div className="min-h-screen bg-[var(--color-bg-base)]">
      {/* Mobile: compact top bar with logo + user */}
      <header className="sticky top-0 z-50 bg-white shadow-md md:hidden flex items-center justify-between px-[var(--edge-padding)] py-2">
        <div className="flex items-center gap-2">
          <Flame className="h-7 w-7 text-[var(--color-primary)]" aria-hidden />
          <span className="text-lg font-bold text-[var(--color-navy)]">Hot Leads</span>
        </div>
        <UserButton afterSignOutUrl="/sign-in" />
      </header>
      {/* Desktop: full top nav */}
      <header className="sticky top-0 z-50 bg-white shadow-md md:flex hidden">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Flame className="h-8 w-8 text-[var(--color-primary)]" />
            <span className="text-xl font-bold text-[var(--color-navy)]">Hot Leads</span>
          </div>
          <nav className="flex items-center gap-6">
            {NAV_ITEMS.map(({ to, label }) => {
              const active = path === to || (to !== '/dashboard' && path.startsWith(to));
              return (
                <Link
                  key={to}
                  to={to}
                  className={`relative text-base font-medium transition-colors duration-200 ${
                    active ? 'text-[var(--color-primary)]' : 'text-slate-600 hover:text-[var(--color-primary)]'
                  }`}
                >
                  {label}
                  {active && (
                    <span className="absolute -bottom-3 left-0 h-1 w-full rounded-full bg-[var(--color-primary)]"></span>
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
      <main className="mx-auto max-w-screen-xl p-[var(--edge-padding)] md:pb-4 pb-20">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}