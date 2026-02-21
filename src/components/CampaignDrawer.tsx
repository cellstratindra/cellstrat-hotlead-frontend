import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { HotLead } from '../types/leads'
import type { CampaignDraftResponse } from '../types/leads'
import { fetchCampaignDraft } from '../api/client'

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
  const [selectedLead, setSelectedLead] = useState<HotLead | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && leads.length > 0) {
      setSelectedLead(leads[0])
      setDraft(null)
      setError(null)
    }
  }, [open, leads])
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<CampaignDraftResponse | null>(null)

  const handleGenerate = async () => {
    if (!selectedLead) return
    setError(null)
    setDraft(null)
    setLoading(true)
    try {
      const result = await fetchCampaignDraft(selectedLead)
      setDraft(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate draft')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
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
        className="fixed top-0 right-0 z-50 h-full w-full max-w-lg bg-white shadow-xl flex flex-col"
        role="dialog"
        aria-label="Generate Campaign"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-lg font-semibold text-slate-900">Generate Campaign</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Sequence Map */}
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-2">Sequence</h3>
            <div className="flex items-center gap-2">
              {SEQUENCE_STEPS.map((step, i) => (
                <div key={step.id} className="flex items-center gap-2">
                  <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-800">
                    {step.label}
                  </div>
                  {i < SEQUENCE_STEPS.length - 1 && (
                    <span className="text-slate-400">→</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Lead selector */}
          <div>
            <label htmlFor="campaign-lead" className="block text-sm font-medium text-slate-700 mb-1">
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
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
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
            className="w-full rounded-lg bg-gradient-to-r from-violet-500 to-blue-600 px-4 py-3 text-sm font-medium text-white shadow-sm hover:from-violet-600 hover:to-blue-700 disabled:opacity-50"
          >
            {loading ? 'Generating…' : 'Generate email draft'}
          </button>

          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </div>
          )}

          {draft && (
            <div className="space-y-4">
              {draft.hook && (
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-1">Opening hook</h3>
                  <p className="text-sm text-slate-800 bg-slate-50 rounded-lg p-3">{draft.hook}</p>
                  <button
                    type="button"
                    onClick={() => handleCopy(draft.hook)}
                    className="mt-1 text-xs text-blue-600 hover:underline"
                  >
                    Copy
                  </button>
                </div>
              )}
              {draft.email_draft && (
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-1">Email draft</h3>
                  <p className="text-sm text-slate-800 bg-slate-50 rounded-lg p-3 whitespace-pre-wrap">
                    {draft.email_draft}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleCopy(draft.email_draft)}
                    className="mt-1 text-xs text-blue-600 hover:underline"
                  >
                    Copy
                  </button>
                </div>
              )}
              {draft.linkedin_bullets?.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-1">LinkedIn bullets</h3>
                  <ul className="list-disc list-inside text-sm text-slate-800 space-y-1">
                    {draft.linkedin_bullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => handleCopy(draft.linkedin_bullets!.join('\n'))}
                    className="mt-1 text-xs text-blue-600 hover:underline"
                  >
                    Copy all
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
