import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Zap, User, Phone, Mail, FileText } from 'lucide-react'
import type { HotLead } from '../types/leads'
import { ReviewsModal } from './ReviewsModal'
import { TeamDispatchPopover } from './TeamDispatchPopover'
import { explainScore, type AssignableUser } from '../api/client'

interface LeadCardProps {
  lead: HotLead & { id?: number | null; assigned_to?: string | null }
  /** e.g. "Cardiology in Bangalore" for benchmark label */
  marketLabel?: string | null
  /** Show checkbox for multi-select */
  showCheckbox?: boolean
  selected?: boolean
  onToggle?: (checked: boolean) => void
  /** When set, show Assigned To area and Team Dispatch popover (saved leads only) */
  assignableUsers?: AssignableUser[]
  currentUserId?: string | null
  onAssign?: (userId: string) => Promise<void>
  onUnassign?: () => Promise<void>
  onAssignmentChange?: () => void
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

export function LeadCard({
  lead,
  marketLabel,
  showCheckbox,
  selected,
  onToggle,
  assignableUsers,
  currentUserId,
  onAssign,
  onUnassign,
  onAssignmentChange,
}: LeadCardProps) {
  const [reviewsOpen, setReviewsOpen] = useState(false)
  const [dispatchOpen, setDispatchOpen] = useState(false)
  const [aiExplanation, setAiExplanation] = useState<string | null>(null)
  const [explainLoading, setExplainLoading] = useState(false)
  const assignAnchorRef = useRef<HTMLButtonElement>(null)
  const snippet = reviewSnippet(lead)
  const score = lead.recommendation_score != null ? Math.round(lead.recommendation_score) : null
  const tier = lead.tier ?? null
  const stage = (lead as HotLead & { stage?: string }).stage
  const showWorkflowBadge = stage === 'qualified'
  const leadId = lead.id
  const assignedTo = lead.assigned_to ?? null
  const showAssignedTo =
    leadId != null && (assignableUsers?.length || onAssign) && (onAssign != null || onUnassign != null)

  async function handleAssign(userId: string) {
    if (onAssign) await onAssign(userId)
    onAssignmentChange?.()
  }
  async function handleUnassign() {
    if (onUnassign) await onUnassign()
    onAssignmentChange?.()
  }

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
        className="rounded-[var(--radius-card)] border-default bg-white/90 backdrop-blur-sm p-[var(--space-5)] shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-dropdown)]"
        aria-label={`Lead: ${lead.name}`}
      >
        <div className="flex flex-col gap-[var(--space-4)]">
          {/* Header: clinic name (left) + Tier & Score chips (right) */}
          <div className="flex items-start justify-between gap-[var(--space-3)]">
            {showCheckbox && onToggle && (
              <input
                type="checkbox"
                checked={selected ?? false}
                onChange={(e) => onToggle(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)] shrink-0 mt-0.5"
                aria-label={`Select ${lead.name}`}
              />
            )}
            <h3 className="text-lg font-semibold leading-tight text-slate-900 flex-1 min-w-0">
              {lead.name ?? '—'}
            </h3>
            <div className="flex shrink-0 items-center gap-[var(--space-2)] flex-wrap justify-end">
              {score != null && (
                <span
                  className="text-xl font-bold tabular-nums text-[var(--color-primary)] cursor-help rounded-[var(--radius-button)] bg-[var(--color-primary)]/15 px-[var(--space-2)] py-[var(--space-1)] border border-[var(--color-primary)]/30"
                  title="Hot score (0–100): based on rating, review volume, phone availability, and enrichment. Higher = stronger fit for outreach."
                  aria-label={`Hot score ${score}`}
                >
                  {score}
                </span>
              )}
              {tier && (
                <span className="rounded-[var(--radius-sm)] border border-slate-200 bg-slate-50 px-2 py-0.5 text-sm font-semibold text-slate-800">
                  {tier}
                </span>
              )}
              {showWorkflowBadge && (
                <span className="inline-flex items-center gap-1 rounded-[var(--radius-button)] bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700" title="In nurture sequence">
                  <Zap className="h-3 w-3" aria-hidden />
                  Nurture
                </span>
              )}
            </div>
          </div>
          {/* Lead Source pill when marketLabel is present */}
          {marketLabel && (
            <span className="inline-flex w-fit rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600" aria-label={`Lead source: ${marketLabel}`}>
              {marketLabel}
            </span>
          )}
          {/* Secondary line: phone (mobile-friendly) */}
          {lead.phone && (
            <p className="text-sm text-slate-500 -mt-1">
              {lead.phone}
            </p>
          )}
          {score != null && (
            <div className="flex items-center gap-[var(--space-2)] flex-wrap">
              <button
                type="button"
                onClick={handleExplainScore}
                disabled={explainLoading}
                className="text-xs text-slate-500 hover:text-[var(--color-primary)] disabled:opacity-50"
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
                <span className="ml-[var(--space-1)]" title={`Relevance score: ${lead.relevance_score}`}>
                  ({Math.round(lead.relevance_score)})
                </span>
              )}
            </p>
          )}
          {lead.percentile_in_market != null && lead.total_in_market != null && (
            <p className="text-xs font-medium text-[var(--color-primary)]">
              Top {Math.round(100 - lead.percentile_in_market)}%{marketLabel ? ` of ${marketLabel}` : ''} · Rank {lead.rank_in_market ?? '—'} of {lead.total_in_market}
            </p>
          )}
          <dl className="grid grid-cols-2 gap-x-[var(--space-4)] gap-y-[var(--space-2)] text-sm">
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
            <div className="text-sm text-slate-600 space-y-[var(--space-1)]">
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

          {showAssignedTo && (
            <div className="flex items-center gap-[var(--space-2)]">
              <span className="text-xs text-slate-500">Assigned to</span>
              <button
                ref={assignAnchorRef}
                type="button"
                onClick={() => setDispatchOpen((o) => !o)}
                className="flex items-center gap-[var(--space-2)] rounded-[var(--radius-button)] border border-slate-200 bg-slate-50 px-[var(--space-2)] py-[var(--space-1)] text-sm hover:bg-slate-100"
                aria-label="Assign or change assignment"
              >
                {assignedTo ? (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-primary)]/15 text-xs font-medium text-[var(--color-primary)]">
                    {assignedTo.slice(0, 2).toUpperCase()}
                  </span>
                ) : (
                  <User className="h-4 w-4 text-slate-400" />
                )}
                <span className="text-slate-700">{assignedTo ? assignedTo.slice(0, 12) : 'Unassigned'}</span>
              </button>
              <TeamDispatchPopover
                open={dispatchOpen}
                onClose={() => setDispatchOpen(false)}
                anchorRef={assignAnchorRef}
                leadId={leadId!}
                assignedTo={assignedTo}
                users={assignableUsers ?? []}
                currentUserId={currentUserId}
                onAssign={handleAssign}
                onUnassign={handleUnassign}
              />
            </div>
          )}

          {/* Footer: quick actions (Call, Email, Note) + View reviews */}
          <div className="mt-auto pt-[var(--space-2)] flex flex-wrap items-center gap-[var(--space-2)] border-t border-slate-100">
            <div className="flex items-center gap-[var(--space-1)]">
              {lead.phone && (
                <a
                  href={`tel:${lead.phone.replace(/\D/g, '')}`}
                  className="touch-target flex items-center justify-center rounded-[var(--radius-button)] p-[var(--space-2)] text-slate-600 hover:bg-slate-100 hover:text-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
                  style={{ minHeight: 'var(--touch-min)', minWidth: 'var(--touch-min)' }}
                  aria-label="Call"
                >
                  <Phone className="h-5 w-5" aria-hidden />
                </a>
              )}
              {lead.contact_email && (
                <a
                  href={`mailto:${lead.contact_email}`}
                  className="touch-target flex items-center justify-center rounded-[var(--radius-button)] p-[var(--space-2)] text-slate-600 hover:bg-slate-100 hover:text-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
                  style={{ minHeight: 'var(--touch-min)', minWidth: 'var(--touch-min)' }}
                  aria-label="Email"
                >
                  <Mail className="h-5 w-5" aria-hidden />
                </a>
              )}
              {leadId != null && (
                <Link
                  to={`/leads/${leadId}`}
                  className="touch-target flex items-center justify-center rounded-[var(--radius-button)] p-[var(--space-2)] text-slate-600 hover:bg-slate-100 hover:text-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
                  style={{ minHeight: 'var(--touch-min)', minWidth: 'var(--touch-min)' }}
                  aria-label="Note / View detail"
                >
                  <FileText className="h-5 w-5" aria-hidden />
                </Link>
              )}
            </div>
            <button
              type="button"
              onClick={() => setReviewsOpen(true)}
              className="rounded-[var(--radius-button)] border border-[var(--color-primary)] bg-white px-[var(--space-3)] py-[var(--space-2)] text-sm font-medium text-[var(--color-primary)] shadow-sm hover:bg-[var(--color-primary)]/5 touch-target"
              style={{ minHeight: 'var(--touch-min)' }}
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
