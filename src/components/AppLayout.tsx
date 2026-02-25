import { Link, useLocation, Outlet } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';
import { SlidersHorizontal } from 'lucide-react';
import { BottomNav } from './BottomNav';
import { CellLeadsLogo } from './CellLeadsLogo';
import { OfflineIndicator } from './OfflineIndicator';
import { useFilterDrawer } from '../contexts/FilterDrawerContext';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/my-leads', label: 'My Leads' },
  { to: '/settings', label: 'Settings' },
] as const;

export function AppLayout() {
  const location = useLocation();
  const path = location.pathname;
  const filterDrawer = useFilterDrawer();
  const isDashboard = path === '/dashboard';

  return (
    <div className="min-h-screen min-h-[100dvh] overflow-x-hidden flex flex-col bg-[var(--color-canvas)]">
      {/* Single responsive header — no double header */}
      <header
        className="sticky top-0 z-[var(--z-header)] h-16 flex items-center border-b border-slate-200/80 bg-white/80 backdrop-blur-xl"
        style={{ paddingTop: 'max(var(--space-2), env(safe-area-inset-top, 0px))' }}
      >
        <div className="mx-auto flex w-full max-w-screen-xl h-16 items-center justify-between gap-[var(--space-6)] px-[var(--edge-padding)] md:px-[var(--space-4)]">
          <Link to="/dashboard" className="flex shrink-0 items-center gap-[var(--space-2)]" aria-label="CellLeads Pro home">
            <span className="md:hidden">
              <CellLeadsLogo size="sm" />
            </span>
            <span className="hidden md:inline">
              <CellLeadsLogo size="lg" />
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-[var(--space-6)] min-w-0 flex-1 justify-center" aria-label="Main navigation">
            {NAV_ITEMS.map(({ to, label }) => {
              const active = path === to || (to !== '/dashboard' && path.startsWith(to));
              return (
                <Link
                  key={to}
                  to={to}
                  className={`relative text-base font-semibold transition-colors duration-200 ${active ? 'text-[var(--color-primary)]' : 'text-slate-600 hover:text-[var(--color-primary)]'
                    }`}
                  aria-current={active ? 'page' : undefined}
                >
                  {label}
                  {active && (
                    <span className="absolute -bottom-[var(--space-3)] left-0 h-1 w-full rounded-full bg-[var(--color-primary)]" aria-hidden />
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="flex shrink-0 items-center gap-[var(--space-1)] md:gap-[var(--space-2)]">
            {isDashboard && filterDrawer && (
              <button
                type="button"
                onClick={filterDrawer.openDrawer}
                className="md:hidden touch-target flex items-center justify-center rounded-[var(--radius-button)] text-slate-600 hover:text-[var(--color-primary)] hover:bg-slate-100 focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
                style={{ minHeight: 'var(--touch-min)', minWidth: 'var(--touch-min)' }}
                aria-label="Open search and filters"
              >
                <SlidersHorizontal className="h-6 w-6" aria-hidden />
              </button>
            )}
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </div>
      </header>
      <OfflineIndicator />
      <main className="relative z-0 flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <div
          className="mx-auto w-full max-w-screen-xl p-[var(--edge-padding)] md:pb-[var(--space-4)]"
          style={{ paddingBottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px) + var(--space-6))' }}
        >
          <Outlet key={path} />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
