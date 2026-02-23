import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Zap, User, Phone, Mail, FileText, MoreHorizontal } from 'lucide-react'
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
  const [cardMenuOpen, setCardMenuOpen] = useState(false)
  const [aiExplanation, setAiExplanation] = useState<string | null>(null)
  const [explainLoading, setExplainLoading] = useState(false)
  const assignAnchorRef = useRef<HTMLButtonElement>(null)
  const cardMenuRef = useRef<HTMLDivElement>(null)
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

  useEffect(() => {
    if (!cardMenuOpen) return
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && setCardMenuOpen(false)
    const onClick = (e: MouseEvent) => {
      if (cardMenuRef.current && !cardMenuRef.current.contains(e.target as Node)) setCardMenuOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('click', onClick, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('click', onClick, true)
    }
  }, [cardMenuOpen])

  return (
    <>
      <article
        className="rounded-[var(--radius-card)] border border-slate-200/80 bg-white shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-dropdown)] p-[var(--space-3)]"
        aria-label={`Lead: ${lead.name}`}
      >
        <div className="flex flex-col gap-[var(--space-2)]">
          {/* Top row: clinic name (left) + score badge (right) */}
          <div className="flex items-start justify-between gap-[var(--space-2)]">
            {showCheckbox && onToggle && (
              <input
                type="checkbox"
                checked={selected ?? false}
                onChange={(e) => onToggle(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)] shrink-0 mt-0.5"
                aria-label={`Select ${lead.name}`}
              />
            )}
            <h3 className="text-[14px] font-semibold leading-tight text-slate-900 flex-1 min-w-0 line-clamp-2">
              {lead.name ?? '—'}
            </h3>
            <div className="flex shrink-0 items-center gap-[var(--space-1)] flex-wrap justify-end">
              {score != null && (
                <span
                  className="text-sm font-bold tabular-nums text-[var(--color-primary)] cursor-help rounded-md bg-[var(--color-primary)]/15 px-[var(--space-2)] py-0.5 border border-[var(--color-primary)]/30"
                  title="Hot score (0–100)"
                  aria-label={`Hot score ${score}`}
                >
                  {score}
                </span>
              )}
              {tier && (
                <span className="rounded border border-slate-200 bg-slate-50 px-[var(--space-1)] py-0.5 text-xs font-medium text-slate-700">
                  {tier}
                </span>
              )}
              {showWorkflowBadge && (
                <span className="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-[var(--space-1)] py-0.5 text-xs font-medium text-emerald-700" title="In nurture sequence">
                  <Zap className="h-3 w-3" aria-hidden />
                  Nurture
                </span>
              )}
            </div>
          </div>
          {/* Middle: metadata (specialty/source + phone) in one compact line */}
          <div className="text-xs text-slate-500 min-h-0">
            {marketLabel && <span>{marketLabel}</span>}
            {marketLabel && lead.phone && <span className="mx-1">·</span>}
            {lead.phone && <span>{lead.phone}</span>}
            {!marketLabel && !lead.phone && <span>&nbsp;</span>}
          </div>
          {/* Optional compact stats row */}
          <dl className="grid grid-cols-4 gap-x-[var(--space-2)] gap-y-0 text-xs">
            <div>
              <dt className="text-slate-400">Rating</dt>
              <dd className="font-medium text-slate-700">{(Number(lead.rating) ?? 0).toFixed(1)}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Reviews</dt>
              <dd className="font-medium text-slate-700">{lead.review_count ?? 0}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Reach</dt>
              <dd className="font-medium text-slate-700 truncate" title={lead.reach_band ?? ''}>
                {lead.estimated_monthly_patients != null ? `${(lead.estimated_monthly_patients / 1000).toFixed(0)}k/mo` : (lead.reach_band ?? '—')}
              </dd>
            </div>
            <div>
              <dt className="text-slate-400">Budget</dt>
              <dd className="font-medium text-slate-700 truncate">{lead.estimated_budget_tier ?? '—'}</dd>
            </div>
          </dl>

          {showAssignedTo && (
            <div className="flex items-center gap-[var(--space-2)]">
              <span className="text-xs text-slate-500">Assigned to</span>
              <button
                ref={assignAnchorRef}
                type="button"
                onClick={() => setDispatchOpen((o) => !o)}
                className="flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs hover:bg-slate-100"
                aria-label="Assign or change assignment"
              >
                {assignedTo ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary)]/15 text-xs font-medium text-[var(--color-primary)]">
                    {assignedTo.slice(0, 2).toUpperCase()}
                  </span>
                ) : (
                  <User className="h-3.5 w-3.5 text-slate-400" />
                )}
                <span className="text-slate-700">{assignedTo ? assignedTo.slice(0, 10) : 'Unassigned'}</span>
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

          {/* Bottom row: primary action + ... menu (44px touch targets on mobile) */}
          <div className="mt-auto pt-[var(--space-2)] flex items-center justify-between gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setReviewsOpen(true)}
              className="touch-target min-h-[44px] min-w-[44px] rounded-md border border-[var(--color-primary)] bg-white px-3 py-2 text-xs font-medium text-[var(--color-primary)] shadow-sm hover:bg-[var(--color-primary)]/5 md:min-h-0 md:min-w-0 md:py-1.5"
            >
              View reviews
            </button>
            <div className="relative" ref={cardMenuRef}>
              <button
                type="button"
                onClick={() => setCardMenuOpen((o) => !o)}
                className="touch-target flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-700 md:h-8 md:w-8 md:min-h-0 md:min-w-0"
                aria-label="More actions"
                aria-expanded={cardMenuOpen}
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden />
              </button>
              {cardMenuOpen && (
                <div
                  className="absolute right-0 top-full z-50 mt-1 min-w-[140px] rounded-md border border-slate-200 bg-white py-1 shadow-lg"
                  role="menu"
                >
                  {lead.phone && (
                    <a
                      href={`tel:${lead.phone.replace(/\D/g, '')}`}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                      role="menuitem"
                      onClick={() => setCardMenuOpen(false)}
                    >
                      <Phone className="h-3.5 w-3.5" /> Call
                    </a>
                  )}
                  {lead.contact_email && (
                    <a
                      href={`mailto:${lead.contact_email}`}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                      role="menuitem"
                      onClick={() => setCardMenuOpen(false)}
                    >
                      <Mail className="h-3.5 w-3.5" /> Email
                    </a>
                  )}
                  {leadId != null && (
                    <Link
                      to={`/leads/${leadId}`}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                      role="menuitem"
                      onClick={() => setCardMenuOpen(false)}
                    >
                      <FileText className="h-3.5 w-3.5" /> View detail
                    </Link>
                  )}
                  {score != null && (
                    <button
                      type="button"
                      onClick={() => { handleExplainScore(); setCardMenuOpen(false); }}
                      disabled={explainLoading}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      role="menuitem"
                    >
                      {explainLoading ? '…' : 'Explain with AI'}
                    </button>
                  )}
                </div>
              )}
            </div>
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
