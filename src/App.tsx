import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { SignIn, SignUp, SignedIn, SignedOut } from '@clerk/clerk-react'
import { SearchResultsProvider } from './contexts/SearchResultsContext'
import { FilterDrawerProvider } from './contexts/FilterDrawerContext'
import { HeaderActionsProvider } from './contexts/HeaderActionsContext'
import { AppLayout } from './components/AppLayout'

const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const MyLeads = lazy(() => import('./pages/MyLeads').then((m) => ({ default: m.MyLeads })))
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })))
const Coverage = lazy(() => import('./pages/Coverage').then((m) => ({ default: m.Coverage })))
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
            <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
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
                <FilterDrawerProvider>
                  <HeaderActionsProvider>
                    <AppLayout />
                  </HeaderActionsProvider>
                </FilterDrawerProvider>
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
        <Route path="/coverage" element={<Suspense fallback={<PageFallback />}><Coverage /></Suspense>} />
        <Route path="/product-backlog" element={<Suspense fallback={<PageFallback />}><ProductBacklog /></Suspense>} />
        <Route path="/settings" element={<Suspense fallback={<PageFallback />}><Settings /></Suspense>} />
        <Route path="/leads/:id" element={<Suspense fallback={<PageFallback />}><LeadDetailPage /></Suspense>} />
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
