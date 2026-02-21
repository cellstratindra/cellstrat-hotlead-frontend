import { useState } from 'react'
import type { HotLead } from '../types/leads'
import { ReviewsModal } from './ReviewsModal'
import { explainScore } from '../api/client'

interface LeadCardProps {
  lead: HotLead
  /** e.g. "Cardiology in Bangalore" for benchmark label */
  marketLabel?: string | null
  /** Show checkbox for multi-select */
  showCheckbox?: boolean
  selected?: boolean
  onToggle?: (checked: boolean) => void
}

function reviewSnippet(lead: HotLead): string {
  const reviews = lead.reviews ?? []
  if (reviews.length === 0) return ''
  const first = (reviews[0]?.text ?? '').trim()
  if (!first) return ''
  return first.length <= 80 ? first : first.slice(0, 80) + '…'
}

function matchBandLabel(band: string | null | undefined): string {
  if (!band) return ''
  switch (band) {
    case 'very_similar':
      return 'High match'
    case 'similar':
      return 'Medium match'
    case 'far':
      return 'Low match'
    default:
      return band
  }
}

export function LeadCard({ lead, marketLabel, showCheckbox, selected, onToggle }: LeadCardProps) {
  const [reviewsOpen, setReviewsOpen] = useState(false)
  const [aiExplanation, setAiExplanation] = useState<string | null>(null)
  const [explainLoading, setExplainLoading] = useState(false)
  const snippet = reviewSnippet(lead)
  const score = lead.recommendation_score != null ? Math.round(lead.recommendation_score) : null
  const tier = lead.tier ?? null

  async function handleExplainScore() {
    setExplainLoading(true)
    setAiExplanation(null)
    try {
      const { explanation } = await explainScore(lead)
      setAiExplanation(explanation)
    } catch {
      setAiExplanation('Could not load explanation.')
    } finally {
      setExplainLoading(false)
    }
  }

  return (
    <>
      <article
        className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
        aria-label={`Lead: ${lead.name}`}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            {showCheckbox && onToggle && (
              <input
                type="checkbox"
                checked={selected ?? false}
                onChange={(e) => onToggle(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                aria-label={`Select ${lead.name}`}
              />
            )}
            <h3 className="text-lg font-semibold leading-tight text-slate-900 flex-1 min-w-0">
              {lead.name ?? '—'}
            </h3>
            <div className="flex shrink-0 items-center gap-2">
              {score != null && (
                <span
                  className="text-xl font-bold tabular-nums text-[#2563EB] cursor-help"
                  title="Recommendation score (0–100): based on rating, review volume, phone availability, and enrichment. Higher = stronger fit for outreach."
                  aria-label={`Score ${score}`}
                >
                  {score}
                </span>
              )}
              {tier && (
                <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-sm font-semibold text-slate-800">
                  {tier}
                </span>
              )}
            </div>
          </div>
          {score != null && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleExplainScore}
                disabled={explainLoading}
                className="text-xs text-slate-500 hover:text-[#2563EB] disabled:opacity-50"
              >
                {explainLoading ? '…' : 'Explain with AI'}
              </button>
              {aiExplanation && (
                <span className="text-xs text-slate-600">{aiExplanation}</span>
              )}
            </div>
          )}

          {(lead.match_band || lead.relevance_score != null) && (
            <p className="text-xs font-medium text-slate-600">
              {matchBandLabel(lead.match_band)}
              {lead.relevance_score != null && (
                <span className="ml-1" title={`Relevance score: ${lead.relevance_score}`}>
                  ({Math.round(lead.relevance_score)})
                </span>
              )}
            </p>
          )}
          {lead.percentile_in_market != null && lead.total_in_market != null && (
            <p className="text-xs font-medium text-[#2563EB]">
              Top {Math.round(100 - lead.percentile_in_market)}%{marketLabel ? ` of ${marketLabel}` : ''} · Rank {lead.rank_in_market ?? '—'} of {lead.total_in_market}
            </p>
          )}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            <div>
              <dt className="text-slate-500">Rating</dt>
              <dd className="font-medium text-slate-900">{(Number(lead.rating) ?? 0).toFixed(1)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Reviews</dt>
              <dd className="font-medium text-slate-900">{lead.review_count ?? 0}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Reach</dt>
              <dd className="font-medium text-slate-900">
                {lead.estimated_monthly_patients != null
                  ? `Est. ${lead.estimated_monthly_patients.toLocaleString()}/mo`
                  : (lead.reach_band ?? '—')}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Budget</dt>
              <dd className="font-medium text-slate-900">{lead.estimated_budget_tier ?? '—'}</dd>
            </div>
          </dl>

          {lead.phone && (
            <p className="text-sm text-slate-600">
              <span className="text-slate-500">Phone </span>
              {lead.phone}
            </p>
          )}

          {(lead.contact_email || lead.director_name) && (
            <div className="text-sm text-slate-600 space-y-0.5">
              {lead.director_name && (
                <p><span className="text-slate-500">Director </span>{lead.director_name}</p>
              )}
              {lead.contact_email && (
                <p><span className="text-slate-500">Email </span>{lead.contact_email}</p>
              )}
            </div>
          )}

          {snippet && (
            <p className="line-clamp-2 text-sm text-slate-600" title={snippet}>
              {snippet}
            </p>
          )}

          <div className="mt-auto pt-2">
            <button
              type="button"
              onClick={() => setReviewsOpen(true)}
              className="rounded-lg border border-[#2563EB] bg-white px-3 py-2 text-sm font-medium text-[#2563EB] shadow-sm hover:bg-[#2563EB]/5"
            >
              View reviews
            </button>
          </div>
        </div>
      </article>

      <ReviewsModal
        lead={reviewsOpen ? lead : null}
        open={reviewsOpen}
        onClose={() => setReviewsOpen(false)}
      />
    </>
  )
}
