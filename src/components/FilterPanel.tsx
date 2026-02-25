import { useEffect, useState, useRef } from 'react'
import { X, ChevronRight } from 'lucide-react'

const SWIPE_DISMISS_THRESHOLD_PX = 80
import { SearchBarWithChips, type SearchChips, type SearchFilters } from './SearchBarWithChips'
import { BasePointSelector } from './BasePointSelector'
import { useGeo } from '../contexts/GeoContext'

const MIN_RADIUS = 1
const MAX_RADIUS = 50

export interface FilterPanelProps {
  open: boolean
  onClose: () => void
  onSubmit: (chips: SearchChips, filters: SearchFilters) => void
  loading: boolean
  initialChips?: Partial<SearchChips>
  initialFilters?: Partial<SearchFilters>
}

export function FilterPanel({
  open,
  onClose,
  onSubmit,
  loading,
  initialChips,
  initialFilters,
}: FilterPanelProps) {
  const geo = useGeo()
  const basePoint = geo?.basePoint ?? null
  const locationMode = geo?.locationMode ?? null
  const setLocationMode = geo?.setLocationMode
  const [radiusKm, setRadiusKm] = useState(() => initialChips?.radius_km ?? 5)
  const [dragY, setDragY] = useState(0)
  const touchStartY = useRef(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
  }
  const handleTouchMove = (e: React.TouchEvent) => {
    const delta = e.touches[0].clientY - touchStartY.current
    if (delta > 0) setDragY(delta)
  }
  const handleTouchEnd = () => {
    if (dragY >= SWIPE_DISMISS_THRESHOLD_PX) {
      onClose()
      setDragY(0)
    } else {
      setDragY(0)
    }
  }

  useEffect(() => {
    if (open) {
      setDragY(0)
      if (initialChips?.radius_km != null) setRadiusKm(initialChips.radius_km)
    }
  }, [open, initialChips?.radius_km])

  useEffect(() => {
    if (open) {
      const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
      window.addEventListener('keydown', handler)
      return () => window.removeEventListener('keydown', handler)
    }
  }, [open, onClose])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [open])

  const handleSubmitFromForm = (chips: SearchChips, filters: SearchFilters) => {
    const useGpsCenter = basePoint && locationMode === 'gps'
    const merged: SearchChips = {
      ...chips,
      center_place: useGpsCenter ? basePoint.label?.trim() || undefined : undefined,
      center_lat: useGpsCenter ? basePoint.lat : undefined,
      center_lng: useGpsCenter ? basePoint.lng : undefined,
      radius_km: useGpsCenter ? radiusKm : undefined,
    }
    onSubmit(merged, filters)
    onClose()
  }

  const defaultFilters: SearchFilters = {
    sort_by: 'recommendation_score',
    order: 'desc',
    min_rating: '',
    min_review_count: '',
    has_phone: false,
    budget_max: '',
  }
  const handleClearAll = () => {
    setRadiusKm(5)
    onSubmit(
      { city: initialChips?.city ?? '', region: initialChips?.region ?? 'India', specialty: undefined, center_place: undefined, radius_km: undefined, place_query: undefined },
      { ...defaultFilters, ...initialFilters }
    )
    onClose()
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop: lighter so lead cards remain visible (plan: rgba(15,23,42,0.35)) */}
      <div
        className="fixed inset-0 z-[var(--z-backdrop)] bg-slate-900/35"
        aria-hidden
        onClick={onClose}
      />
      {/* Desktop: anchored dropdown modal (max 480px, centered below header). Mobile: bottom sheet 60vh */}
      <div
        className="fixed z-[var(--z-drawer)] flex flex-col bg-white rounded-t-3xl md:rounded-2xl border border-slate-200 shadow-[var(--shadow-elevated)] max-h-[85vh] md:max-h-[80vh] md:top-[5.5rem] md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-[480px] left-0 right-0 bottom-0 min-h-[60vh] md:min-h-0 transition-transform duration-200 ease-out"
        style={{
          paddingBottom: 'max(calc(env(safe-area-inset-bottom) + 16), var(--space-4))',
          transform: `translateY(${dragY}px)`,
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="filter-panel-title"
      >
        {/* Drag handle (mobile): swipe down to dismiss */}
        <div
          className="md:hidden flex justify-center pt-4 pb-2 touch-none select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          aria-hidden
        >
          <div className="w-12 h-1.5 rounded-full bg-slate-300" aria-hidden />
        </div>
        {/* Panel header */}
        <div className="flex items-center justify-between px-[var(--edge-padding)] md:px-5 py-4 border-b border-slate-200 shrink-0">
          <h2 id="filter-panel-title" className="text-lg font-semibold text-[var(--color-navy)]">
            Search Leads
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="touch-target flex items-center justify-center rounded-full text-slate-500 hover:text-slate-800 focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 min-h-[48px] min-w-[48px] md:min-h-[44px] md:min-w-[44px]"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Scrollable body: 16px edge padding on mobile */}
        <div className="flex-1 overflow-y-auto px-[var(--edge-padding)] md:px-5 py-5 min-h-0">
          {/* GPS mode banner: when active, show "Using current location" and option to switch to manual */}
          {locationMode === 'gps' && basePoint && (
            <div className="mb-4 p-3 rounded-[var(--radius-card)] bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex flex-col gap-2">
              <p className="text-sm font-medium text-[var(--color-navy)]">Using current location</p>
              <p className="text-xs text-slate-600">{basePoint.label || 'Current location'} · {radiusKm} km</p>
              <button
                type="button"
                onClick={() => setLocationMode?.('manual')}
                className="text-sm font-medium text-[var(--color-primary)] hover:underline focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 rounded py-1 text-left"
              >
                Use city or address instead
              </button>
            </div>
          )}
          {/* Section 1: Location (always first) */}
          <section className="mb-5">
            <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-2">Location</p>
            <div className="mb-4">
              <BasePointSelector />
            </div>
            {/* Radius slider: touch-friendly on mobile (taller track, numeric tooltip) */}
            <div className="space-y-2">
              <label htmlFor="filter-panel-radius" className="text-[13px] font-medium text-slate-700">
                Radius
              </label>
              <div className="flex items-center gap-3 min-h-[48px] md:min-h-0">
                <input
                  id="filter-panel-radius"
                  type="range"
                  min={MIN_RADIUS}
                  max={MAX_RADIUS}
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(Number(e.target.value))}
                  disabled={!basePoint}
                  className="flex-1 h-3 md:h-2 accent-[var(--color-primary)] disabled:opacity-50 disabled:cursor-not-allowed min-h-[28px] md:min-h-0 touch-manipulation"
                  style={{ touchAction: 'manipulation' }}
                  aria-label="Radius in km"
                  title={`${radiusKm} km`}
                />
                <span className="text-sm font-bold text-[var(--color-primary)] whitespace-nowrap min-w-[48px] tabular-nums touch-target flex items-center justify-center">
                  {radiusKm} km
                </span>
              </div>
              <p className="text-xs text-slate-500">1 km — 10 — 25 — 50 km</p>
            </div>
          </section>

          {/* Section 2–4: Search type + specialty + filters (from SearchBarWithChips) */}
          <section>
            <SearchBarWithChips
              formId="filter-panel-form"
              key={`panel-${initialChips?.city ?? ''}-${initialChips?.specialty ?? ''}-${initialChips?.region ?? ''}`}
              onSubmit={handleSubmitFromForm}
              loading={loading}
              initialChips={{ ...initialChips, center_place: basePoint?.label ?? initialChips?.center_place, radius_km: radiusKm }}
              initialFilters={initialFilters}
              hideRadiusAndCenter
              disableLocationFilters={locationMode === 'gps'}
            />
          </section>
        </div>

        {/* Sticky footer: always visible, 16px edge on mobile */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-[var(--edge-padding)] md:px-5 py-4 border-t border-slate-200 bg-white">
          <button
            type="button"
            onClick={handleClearAll}
            className="text-sm font-medium text-slate-600 hover:text-slate-800 focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 rounded-[var(--radius-button)] py-2 px-3 min-h-[48px] md:min-h-[44px] touch-target"
          >
            Clear all filters
          </button>
          <button
            type="submit"
            form="filter-panel-form"
            disabled={loading}
            className="touch-target flex items-center justify-center gap-2 rounded-[var(--radius-button)] bg-[var(--color-primary)] text-white px-5 py-3 text-sm font-bold shadow-[var(--shadow-button)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition-colors min-h-[48px] md:min-h-[44px] focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
          >
            {loading ? 'Searching…' : 'Search Leads'}
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>
    </>
  )
}
