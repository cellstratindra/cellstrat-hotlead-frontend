import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { X, MapPin, Phone, Star, Loader2, ExternalLink } from 'lucide-react'
import type { HotLead } from '../types/leads'
import type { NearbyResult } from '../api/client'
import { fetchReviewSummary, fetchHighlights, fetchNearby } from '../api/client'
import { useMediaQuery } from '../hooks/useMediaQuery'

interface MapLeadPanelProps {
  lead: HotLead
  onClose: () => void
  onSave?: (lead: HotLead) => void | Promise<void>
  /** Specialty filter for nearby search */
  specialty?: string | null
  /** Whether this lead is already saved (show "Saved" instead of "Save Lead") */
  isSaved?: boolean
  /** Desktop: slide-in from right. Mobile: bottom sheet. Set to undefined to auto-detect from viewport. */
  variant?: 'drawer' | 'sheet'
  /** Closes panel and re-expands the map centered on this lead */
  onShowOnMap?: () => void
}

export function MapLeadPanel({
  lead,
  onClose,
  onSave,
  specialty = null,
  isSaved = false,
  variant: variantProp,
  onShowOnMap,
}: MapLeadPanelProps) {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const variant = variantProp ?? (isMobile ? 'sheet' : 'drawer')
  const [summary, setSummary] = useState<string | null>(null)
  const [highlights, setHighlights] = useState<HotLead | null>(null)
  const [nearby, setNearby] = useState<NearbyResult[] | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [loadingHighlights, setLoadingHighlights] = useState(false)
  const [loadingNearby, setLoadingNearby] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)

  useEffect(() => {
    if (!lead) return
    setSummary(null)
    setHighlights(null)
    setNearby(null)
    let cancelled = false
    ;(async () => {
      setLoadingSummary(true)
      try {
        const res = await fetchReviewSummary(lead)
        if (!cancelled) setSummary(res.reviews_summary || null)
      } catch {
        if (!cancelled) setSummary(null)
      } finally {
        if (!cancelled) setLoadingSummary(false)
      }
    })()
    ;(async () => {
      setLoadingHighlights(true)
      try {
        const [withH] = await fetchHighlights([lead])
        if (!cancelled && withH) setHighlights(withH)
      } catch {
        if (!cancelled) setHighlights(null)
      } finally {
        if (!cancelled) setLoadingHighlights(false)
      }
    })()
    if (lead.latitude != null && lead.longitude != null) {
      setLoadingNearby(true)
      fetchNearby(lead.place_id, lead.latitude, lead.longitude, 5, specialty ?? undefined)
        .then((res) => {
          if (!cancelled) setNearby(res.nearby || [])
        })
        .catch(() => {
          if (!cancelled) setNearby([])
        })
        .finally(() => {
          if (!cancelled) setLoadingNearby(false)
        })
    }
    return () => { cancelled = true }
  }, [lead?.place_id, lead?.latitude, lead?.longitude, specialty])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  async function handleSave() {
    if (!onSave) return
    setSaveLoading(true)
    try {
      await onSave(lead)
    } finally {
      setSaveLoading(false)
    }
  }

  const rating = lead.rating ?? 0
  const reviewCount = lead.review_count ?? 0
  const mapsUrl =
    lead.latitude != null && lead.longitude != null
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lead.latitude},${lead.longitude}`)}${lead.place_id ? `&query_place_id=${encodeURIComponent(lead.place_id)}` : ''}`
      : null

  const content = (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 shrink-0">
        <h2 className="text-lg font-semibold text-slate-900 truncate flex-1">{lead.name}</h2>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 flex items-center justify-center rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 min-h-[44px] min-w-[44px] touch-target"
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 space-y-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1 font-bold text-slate-900">
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" aria-hidden />
            {rating.toFixed(1)}
          </span>
          <span className="text-slate-500">{reviewCount} reviews</span>
        </div>
        {lead.address && (
          <div className="flex items-start gap-2 text-sm text-slate-600">
            <MapPin className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" aria-hidden />
            <span>{lead.address}</span>
          </div>
        )}
        {lead.phone && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Phone className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            <a href={`tel:${lead.phone.replace(/\D/g, '')}`} className="hover:text-[var(--color-primary)]">
              {lead.phone}
            </a>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-[var(--color-primary)] hover:underline"
            >
              <ExternalLink className="h-4 w-4" aria-hidden />
              View on Google Maps
            </a>
          )}
          {onShowOnMap && lead.latitude != null && lead.longitude != null && (
            <button
              type="button"
              onClick={onShowOnMap}
              className="lg:hidden inline-flex items-center gap-1.5 rounded-full border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 px-3 py-1 text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-colors"
            >
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              Show on map
            </button>
          )}
        </div>

        <section>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">AI Summary</h3>
          {loadingSummary ? (
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Loading…
            </div>
          ) : summary ? (
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{summary}</p>
          ) : (
            <p className="text-sm text-slate-400">No summary available.</p>
          )}
        </section>

        {(highlights?.top_complaints?.length || highlights?.top_strengths?.length) ? (
          <section>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Insights</h3>
            <div className="space-y-2 text-sm">
              {highlights?.top_complaints && highlights.top_complaints.length > 0 && (
                <div>
                  <p className="font-medium text-slate-600">Top complaints</p>
                  <ul className="list-disc list-inside text-slate-600">
                    {highlights.top_complaints.slice(0, 5).map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
              {highlights?.top_strengths && highlights.top_strengths.length > 0 && (
                <div>
                  <p className="font-medium text-slate-600">Top strengths</p>
                  <ul className="list-disc list-inside text-slate-600">
                    {highlights.top_strengths.slice(0, 5).map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        ) : !loadingHighlights && (
          <section>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Insights</h3>
            <p className="text-sm text-slate-400">No insights available.</p>
          </section>
        )}

        {lead.latitude != null && lead.longitude != null && (
          <section>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Nearby leads</h3>
            {loadingNearby ? (
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Loading…
              </div>
            ) : nearby && nearby.length > 0 ? (
              <ul className="space-y-2">
                {nearby.slice(0, 5).map((n) => (
                  <li key={n.lead.place_id} className="rounded-lg border border-slate-200 p-2 text-sm">
                    <p className="font-medium text-slate-900 truncate">{n.lead.name}</p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      {Math.round(n.similarity_score)}% match
                      {n.distance_text ? ` · ${n.distance_text}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">No nearby leads in range.</p>
            )}
          </section>
        )}

        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
          {onSave && (
            isSaved ? (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-800">
                Saved
              </span>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                disabled={saveLoading}
                className="rounded-md bg-[var(--color-primary)] text-white px-3 py-2 text-sm font-semibold hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
              >
                {saveLoading ? 'Saving…' : 'Save Lead'}
              </button>
            )
          )}
          {(lead as HotLead & { id?: number }).id != null && (
            <Link
              to={`/leads/${(lead as HotLead & { id: number }).id}`}
              className="rounded-md border border-[var(--color-primary)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5"
              onClick={onClose}
            >
              View full details
            </Link>
          )}
        </div>
      </div>
    </>
  )

  if (variant === 'sheet') {
    return (
      <>
        <div className="fixed inset-0 z-[100] bg-black/30 md:hidden" aria-hidden onClick={onClose} />
        <div className="fixed left-0 right-0 bottom-0 z-[var(--z-drawer)] md:hidden flex flex-col max-h-[85vh] bg-white rounded-t-3xl border border-slate-200 shadow-[var(--shadow-elevated)]">
          <div className="flex justify-center pt-3 pb-2 shrink-0">
            <div className="w-12 h-1.5 rounded-full bg-slate-300" aria-hidden />
          </div>
          {content}
        </div>
      </>
    )
  }

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/20 hidden md:block" aria-hidden onClick={onClose} />
      <div
        className="fixed top-0 right-0 bottom-0 z-[var(--z-drawer)] w-full max-w-md flex flex-col bg-white border-l border-slate-200 shadow-[var(--shadow-elevated)] hidden md:flex"
        role="dialog"
        aria-modal="true"
        aria-label={`Lead details: ${lead.name}`}
      >
        {content}
      </div>
    </>
  )
}
