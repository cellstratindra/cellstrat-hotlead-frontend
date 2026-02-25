import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { Zap, User, Phone, Mail, FileText, MoreHorizontal, MapPin, Compass, Building2, Stethoscope, Smile, Activity, Plus, Check } from 'lucide-react'
import type { HotLead } from '../types/leads'
import { ReviewsModal } from './ReviewsModal'
import { TeamDispatchPopover } from './TeamDispatchPopover'
import { explainScore, type AssignableUser } from '../api/client'

/** Extract neighborhood/area from Google Places formatted address (e.g. "123 St, Indiranagar, Bengaluru, ..." -> "Indiranagar"). */
function extractAreaFromAddress(address?: string | null): string | null {
  if (!address) return null
  const parts = address.split(',').map((s) => s.trim()).filter(Boolean)
  if (parts.length >= 3) return parts[1]
  if (parts.length >= 2) return parts[0]
  return null
}

/** Distance from base point (when Base Point is set) */
export interface LeadCardDistance {
  distance_text: string
  duration_text: string
  duration_seconds: number
}

/** Color-coded similarity badge (80+ green, 60-79 amber, 40-59 red, <40 gray) */
function SimilarityBadge({ matchBand, relevanceScore, similarityScore }: { matchBand?: string | null; relevanceScore?: number | null; similarityScore?: number }) {
  const pct = similarityScore ?? (relevanceScore != null ? Math.round(relevanceScore) : null)
  if (pct == null && !matchBand) return null
  const score = pct ?? (matchBand === 'very_similar' ? 85 : matchBand === 'similar' ? 65 : 35)
  const tier = score >= 80 ? 'high' : score >= 60 ? 'med' : score >= 40 ? 'low' : 'poor'
  const classes = {
    high: 'bg-emerald-100 text-emerald-800',
    med: 'bg-amber-100 text-amber-800',
    low: 'bg-red-100 text-red-800',
    poor: 'bg-slate-100 text-slate-500',
  }
  return (
    <span className={`rounded px-2 py-0.5 text-[11px] font-bold whitespace-nowrap ${classes[tier]}`}>
      {score}% match
    </span>
  )
}

interface LeadCardProps {
  lead: HotLead & { id?: number | null; assigned_to?: string | null }
  /** e.g. "Cardiology in Bangalore" for benchmark label */
  marketLabel?: string | null
  /** When set, show distance badge (from base point) */
  distance?: LeadCardDistance | null
  /** Similarity score 0-100 (e.g. from ProximityView nearby item) */
  similarityScore?: number
  /** Anchor card variant: blue header, ANCHOR badge, different CTA */
  isAnchor?: boolean
  /** Callback to save this lead (shows "Save Lead" as primary CTA when set) */
  onSave?: (lead: HotLead) => void | Promise<void>
  /** When true, show "Saved" state (e.g. after saving by place_id before refetch) */
  isSavedOverride?: boolean
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
  /** When set and lead has coordinates, show "Find Nearby" in menu and call this on click */
  onFindNearby?: (lead: HotLead) => void
  /** When anchor, call when user clicks "Change anchor" */
  onChangeAnchor?: () => void
  /** When set and lead has coordinates, clicking the location MapPin centers the map on this lead */
  onLocateOnMap?: (lat: number, lng: number) => void
}

/** Category icon for place_types (specialty-agnostic search). */
function CategoryIcon({ placeTypes }: { placeTypes?: string[] }) {
  const types = (placeTypes ?? []).map((t) => t.toLowerCase())
  if (types.some((t) => t.includes('hospital'))) return <Building2 className="h-3.5 w-3.5 text-slate-500 shrink-0" aria-hidden />
  if (types.some((t) => t.includes('doctor') || t.includes('health'))) return <Stethoscope className="h-3.5 w-3.5 text-slate-500 shrink-0" aria-hidden />
  if (types.some((t) => t.includes('dentist'))) return <Smile className="h-3.5 w-3.5 text-slate-500 shrink-0" aria-hidden />
  if (types.some((t) => t.includes('physiotherapist') || t.includes('physiotherapy'))) return <Activity className="h-3.5 w-3.5 text-slate-500 shrink-0" aria-hidden />
  return <Plus className="h-3.5 w-3.5 text-slate-500 shrink-0" aria-hidden />
}

