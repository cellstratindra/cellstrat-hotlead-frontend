import { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { UserButton, useUser } from '@clerk/clerk-react';
import { SlidersHorizontal, Mail } from 'lucide-react';
import { BottomNav } from './BottomNav';
import { HotLeadsLogo } from './HotLeadsLogo';
import { useFilterDrawer } from '../contexts/FilterDrawerContext';
import { getGmailStatus } from '../api/client';

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
  const isDashboard = path === '/dashboard';
  const isMyLeads = path === '/my-leads';
  const showGmailInHeader = !isDashboard && !isMyLeads;
  const { user } = useUser();
  const [gmailConnected, setGmailConnected] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const fetchStatus = () => {
      getGmailStatus(user.id)
        .then((s) => setGmailConnected(s.connected))
        .catch(() => setGmailConnected(false));
    };
    fetchStatus();
    const onFocus = () => fetchStatus();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user?.id]);

  return (
    <div className="min-h-screen min-h-[100dvh] overflow-x-hidden flex flex-col bg-[var(--color-canvas)]">
      {/* Mobile: slim bar (max 64px), glassmorphic — Logo, filter (dashboard only), user only */}
      <header className="sticky top-0 z-[1100] max-h-16 md:hidden flex items-center justify-between px-[var(--edge-padding)] py-[var(--space-2)] border-b border-default bg-white/90 backdrop-blur-md shadow-[0_1px_0_0_rgba(0,0,0,0.06)]" style={{ paddingTop: 'max(var(--space-2), env(safe-area-inset-top, 0px))' }}>
        <Link to="/dashboard" className="flex items-center gap-[var(--space-2)]">
          <HotLeadsLogo size="sm" />
        </Link>
        <div className="flex items-center gap-[var(--space-1)]">
          {showGmailInHeader && (gmailConnected ? (
            <span className="inline-flex items-center gap-[var(--space-1)] rounded-full bg-[var(--color-emerald)]/15 px-[var(--space-2)] py-[var(--space-1)] text-xs font-medium text-[var(--color-emerald)] shrink-0" title="Gmail connected">
              <Mail className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">Gmail</span>
            </span>
          ) : (
            <Link
              to="/settings"
              className="inline-flex items-center gap-[var(--space-1)] rounded-full bg-amber-100 px-[var(--space-2)] py-[var(--space-1)] text-xs font-medium text-amber-800 hover:bg-amber-200 transition-colors shrink-0"
              title="Connect Gmail"
            >
              <Mail className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">Connect</span>
            </Link>
          ))}
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
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </header>
      {/* Desktop: slim (max 64px), glassmorphic — Logo, nav, Gmail (when shown), user only; no admin actions */}
      <header className="sticky top-0 z-[1100] max-h-16 md:flex hidden items-center border-b border-default bg-white/90 backdrop-blur-md shadow-[0_1px_0_0_rgba(0,0,0,0.06)]">
        <div className="mx-auto flex max-w-screen-xl h-16 items-center justify-between gap-[var(--space-6)] px-[var(--space-4)]">
          <Link to="/dashboard" className="flex shrink-0 items-center gap-[var(--space-2)] mr-[var(--space-4)]" aria-label="Hot Leads home">
            <HotLeadsLogo size="lg" />
          </Link>
          <nav className="flex items-center gap-[var(--space-6)] min-w-0 flex-1 justify-center" aria-label="Main navigation">
            {NAV_ITEMS.map(({ to, label }) => {
              const active = path === to || (to !== '/dashboard' && path.startsWith(to));
              return (
                <Link
                  key={to}
                  to={to}
                  className={`relative text-base font-semibold transition-colors duration-200 ${
                    active ? 'text-[var(--color-primary)]' : 'text-slate-600 hover:text-[var(--color-primary)]'
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
          <div className="flex shrink-0 items-center gap-[var(--space-2)]">
            {showGmailInHeader && (gmailConnected ? (
              <span className="inline-flex items-center gap-[var(--space-1)] rounded-full bg-[var(--color-emerald)]/15 px-[var(--space-2)] py-[var(--space-1)] text-xs font-medium text-[var(--color-emerald)]" title="Gmail connected">
                <Mail className="h-3.5 w-3.5" aria-hidden />
                Gmail connected
              </span>
            ) : (
              <Link
                to="/settings"
                className="inline-flex items-center gap-[var(--space-1)] rounded-full bg-amber-100 px-[var(--space-2)] py-[var(--space-1)] text-xs font-medium text-amber-800 hover:bg-amber-200 transition-colors"
                title="Connect Gmail"
              >
                <Mail className="h-3.5 w-3.5" aria-hidden />
                Connect Gmail
              </Link>
            ))}
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </div>
      </header>
      <main className="relative z-0 flex-1 min-h-0 mx-auto w-full max-w-screen-xl p-[var(--edge-padding)] md:pb-[var(--space-4)] pb-20 overflow-x-hidden">
        <Outlet key={path} />
      </main>
      <BottomNav />
    </div>
  );
}