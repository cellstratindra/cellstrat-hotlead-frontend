import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? ''

function Root() {
  if (!publishableKey.trim()) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'system-ui', maxWidth: '480px' }}>
        <h1 style={{ marginBottom: '1rem' }}>CellLeads Pro</h1>
        <p style={{ color: '#666', marginBottom: '1rem' }}>
          Add <code>VITE_CLERK_PUBLISHABLE_KEY</code> to your <code>.env</code> or <code>.env.local</code> and restart the dev server.
        </p>
        <p style={{ fontSize: '0.875rem', color: '#888' }}>
          Get your key from the Clerk dashboard. Vite only exposes variables prefixed with <code>VITE_</code>.
        </p>
      </div>
    )
  }
  return (
    <ClerkProvider publishableKey={publishableKey}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ClerkProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
