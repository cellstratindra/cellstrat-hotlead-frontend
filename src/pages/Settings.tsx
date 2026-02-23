import { useEffect, useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { LogOut, Mail, CheckCircle2 } from 'lucide-react'
import {
  API_BASE,
  getGmailAuthUrl,
  getGmailStatus,
  revokeGmail,
  testGmailConnection,
  type GmailStatusResponse,
} from '../api/client'

/** Google "G" logo (single color for clean enterprise look) */
function GoogleLogoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

export function Settings() {
  const { user } = useUser()
  const [gmail, setGmail] = useState<GmailStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState(false)
  const [testing, setTesting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [testMessage, setTestMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('gmail') === 'connected') {
      setSuccessMessage('Gmail connected successfully.')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    let cancelled = false
    getGmailStatus(user.id)
      .then((data) => { if (!cancelled) setGmail(data) })
      .catch(() => { if (!cancelled) setGmail({ connected: false, message: 'Failed to load status.' }) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user?.id])

  const handleSignInGmail = async () => {
    if (!user?.id) return
    setError(null)
    try {
      const { url } = await getGmailAuthUrl(user.id)
      window.location.href = url
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start Gmail sign-in')
    }
  }

  const handleRevokeGmail = async () => {
    if (!user?.id) return
    setError(null)
    setRevoking(true)
    try {
      await revokeGmail(user.id)
      setGmail({ connected: false, message: 'Gmail disconnected.' })
      setTestMessage(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to revoke')
    } finally {
      setRevoking(false)
    }
  }

  const handleTestConnection = async () => {
    if (!user?.id) return
    setError(null)
    setTestMessage(null)
    setTesting(true)
    try {
      const data = await testGmailConnection(user.id)
      setTestMessage(data?.message ?? 'Test draft created. Check your Gmail Drafts folder.')
      setTimeout(() => setTestMessage(null), 6000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Test connection failed')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Settings</h1>

      {/* Gmail Connection Status card – Clean Enterprise */}
      <section
        className="bg-white rounded-[var(--radius-card)] border-default shadow-[var(--shadow-card)] overflow-hidden"
        aria-labelledby="gmail-heading"
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Mail className="h-5 w-5 text-slate-600" aria-hidden />
          <h2 id="gmail-heading" className="text-lg font-semibold text-[var(--color-navy)]">
            Gmail Connection Status
          </h2>
        </div>
        <div className="p-6">
          {successMessage && (
            <div className="mb-4 rounded-[8px] bg-emerald-50 text-emerald-800 px-4 py-2 text-sm flex items-center gap-2" role="alert">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {successMessage}
            </div>
          )}
          {testMessage && (
            <div className="mb-4 rounded-[8px] bg-slate-50 text-slate-800 px-4 py-2 text-sm border border-slate-200" role="status">
              {testMessage}
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-[8px] bg-red-50 text-red-700 px-4 py-2 text-sm" role="alert">
              {error}
              <p className="mt-2 text-slate-600">
                If you see a Google error (e.g. redirect_uri_mismatch), ensure the redirect URI in Google Cloud Console matches your environment.{' '}
                <a
                  href={`${API_BASE}/api/gmail/redirect-uri`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-primary)] hover:underline"
                >
                  Check which redirect URI this app uses
                </a>
              </p>
            </div>
          )}
          {loading ? (
            <p className="text-slate-600">Checking connection…</p>
          ) : gmail?.connected ? (
            /* State B: Connected – profile picture, email, Authorized badge, Test Connection, Revoke */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  {gmail.picture ? (
                    <img
                      src={gmail.picture}
                      alt=""
                      className="h-12 w-12 rounded-full border-2 border-slate-200 object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white font-semibold text-lg shrink-0">
                      {gmail.email ? gmail.email.charAt(0).toUpperCase() : 'G'}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-slate-900">
                      {gmail.email || 'Connected'}
                    </p>
                    <span className="inline-flex items-center gap-1.5 mt-1 rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-0.5 text-xs font-medium border border-emerald-200">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Authorized
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-slate-500">
                You can send emails and save drafts from the Campaign drawer. Sending for a saved lead updates follow-up count and moves the lead to In Progress.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="inline-flex items-center gap-2 rounded-[8px] px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 shadow-sm hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  {testing ? 'Creating test draft…' : 'Test Connection'}
                </button>
                <button
                  type="button"
                  onClick={handleRevokeGmail}
                  disabled={revoking}
                  className="inline-flex items-center gap-2 rounded-[8px] px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  {revoking ? 'Revoking…' : 'Revoke Access'}
                </button>
              </div>
            </div>
          ) : (
            /* State A: Disconnected – Google logo, explanation, Connect Gmail */
            <div className="text-center sm:text-left">
              <div className="flex justify-center sm:justify-start mb-4">
                <GoogleLogoIcon className="h-10 w-10" />
              </div>
              <p className="text-slate-600 mb-4">
                Connect Gmail to send AI-drafted outreach and save drafts from the Campaign drawer. Your tokens are stored securely and never shared.
              </p>
              <button
                type="button"
                onClick={handleSignInGmail}
                className="inline-flex items-center gap-2 rounded-[8px] px-5 py-3 text-sm font-medium text-white bg-[var(--color-primary)] shadow-md hover:bg-[var(--color-primary-hover)] transition-colors"
              >
                <GoogleLogoIcon className="h-5 w-5" />
                Connect Gmail
              </button>
              <p className="mt-4 text-xs text-slate-500">
                If you see a Google error, ensure the redirect URI in Google Cloud Console matches your environment.{' '}
                <a
                  href={`${API_BASE}/api/gmail/redirect-uri`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-primary)] hover:underline"
                >
                  Check redirect URI
                </a>
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
