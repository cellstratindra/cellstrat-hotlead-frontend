import { Routes, Route, Navigate } from 'react-router-dom'
import { SignIn, SignUp, SignedIn, SignedOut } from '@clerk/clerk-react'
import { SearchResultsProvider } from './contexts/SearchResultsContext'
import { AppLayout } from './components/AppLayout'
import { Coverage } from './pages/Coverage'
import { Dashboard } from './pages/Dashboard'
import { LeadDetailPage } from './pages/LeadDetail'
import { LeadLifecycleDashboard } from './pages/LeadLifecycleDashboard'
import { MyLeads } from './pages/MyLeads'
import { ProductBacklog } from './pages/ProductBacklog'

function PublicRoute({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
      {children}
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
                <AppLayout />
              </SearchResultsProvider>
            </SignedIn>
            <SignedOut>
              <Navigate to="/sign-in" replace />
            </SignedOut>
          </>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/lifecycle" element={<LeadLifecycleDashboard />} />
        <Route path="/my-leads" element={<MyLeads />} />
        <Route path="/coverage" element={<Coverage />} />
        <Route path="/product-backlog" element={<ProductBacklog />} />
        <Route path="/leads/:id" element={<LeadDetailPage />} />
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
