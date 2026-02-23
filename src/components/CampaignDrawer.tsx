import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@clerk/clerk-react'
import { X, Copy, Send, Bold, Italic, List, FileText, ChevronDown, ChevronUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { HotLead } from '../types/leads'
import type { CampaignDraftResponse } from '../types/leads'
import {
  fetchCampaignDraft,
  getGmailStatus,
  sendGmail,
  createGmailDraft,
} from '../api/client'

const SEQUENCE_STEPS = [
  { id: 'email', label: 'Email' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'call', label: 'Call' },
]

interface CampaignDrawerProps {
  open: boolean
  onClose: () => void
  leads: HotLead[]
}

export function CampaignDrawer({ open, onClose, leads }: CampaignDrawerProps) {
  const { user } = useUser()
  const [selectedLead, setSelectedLead] = useState<HotLead | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<CampaignDraftResponse | null>(null)
  const [focusedStep, setFocusedStep] = useState<string>('email')
  const [to, setTo] = useState('')
  const [cc, setCc] = useState('')
  const [bcc, setBcc] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [smartCopySuccess, setSmartCopySuccess] = useState(false)
  const [gmailConnected, setGmailConnected] = useState(false)
  const [gmailStatus, setGmailStatus] = useState<'idle' | 'sending' | 'saving_draft'>('idle')
  const [gmailError, setGmailError] = useState<string | null>(null)
  const [sendSuccess, setSendSuccess] = useState(false)
  const [draftSuccess, setDraftSuccess] = useState(false)
  const [trackWithLead, setTrackWithLead] = useState(true)
  const [showAiHookMobile, setShowAiHookMobile] = useState(false)

  useEffect(() => {
    if (open && leads.length > 0) {
      setSelectedLead(leads[0])
      setDraft(null)
      setError(null)
      setTo('')
      setCc('')
      setBcc('')
      setSubject('')
      setBody('')
      setGmailStatus('idle')
      setGmailError(null)
      setSendSuccess(false)
      setDraftSuccess(false)
      setLoading(false)
      setShowAiHookMobile(false)
    }
  }, [open, leads])

  useEffect(() => {
    if (!open || !user?.id) return
    getGmailStatus(user.id)
      .then((s) => setGmailConnected(s.connected))
      .catch(() => setGmailConnected(false))
  }, [open, user?.id])

  useEffect(() => {
    if (draft?.email_draft) {
      setBody(draft.email_draft)
      if (!subject) setSubject(`Re: ${selectedLead?.name ?? 'Lead'}`)
    }
  }, [draft, selectedLead?.name, subject])

  const handleGenerate = async () => {
    if (!selectedLead) return
    setError(null)
    setDraft(null)
    setLoading(true)
    const safetyTimer = setTimeout(() => setLoading(false), 35000)
    try {
      const result = await fetchCampaignDraft(selectedLead)
      setDraft(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate draft')
    } finally {
      clearTimeout(safetyTimer)
      setLoading(false)
    }
  }

  const handleSmartCopy = useCallback(() => {
    const lines = []
    if (to) lines.push(`To: ${to}`)
    if (cc) lines.push(`Cc: ${cc}`)
    if (bcc) lines.push(`Bcc: ${bcc}`)
    lines.push(`Subject: ${subject}`, '', body)
    const fullEmail = lines.join('\n')
    navigator.clipboard.writeText(fullEmail)
    setSmartCopySuccess(true)
    const t = setTimeout(() => setSmartCopySuccess(false), 1500)
    return () => clearTimeout(t)
  }, [to, cc, bcc, subject, body])

  const handleSendViaGmail = async () => {
    if (!user?.id) return
    if (!gmailConnected) {
      setGmailError('Connect Gmail in Settings to send from here.')
      return
    }
    if (!to.trim()) {
      setGmailError('Enter a recipient (To) address.')
      return
    }
    setGmailError(null)
    setSendSuccess(false)
    setGmailStatus('sending')
    try {
      await sendGmail({
        user_id: user.id,
        to: to.trim(),
        subject: subject.trim(),
        body: body.trim(),
        cc: cc.trim() || null,
        bcc: bcc.trim() || null,
        lead_id: trackWithLead && selectedLead?.id != null ? selectedLead.id : undefined,
      })
      setSendSuccess(true)
      setTimeout(() => setSendSuccess(false), 4000)
    } catch (e) {
      setGmailError(e instanceof Error ? e.message : 'Send failed')
    } finally {
      setGmailStatus('idle')
    }
  }

  const handleSaveAsDraft = async () => {
    if (!user?.id) return
    if (!gmailConnected) {
      setGmailError('Connect Gmail in Settings to save drafts.')
      return
    }
    if (!to.trim()) {
      setGmailError('Enter a recipient (To) address.')
      return
    }
    setGmailError(null)
    setDraftSuccess(false)
    setGmailStatus('saving_draft')
    try {
      await createGmailDraft({
        user_id: user.id,
        to: to.trim(),
        subject: subject.trim(),
        body: body.trim(),
        cc: cc.trim() || null,
        bcc: bcc.trim() || null,
      })
      setDraftSuccess(true)
      setTimeout(() => setDraftSuccess(false), 4000)
    } catch (e) {
      setGmailError(e instanceof Error ? e.message : 'Save draft failed')
    } finally {
      setGmailStatus('idle')
    }
  }

  const insertFormat = (before: string, after: string) => {
    setBody((prev) => prev + (prev ? '\n' : '') + before + after)
  }

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40"
        aria-hidden
        onClick={onClose}
      />
      <aside
        className="fixed inset-0 md:inset-auto md:top-0 md:right-0 z-50 h-full w-full md:max-w-4xl bg-white shadow-[var(--shadow-dropdown)] flex flex-col md:rounded-l-[var(--radius-button)] overflow-hidden"
        role="dialog"
        aria-label="Generate Campaign"
      >
        <div className="flex items-center justify-between gap-[var(--space-2)] border-b border-slate-200 px-[var(--space-4)] py-[var(--space-3)] bg-[var(--color-navy)]">
          <div className="flex items-center gap-[var(--space-2)] min-w-0">
            <h2 className="text-lg font-semibold text-white truncate">Generate Campaign</h2>
            {gmailConnected ? (
              <span className="shrink-0 inline-flex items-center gap-[var(--space-1)] rounded-full bg-emerald-500/20 px-[var(--space-2)] py-[var(--space-1)] text-xs font-medium text-emerald-300" title="Gmail connected">
                Gmail connected
              </span>
            ) : (
              <Link to="/settings" className="shrink-0 inline-flex items-center rounded-full bg-amber-500/20 px-[var(--space-2)] py-[var(--space-1)] text-xs font-medium text-amber-200 hover:bg-amber-500/30" title="Connect Gmail">
                Connect Gmail
              </Link>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="touch-target rounded-[var(--radius-button)] p-[var(--space-2)] text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            style={{ minHeight: 'var(--touch-min)', minWidth: 'var(--touch-min)' }}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 flex flex-col min-h-0 md:flex-row">
          {/* Left pane: Sequence + Lead + Generate (stacked above composer on mobile); single-column on mobile */}
          <div className="w-full md:w-[320px] shrink-0 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col overflow-hidden md:max-h-none flex-1 md:flex-initial min-h-0">
            <div className="p-[var(--space-4)] space-y-[var(--space-4)] overflow-y-auto flex-1 min-h-0">
              <div>
                <h3 className="text-sm font-medium text-[var(--color-navy)] mb-[var(--space-2)]">Sequence</h3>
                <div className="flex items-center gap-[var(--space-2)] flex-wrap">
                  {SEQUENCE_STEPS.map((step, i) => (
                    <div key={step.id} className="flex items-center gap-[var(--space-2)]">
                      <button
                        type="button"
                        onClick={() => setFocusedStep(step.id)}
                        className={`rounded-[var(--radius-button)] px-[var(--space-3)] py-[var(--space-2)] text-sm font-medium transition-colors ${
                          focusedStep === step.id
                            ? 'bg-[var(--color-primary)] text-white shadow-sm'
                            : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                        }`}
                      >
                        {step.label}
                      </button>
                      {i < SEQUENCE_STEPS.length - 1 && (
                        <span className="text-slate-400" aria-hidden>→</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="campaign-lead" className="block text-sm font-medium text-[var(--color-navy)] mb-[var(--space-1)]">
                  Select lead
                </label>
                <select
                  id="campaign-lead"
                  value={selectedLead?.place_id ?? ''}
                  onChange={(e) => {
                    const lead = leads.find((l) => l.place_id === e.target.value) ?? null
                    setSelectedLead(lead)
                    setDraft(null)
                  }}
                  className="w-full rounded-[var(--radius-button)] border border-slate-300 px-[var(--space-3)] py-[var(--space-2)] text-sm text-slate-900 shadow-sm focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:outline-none min-h-[var(--touch-min)]"
                >
                  {leads.map((l) => (
                    <option key={l.place_id} value={l.place_id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading || !selectedLead}
                className="w-full rounded-[var(--radius-button)] bg-gradient-to-r from-violet-500 to-[var(--color-primary)] px-[var(--space-4)] py-[var(--space-3)] text-sm font-medium text-white shadow-sm hover:from-violet-600 hover:to-[var(--color-primary-hover)] disabled:opacity-50 transition-colors"
              >
                {loading ? 'Generating…' : 'Generate email draft'}
              </button>
              {loading && (
                <p className="text-sm text-slate-600 rounded-[var(--radius-button)] bg-slate-50 px-[var(--space-3)] py-[var(--space-2)]" role="status">
                  AI is writing your email…
                </p>
              )}

              {error && (
                <div className="rounded-[var(--radius-button)] bg-red-50 px-[var(--space-3)] py-[var(--space-2)] text-sm text-red-700" role="alert">
                  {error}
                </div>
              )}

              {/* Desktop: always show hook + bullets. Mobile: expandable "Show AI hook" */}
              {(draft?.hook || (draft?.linkedin_bullets?.length ?? 0) > 0) && (
                <>
                  <div className="md:hidden">
                    <button
                      type="button"
                      onClick={() => setShowAiHookMobile((v) => !v)}
                      className="touch-target w-full flex items-center justify-between gap-[var(--space-2)] rounded-[var(--radius-button)] border border-slate-200 bg-slate-50 px-[var(--space-3)] py-[var(--space-2)] text-sm font-medium text-[var(--color-navy)] hover:bg-slate-100"
                      style={{ minHeight: 'var(--touch-min)' }}
                      aria-expanded={showAiHookMobile}
                    >
                      <span>Show AI hook</span>
                      {showAiHookMobile ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {showAiHookMobile && (
                      <div className="mt-[var(--space-2)] space-y-[var(--space-2)]">
                        {draft?.hook && (
                          <div>
                            <h3 className="text-sm font-medium text-[var(--color-navy)] mb-[var(--space-1)]">Opening hook</h3>
                            <p className="text-sm text-slate-700 bg-slate-50 rounded-[var(--radius-button)] p-[var(--space-3)]">{draft.hook}</p>
                          </div>
                        )}
                        {draft?.linkedin_bullets?.length ? (
                          <div>
                            <h3 className="text-sm font-medium text-[var(--color-navy)] mb-[var(--space-1)]">LinkedIn bullets</h3>
                            <ul className="list-disc list-inside text-sm text-slate-700 space-y-[var(--space-1)]">
                              {draft.linkedin_bullets.map((b, i) => (
                                <li key={i}>{b}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                  <div className="hidden md:block">
                    {draft?.hook && (
                      <div>
                        <h3 className="text-sm font-medium text-[var(--color-navy)] mb-[var(--space-1)]">Opening hook</h3>
                        <p className="text-sm text-slate-700 bg-slate-50 rounded-[var(--radius-button)] p-[var(--space-3)]">{draft.hook}</p>
                      </div>
                    )}
                    {draft?.linkedin_bullets?.length ? (
                      <div>
                        <h3 className="text-sm font-medium text-[var(--color-navy)] mb-[var(--space-1)]">LinkedIn bullets</h3>
                        <ul className="list-disc list-inside text-sm text-slate-700 space-y-[var(--space-1)]">
                          {draft.linkedin_bullets.map((b, i) => (
                            <li key={i}>{b}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right pane: Email composer */}
          <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
            <h3 className="text-sm font-medium text-[var(--color-navy)] px-[var(--space-4)] pt-[var(--space-4)] pb-[var(--space-2)]">Email</h3>
            <div className="flex-1 flex flex-col px-[var(--space-4)] pb-[var(--space-4)] gap-[var(--space-3)] min-h-0 overflow-y-auto">
              <div>
                <label htmlFor="campaign-to" className="block text-xs font-medium text-slate-500 mb-[var(--space-1)]">To</label>
                <input
                  id="campaign-to"
                  type="email"
                  placeholder="recipient@example.com"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full rounded-[var(--radius-button)] border border-slate-200 bg-white px-[var(--space-3)] py-[var(--space-2)] text-sm text-slate-900 placeholder:text-slate-400 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:outline-none shadow-sm min-h-[var(--touch-min)]"
                />
              </div>
              <div>
                <label htmlFor="campaign-cc" className="block text-xs font-medium text-slate-500 mb-[var(--space-1)]">Cc (optional)</label>
                <input
                  id="campaign-cc"
                  type="text"
                  placeholder="cc@example.com"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  className="w-full rounded-[var(--radius-button)] border border-slate-200 bg-white px-[var(--space-3)] py-[var(--space-2)] text-sm text-slate-900 placeholder:text-slate-400 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:outline-none shadow-sm min-h-[var(--touch-min)]"
                />
              </div>
              <div>
                <label htmlFor="campaign-bcc" className="block text-xs font-medium text-slate-500 mb-[var(--space-1)]">Bcc (optional)</label>
                <input
                  id="campaign-bcc"
                  type="text"
                  placeholder="bcc@example.com"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  className="w-full rounded-[var(--radius-button)] border border-slate-200 bg-white px-[var(--space-3)] py-[var(--space-2)] text-sm text-slate-900 placeholder:text-slate-400 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:outline-none shadow-sm min-h-[var(--touch-min)]"
                />
              </div>
              <div>
                <label htmlFor="campaign-subject" className="block text-xs font-medium text-slate-500 mb-[var(--space-1)]">Subject</label>
                <input
                  id="campaign-subject"
                  type="text"
                  placeholder="Subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-[var(--radius-button)] border border-slate-200 bg-white px-[var(--space-3)] py-[var(--space-2)] text-sm text-slate-900 placeholder:text-slate-400 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:outline-none shadow-sm min-h-[var(--touch-min)]"
                />
              </div>
              {/* Gmail-inspired toolbar */}
              <div className="flex items-center gap-[var(--space-1)] rounded-[var(--radius-button)] border border-slate-200 bg-white px-[var(--space-2)] py-[var(--space-1)] shadow-sm">
                <button
                  type="button"
                  onClick={() => insertFormat('**', '**')}
                  className="touch-target p-[var(--space-2)] rounded-[var(--radius-sm)] hover:bg-slate-100 text-slate-600"
                  title="Bold"
                  aria-label="Bold"
                >
                  <Bold className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormat('_', '_')}
                  className="touch-target p-[var(--space-2)] rounded-[var(--radius-sm)] hover:bg-slate-100 text-slate-600"
                  title="Italic"
                  aria-label="Italic"
                >
                  <Italic className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormat('\n• ', '')}
                  className="touch-target p-[var(--space-2)] rounded-[var(--radius-sm)] hover:bg-slate-100 text-slate-600"
                  title="List"
                  aria-label="List"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
              <textarea
                placeholder="Compose your email…"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="flex-1 min-h-[200px] w-full rounded-[var(--radius-button)] border border-slate-200 bg-white px-[var(--space-3)] py-[var(--space-3)] text-sm text-slate-900 placeholder:text-slate-400 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:outline-none shadow-sm resize-y"
                rows={12}
              />
              {selectedLead?.id != null && (
                <label className="flex items-center gap-[var(--space-2)] text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={trackWithLead}
                    onChange={(e) => setTrackWithLead(e.target.checked)}
                    className="rounded border-slate-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                  />
                  Track this send to lead (updates follow-up count and last contact)
                </label>
              )}
              <div className="flex items-center gap-[var(--space-2)] flex-wrap">
                <button
                  type="button"
                  onClick={handleSmartCopy}
                  className="touch-target inline-flex items-center gap-[var(--space-2)] rounded-[var(--radius-button)] px-[var(--space-4)] py-[var(--space-2)] text-sm font-medium text-slate-700 bg-white border border-slate-200 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-colors"
                  style={{ minHeight: 'var(--touch-min)' }}
                >
                  <Copy className="h-4 w-4" />
                  {smartCopySuccess ? 'Copied!' : 'Smart Copy'}
                </button>
                <button
                  type="button"
                  onClick={handleSaveAsDraft}
                  disabled={gmailStatus !== 'idle'}
                  className="touch-target inline-flex items-center gap-[var(--space-2)] rounded-[var(--radius-button)] px-[var(--space-4)] py-[var(--space-2)] text-sm font-medium text-slate-700 bg-white border border-slate-200 shadow-sm hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 transition-colors"
                  style={{ minHeight: 'var(--touch-min)' }}
                >
                  <FileText className="h-4 w-4" />
                  {gmailStatus === 'saving_draft' ? 'Saving…' : 'Save as Draft'}
                </button>
                <button
                  type="button"
                  onClick={handleSendViaGmail}
                  disabled={gmailStatus !== 'idle'}
                  className="touch-target inline-flex items-center gap-[var(--space-2)] rounded-[var(--radius-button)] px-[var(--space-4)] py-[var(--space-2)] text-sm font-medium text-white bg-[var(--color-primary)] shadow-sm hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition-colors"
                  style={{ minHeight: 'var(--touch-min)' }}
                >
                  <Send className="h-4 w-4" />
                  Send via Gmail
                </button>
              </div>
              {!gmailConnected && (
                <p className="text-sm text-slate-600">
                  <Link to="/settings" className="text-[var(--color-primary)] hover:underline">
                    Connect Gmail in Settings
                  </Link>
                  {' '}to send or save drafts from here.
                </p>
              )}
              {gmailStatus !== 'idle' && (
                <div className="rounded-[var(--radius-button)] bg-slate-100 px-[var(--space-3)] py-[var(--space-2)] text-sm text-slate-600" role="status">
                  {gmailStatus === 'sending' && 'Sending…'}
                  {gmailStatus === 'saving_draft' && 'Saving draft to Gmail…'}
                </div>
              )}
              {sendSuccess && (
                <div className="rounded-[var(--radius-button)] bg-emerald-50 text-emerald-800 px-[var(--space-3)] py-[var(--space-2)] text-sm" role="alert">
                  Email sent.
                </div>
              )}
              {draftSuccess && (
                <div className="rounded-[var(--radius-button)] bg-emerald-50 text-emerald-800 px-[var(--space-3)] py-[var(--space-2)] text-sm" role="alert">
                  Draft saved to your Gmail. Open Gmail to edit and send.
                </div>
              )}
              {gmailError && (
                <div className="rounded-[var(--radius-button)] bg-red-50 text-red-700 px-[var(--space-3)] py-[var(--space-2)] text-sm" role="alert">
                  {gmailError}
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
