import { Link, useLocation, Outlet } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';
import { SlidersHorizontal, Download, Settings } from 'lucide-react';
import { BottomNav } from './BottomNav';
import { HotLeadsLogo } from './HotLeadsLogo';
import { useFilterDrawer } from '../contexts/FilterDrawerContext';
import { useHeaderActions } from '../contexts/HeaderActionsContext';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/my-leads', label: 'My Leads' },
  { to: '/coverage', label: 'Coverage' },
  { to: '/settings', label: 'Settings' },
] as const;

export function AppLayout() {
  const location = useLocation();
  const path = location.pathname;
  const filterDrawer = useFilterDrawer();
  const headerActions = useHeaderActions();
  const isDashboard = path === '/dashboard';

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)]">
      {/* Mobile: compact top bar with logo, filter (dashboard only), user */}
      <header className="sticky top-0 z-50 bg-white shadow-md md:hidden flex items-center justify-between px-[var(--edge-padding)] py-[var(--space-2)]">
        <Link to="/dashboard" className="flex items-center gap-[var(--space-2)]">
          <HotLeadsLogo size="sm" />
        </Link>
        <div className="flex items-center gap-[var(--space-1)]">
          {isDashboard && filterDrawer && (
            <button
              type="button"
              onClick={filterDrawer.openDrawer}
              className="touch-target flex items-center justify-center rounded-[var(--radius-button)] text-slate-600 hover:text-[var(--color-primary)] hover:bg-slate-100 focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
              style={{ minHeight: 'var(--touch-min)', minWidth: 'var(--touch-min)' }}
              aria-label="Open search and filters"
            >
              <SlidersHorizontal className="h-6 w-6" aria-hidden />
            </button>
          )}
          {headerActions?.exportAction && (
            <button
              type="button"
              onClick={headerActions.exportAction.onClick}
              className="touch-target flex items-center justify-center rounded-[var(--radius-button)] text-slate-600 hover:text-[var(--color-primary)] hover:bg-slate-100 focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
              style={{ minHeight: 'var(--touch-min)', minWidth: 'var(--touch-min)' }}
              aria-label={headerActions.exportAction.label}
              title={headerActions.exportAction.label}
            >
              <Download className="h-5 w-5" aria-hidden />
            </button>
          )}
          <Link
            to="/settings"
            className="touch-target flex items-center justify-center rounded-[var(--radius-button)] text-slate-600 hover:text-[var(--color-primary)] hover:bg-slate-100 focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
            style={{ minHeight: 'var(--touch-min)', minWidth: 'var(--touch-min)' }}
            aria-label="Data settings"
          >
            <Settings className="h-5 w-5" aria-hidden />
          </Link>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </header>
      {/* Desktop: full top nav */}
      <header className="sticky top-0 z-50 bg-white shadow-md md:flex hidden">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-[var(--space-4)] py-[var(--space-3)]">
          <Link to="/dashboard" className="flex items-center gap-2">
            <HotLeadsLogo size="lg" />
          </Link>
          <nav className="flex items-center gap-[var(--space-6)]">
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
                    <span className="absolute -bottom-[var(--space-3)] left-0 h-1 w-full rounded-full bg-[var(--color-primary)]"></span>
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-[var(--space-2)]">
            {headerActions?.exportAction && (
              <button
                type="button"
                onClick={headerActions.exportAction.onClick}
                className="flex items-center gap-[var(--space-2)] rounded-[var(--radius-button)] border border-slate-200 bg-white px-[var(--space-3)] py-[var(--space-2)] text-sm font-medium text-slate-700 hover:bg-slate-50 focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
                aria-label={headerActions.exportAction.label}
              >
                <Download className="h-4 w-4" aria-hidden />
                {headerActions.exportAction.label}
              </button>
            )}
            <Link
              to="/settings"
              className="flex items-center gap-[var(--space-2)] rounded-[var(--radius-button)] border border-slate-200 bg-white px-[var(--space-3)] py-[var(--space-2)] text-sm font-medium text-slate-700 hover:bg-slate-50 focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
              aria-label="Data settings"
            >
              <Settings className="h-4 w-4" aria-hidden />
              Data settings
            </Link>
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-screen-xl p-[var(--edge-padding)] md:pb-[var(--space-4)] pb-20">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}