export function LeadCard({
  lead,
  marketLabel,
  distance,
  similarityScore,
  isAnchor = false,
  onSave,
  isSavedOverride = false,
  showCheckbox,
  selected,
  onToggle,
  assignableUsers,
  currentUserId,
  onAssign,
  onUnassign,
  onAssignmentChange,
  onFindNearby,
  onChangeAnchor,
  onLocateOnMap,
}: LeadCardProps) {
  const [reviewsOpen, setReviewsOpen] = useState(false)
  const [dispatchOpen, setDispatchOpen] = useState(false)
  const [cardMenuOpen, setCardMenuOpen] = useState(false)
  const cardMenuTriggerRef = useRef<HTMLButtonElement>(null)
  const menuPortalRef = useRef<HTMLDivElement>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  useLayoutEffect(() => {
    if (!cardMenuOpen || !cardMenuTriggerRef.current) {
      setMenuPosition(null)
      return
    }
    const rect = cardMenuTriggerRef.current.getBoundingClientRect()
    setMenuPosition({ top: rect.bottom + 4, left: rect.right - 160 })
  }, [cardMenuOpen])
  const [saveLoading, setSaveLoading] = useState(false)
  const [explainLoading, setExplainLoading] = useState(false)
  const assignAnchorRef = useRef<HTMLButtonElement>(null)
  const cardMenuRef = useRef<HTMLDivElement>(null)
  const score = lead.recommendation_score != null ? Math.round(lead.recommendation_score) : null
  const tier = lead.tier ?? null
  const stage = (lead as HotLead & { stage?: string }).stage
  const showWorkflowBadge = stage === 'qualified'
  const leadId = lead.id
  const assignedTo = lead.assigned_to ?? null
  const showAssignedTo =
    leadId != null && (assignableUsers?.length || onAssign) && (onAssign != null || onUnassign != null)
  const isSaved = leadId != null || isSavedOverride
  const showSimilarity = lead.match_band != null || lead.relevance_score != null || similarityScore != null

  async function handleAssign(userId: string) {
    if (onAssign) await onAssign(userId)
    onAssignmentChange?.()
  }
  async function handleUnassign() {
    if (onUnassign) await onUnassign()
    onAssignmentChange?.()
  }

  async function handleSaveLead() {
    if (!onSave) return
    setSaveLoading(true)
    try {
      await onSave(lead)
    } finally {
      setSaveLoading(false)
    }
  }

  async function handleExplainScore() {
    setExplainLoading(true)
    try {
      await explainScore(lead)
    } finally {
      setExplainLoading(false)
    }
  }

  useEffect(() => {
    if (!cardMenuOpen) return
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && setCardMenuOpen(false)
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (cardMenuRef.current?.contains(target) || menuPortalRef.current?.contains(target)) return
      setCardMenuOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('click', onClick, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('click', onClick, true)
    }
  }, [cardMenuOpen])

  const rating = Number(lead.rating) ?? 0
  const reviewCount = lead.review_count ?? 0
  const reach = lead.estimated_monthly_patients != null ? `${(lead.estimated_monthly_patients / 1000).toFixed(0)}k/mo` : null
  const budget = lead.estimated_budget_tier ?? null

  const cardContent = (
    <div className="flex flex-col gap-[var(--space-2)]">
      {/* Header strip: 32px, distance left + similarity right (only when not anchor) */}
      {!isAnchor && (distance != null || showSimilarity) && (
        <div className="flex items-center justify-between px-4 py-2 bg-slate-50/80 border-b border-slate-100 h-9 -mt-5 -mx-5 mb-[var(--space-2)] rounded-t-[var(--radius-card)]">
          <span className="flex items-center gap-1 text-[11px] text-slate-500 font-semibold whitespace-nowrap">
            {distance?.distance_text ? (
              <>
                <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                {distance.distance_text}
              </>
            ) : (
              <span className="invisible" aria-hidden>—</span>
            )}
          </span>
          {showSimilarity && (
            <SimilarityBadge matchBand={lead.match_band} relevanceScore={lead.relevance_score} similarityScore={similarityScore} />
          )}
        </div>
      )}

      {/* Title zone: min-h 56px, 15px bold, line-clamp-2 */}
      <div className="flex items-start justify-between gap-[var(--space-2)] min-h-[56px]">
        {showCheckbox && onToggle && (
          <input
            type="checkbox"
            checked={selected ?? false}
            onChange={(e) => onToggle(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)] shrink-0 mt-0.5"
            aria-label={`Select ${lead.name}`}
          />
        )}
        <h3 className="text-[15px] font-bold leading-snug text-slate-900 flex-1 min-w-0 line-clamp-2 flex items-center gap-1.5">
          {!isAnchor && <CategoryIcon placeTypes={lead.place_types} />}
          <span>{lead.name ?? 'N/A'}</span>
        </h3>
        {!isAnchor && (
          <div className="flex shrink-0 items-center gap-[var(--space-1)] flex-wrap justify-end">
            {score != null && (
              <span className="text-sm font-bold tabular-nums text-[var(--color-primary)] cursor-help rounded-md bg-[var(--color-primary)]/15 px-[var(--space-2)] py-0.5 border border-[var(--color-primary)]/30" title="Hot score (0–100)" aria-label={`Hot score ${score}`}>
                {score}
              </span>
            )}
            {tier && (
              <span className="rounded border border-slate-200 bg-slate-50 px-[var(--space-1)] py-0.5 text-xs font-medium text-slate-700">{tier}</span>
            )}
            {showWorkflowBadge && (
              <span className="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-[var(--space-1)] py-0.5 text-xs font-medium text-emerald-700" title="In nurture sequence">
                <Zap className="h-3 w-3" aria-hidden /> Nurture
              </span>
            )}
          </div>
        )}
      </div>

      {/* Context zone: location (area, city, distance) + phone */}
      {(() => {
        const area = extractAreaFromAddress(lead.address)
        const cityFromMarket = marketLabel?.split(' in ').pop()?.trim() ?? null
        const locationLabel = area ? (cityFromMarket ? `${area}, ${cityFromMarket}` : area) : (marketLabel || null)
        const hasCoords = lead.latitude != null && lead.longitude != null
        const distancePart = !isAnchor && distance && (distance.distance_text || distance.duration_text)
          ? ` · ${[distance.distance_text, distance.duration_text].filter(Boolean).join(' · ')}`
          : ''

        if (!locationLabel && !lead.phone) {
          return (
            <div className="text-xs text-slate-500 min-h-0">
              <div className="animate-pulse bg-slate-200 rounded h-3 w-32" aria-hidden />
            </div>
          )
        }

        return (
          <>
            {locationLabel != null && (
              <div className="flex items-center gap-1 text-xs text-slate-500 min-h-0 flex-wrap">
                {hasCoords && onLocateOnMap ? (
                  <button
                    type="button"
                    onClick={() => onLocateOnMap(lead.latitude!, lead.longitude!)}
                    className="inline-flex items-center gap-1 hover:text-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-1 rounded touch-target"
                    aria-label="Center map on this location"
                  >
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                    <span>{locationLabel}{distancePart}</span>
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                    <span>{locationLabel}{distancePart}</span>
                  </span>
                )}
              </div>
            )}
            {lead.phone && (
              <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                <span>{lead.phone}</span>
              </div>
            )}
            {hasCoords && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lead.latitude},${lead.longitude}`)}${lead.place_id ? `&query_place_id=${encodeURIComponent(lead.place_id)}` : ''}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline mt-0.5"
                aria-label="Open location in Maps"
              >
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>View on map</span>
              </a>
            )}
          </>
        )
      })()}

      {/* Stats row: ALL CAPS labels, N/A for nulls, star, Low sample */}
      <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-2 gap-y-1 text-xs min-h-[52px]">
        <div>
          <dt className="uppercase text-[10px] font-semibold text-slate-400 tracking-wider">Rating</dt>
          <dd className="text-[15px] font-bold text-slate-900">
            {rating.toFixed(1)} <span className="text-amber-500" aria-hidden>★</span>
          </dd>
        </div>
        <div>
          <dt className="uppercase text-[10px] font-semibold text-slate-400 tracking-wider">Reviews</dt>
          <dd className="text-[15px] font-bold text-slate-900">{reviewCount}</dd>
          {reviewCount < 10 && reviewCount > 0 && (
            <span className="text-[10px] italic text-slate-400 block">Low sample</span>
          )}
        </div>
        <div>
          <dt className="uppercase text-[10px] font-semibold text-slate-400 tracking-wider">Reach</dt>
          <dd className="text-[15px] font-bold text-slate-900">
            {reach ?? <span className="text-xs italic text-slate-400 font-normal">N/A</span>}
          </dd>
        </div>
        <div>
          <dt className="uppercase text-[10px] font-semibold text-slate-400 tracking-wider">Budget</dt>
          <dd className="text-[15px] font-bold text-slate-900">
            {budget ?? <span className="text-xs italic text-slate-400 font-normal">N/A</span>}
          </dd>
        </div>
      </dl>

      {isAnchor && onChangeAnchor && (
        <button type="button" onClick={onChangeAnchor} className="text-xs text-[var(--color-primary)] hover:underline font-medium">
          Change anchor
        </button>
      )}

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

      {/* Action row: Save Lead primary (or Saved), View details / View full profile, overflow */}
      <div className="mt-auto pt-[var(--space-2)] flex items-center justify-between gap-2 border-t border-slate-100 min-h-[48px] md:min-h-[44px]">
        {isAnchor ? (
          leadId != null ? (
            <Link
              to={`/leads/${leadId}`}
              className="touch-target min-h-[48px] md:min-h-0 flex items-center justify-center rounded-md border border-[var(--color-primary)] bg-white px-3 py-2 text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 w-full md:w-auto"
            >
              View full profile
            </Link>
          ) : (
            <span className="text-xs text-slate-500">Anchor lead</span>
          )
        ) : onSave ? (
          isSaved ? (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-800 min-h-[48px] md:min-h-0">
              <Check className="h-4 w-4" aria-hidden /> Saved
            </span>
          ) : (
            <button
              type="button"
              onClick={handleSaveLead}
              disabled={saveLoading}
              className="touch-target min-h-[48px] md:min-h-0 w-full md:w-auto flex items-center justify-center rounded-md bg-[var(--color-primary)] text-white px-3 py-2 text-xs font-semibold hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
            >
              {saveLoading ? '…' : 'Save Lead'}
            </button>
          )
        ) : (
          <button
            type="button"
            onClick={() => setReviewsOpen(true)}
            className="touch-target min-h-[48px] md:min-h-0 rounded-md border border-[var(--color-primary)] bg-white px-3 py-2 text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 w-full md:w-auto"
          >
            View reviews
          </button>
        )}
        <div className="relative shrink-0" ref={cardMenuRef}>
          <button
            ref={cardMenuTriggerRef}
            type="button"
            onClick={() => setCardMenuOpen((o) => !o)}
            className="touch-target flex h-11 w-11 min-h-[48px] min-w-[48px] items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-700 md:h-8 md:w-8 md:min-h-0 md:min-w-0"
            aria-label="More actions (reviews, Call, AI & Insights)"
            aria-expanded={cardMenuOpen}
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden />
          </button>
          {cardMenuOpen && menuPosition != null && typeof document !== 'undefined' &&
            createPortal(
              <div
                ref={menuPortalRef}
                className="fixed z-[var(--z-popover)] min-w-[160px] rounded-md border border-slate-200 bg-white py-1 shadow-[var(--shadow-dropdown)]"
                style={{ top: menuPosition.top, left: Math.max(8, Math.min(menuPosition.left, typeof window !== 'undefined' ? window.innerWidth - 168 : menuPosition.left)) }}
                role="menu"
              >
                {!isAnchor && (
                  <button
                    type="button"
                    onClick={() => { setReviewsOpen(true); setCardMenuOpen(false); }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50 min-h-[44px] md:min-h-0"
                    role="menuitem"
                  >
                    <FileText className="h-3.5 w-3.5" /> View reviews
                  </button>
                )}
                {lead.phone && (
                  <a href={`tel:${lead.phone.replace(/\D/g, '')}`} className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 min-h-[44px] md:min-h-0" role="menuitem" onClick={() => setCardMenuOpen(false)}>
                    <Phone className="h-3.5 w-3.5" /> Call
                  </a>
                )}
                {lead.contact_email && (
                  <a href={`mailto:${lead.contact_email}`} className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 min-h-[44px] md:min-h-0" role="menuitem" onClick={() => setCardMenuOpen(false)}>
                    <Mail className="h-3.5 w-3.5" /> Email
                  </a>
                )}
                {leadId != null && (
                  <Link to={`/leads/${leadId}`} className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 min-h-[44px] md:min-h-0" role="menuitem" onClick={() => setCardMenuOpen(false)}>
                    <FileText className="h-3.5 w-3.5" /> View detail
                  </Link>
                )}
                {onFindNearby && lead.latitude != null && lead.longitude != null && (
                  <button type="button" onClick={() => { onFindNearby(lead); setCardMenuOpen(false); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50 min-h-[44px] md:min-h-0" role="menuitem">
                    <Compass className="h-3.5 w-3.5" /> Find Nearby
                  </button>
                )}
                {score != null && (
                  <button type="button" onClick={() => { handleExplainScore(); setCardMenuOpen(false); }} disabled={explainLoading} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50 min-h-[44px] md:min-h-0" role="menuitem">
                    {explainLoading ? '…' : 'Explain with AI'}
                  </button>
                )}
              </div>,
              document.body
            )}
        </div>
      </div>
    </div>
  )

  if (isAnchor) {
    return (
      <>
        <article
          className="rounded-[var(--radius-card)] border-2 border-[var(--color-primary)] bg-white shadow-[var(--shadow-card)] transition-all duration-200 hover:shadow-[var(--shadow-elevated)] overflow-hidden"
          aria-label={`Anchor: ${lead.name}`}
        >
          <div className="bg-[var(--color-primary)] px-3 py-2 flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white">Anchor</span>
            <span className="text-[15px] font-bold text-white truncate flex-1">{lead.name ?? '—'}</span>
          </div>
          <div className="p-[var(--space-3)]">{cardContent}</div>
        </article>
        <ReviewsModal lead={reviewsOpen ? lead : null} open={reviewsOpen} onClose={() => setReviewsOpen(false)} />
      </>
    )
  }

  return (
    <>
      <article
        className="rounded-[var(--radius-card)] border border-slate-200/80 bg-white shadow-[var(--shadow-card)] transition-all duration-200 hover:shadow-[var(--shadow-elevated)] p-5 overflow-hidden"
        aria-label={`Lead: ${lead.name}`}
      >
        {cardContent}
      </article>
      <ReviewsModal lead={reviewsOpen ? lead : null} open={reviewsOpen} onClose={() => setReviewsOpen(false)} />
    </>
  )
}
