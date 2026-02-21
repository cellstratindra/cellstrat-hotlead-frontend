import { Routes, Route, Navigate } from 'react-router-dom'
import { SignIn, SignUp, SignedIn, SignedOut } from '@clerk/clerk-react'
import { Dashboard } from './pages/Dashboard'
import { LeadDetailPage } from './pages/LeadDetail'
import { MyLeads } from './pages/MyLeads'

function PublicRoute({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
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
        path="/dashboard"
        element={
          <>
            <SignedIn>
              <Dashboard />
            </SignedIn>
            <SignedOut>
              <Navigate to="/sign-in" replace />
            </SignedOut>
          </>
        }
      />
      <Route
        path="/my-leads"
        element={
          <>
            <SignedIn>
              <MyLeads />
            </SignedIn>
            <SignedOut>
              <Navigate to="/sign-in" replace />
            </SignedOut>
          </>
        }
      />
      <Route
        path="/leads/:id"
        element={
          <>
            <SignedIn>
              <LeadDetailPage />
            </SignedIn>
            <SignedOut>
              <Navigate to="/sign-in" replace />
            </SignedOut>
          </>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
