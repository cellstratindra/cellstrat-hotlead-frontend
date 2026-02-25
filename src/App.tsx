import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, Link } from 'react-router-dom'
import { SignIn, SignUp, SignedIn, SignedOut } from '@clerk/clerk-react'
import { SearchResultsProvider } from './contexts/SearchResultsContext'
import { FilterDrawerProvider } from './contexts/FilterDrawerContext'
import { HeaderActionsProvider } from './contexts/HeaderActionsContext'
import { GeoProvider } from './contexts/GeoContext'
import { AppLayout } from './components/AppLayout'

const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const MyLeads = lazy(() => import('./pages/MyLeads').then((m) => ({ default: m.MyLeads })))
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })))
const LeadDetailPage = lazy(() => import('./pages/LeadDetail').then((m) => ({ default: m.LeadDetailPage })))
const LeadLifecycleDashboard = lazy(() => import('./pages/LeadLifecycleDashboard').then((m) => ({ default: m.LeadLifecycleDashboard })))
const ProductBacklog = lazy(() => import('./pages/ProductBacklog').then((m) => ({ default: m.ProductBacklog })))

function PublicRoute({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-canvas)]">
      {children}
    </div>
  )
}

function PageFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center bg-[var(--color-canvas)]" aria-hidden>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/sign-in/*"
        element={
          <PublicRoute>
            <div className="w-full max-w-[400px] mx-auto px-4">
              <div className="mb-4 rounded-lg border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 p-3 text-sm text-slate-700">
                <p className="font-medium text-[var(--color-navy)] mb-1">First time here?</p>
                <p className="mb-2">Sign up to create your account with Google; then you can sign in next time.</p>
                <Link
                  to="/sign-up"
                  className="inline-block font-semibold text-[var(--color-primary)] hover:underline focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 rounded"
                >
                  Go to Sign up →
                </Link>
              </div>
              <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
            </div>
          </PublicRoute>
        }
      />
      <Route
        path="/sign-up/*"
        element={
          <PublicRoute>
            <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
          </PublicRoute>
        }
      />
      <Route
        element={
          <>
            <SignedIn>
              <SearchResultsProvider>
                <GeoProvider>
                  <FilterDrawerProvider>
                    <HeaderActionsProvider>
                      <AppLayout />
                    </HeaderActionsProvider>
                  </FilterDrawerProvider>
                </GeoProvider>
              </SearchResultsProvider>
            </SignedIn>
            <SignedOut>
              <Navigate to="/sign-in" replace />
            </SignedOut>
          </>
        }
      >
        <Route path="/dashboard" element={<Suspense fallback={<PageFallback />}><Dashboard /></Suspense>} />
        <Route path="/lifecycle" element={<Suspense fallback={<PageFallback />}><LeadLifecycleDashboard /></Suspense>} />
        <Route path="/my-leads" element={<Suspense fallback={<PageFallback />}><MyLeads /></Suspense>} />
        <Route path="/product-backlog" element={<Suspense fallback={<PageFallback />}><ProductBacklog /></Suspense>} />
        <Route path="/settings" element={<Suspense fallback={<PageFallback />}><Settings /></Suspense>} />
        <Route path="/leads/:id" element={<Suspense fallback={<PageFallback />}><LeadDetailPage /></Suspense>} />
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
