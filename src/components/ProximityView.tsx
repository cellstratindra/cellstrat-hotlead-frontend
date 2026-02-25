import { X, Minus, Plus } from 'lucide-react'
import type { HotLead } from '../types/leads'
import type { NearbyResult } from '../api/client'
import { LeadCard } from './LeadCard'

interface ProximityViewProps {
  anchor: HotLead
  nearby: NearbyResult[]
  radiusKm: number
  onClear: () => void
  onRadiusChange: (newKm: number) => void
  loading?: boolean
}

const MIN_RADIUS = 1
const MAX_RADIUS = 50
const RADIUS_STEP = 1

export function ProximityView({
  anchor,
  nearby,
  radiusKm,
  onClear,
  onRadiusChange,
  loading = false,
}: ProximityViewProps) {
  const canDecrease = radiusKm > MIN_RADIUS
  const canIncrease = radiusKm < MAX_RADIUS

  /** Search Context Banner: 3 zones — anchor context, radius control, results count + actions */
  const searchContextBanner = (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50/80">
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Searching near</p>
        <p className="text-[15px] font-bold text-slate-900 truncate">{anchor.name ?? 'Clinic'}</p>
        {anchor.address && (
          <p className="text-xs text-slate-500 truncate">{anchor.address}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-slate-500">Radius</span>
        <span className="text-sm font-bold text-[var(--color-primary)] whitespace-nowrap min-w-[40px]" aria-label={`Within ${radiusKm} km`}>
          {radiusKm} km
        </span>
        <button
          type="button"
          onClick={() => onRadiusChange(Math.max(MIN_RADIUS, radiusKm - RADIUS_STEP))}
          disabled={!canDecrease || loading}
          className="touch-target flex h-9 w-9 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 md:h-8 md:w-8 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          aria-label="Decrease radius"
          title="Decrease radius"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onRadiusChange(Math.min(MAX_RADIUS, radiusKm + RADIUS_STEP))}
          disabled={!canIncrease || loading}
          className="touch-target flex h-9 w-9 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 md:h-8 md:w-8 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          aria-label="Increase radius"
          title="Increase radius"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <span className="text-sm font-bold text-[var(--color-primary)]">
          {loading ? '…' : nearby.length} leads found
        </span>
        <button
          type="button"
          onClick={onClear}
          className="rounded border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Change anchor
        </button>
        <button
          type="button"
          onClick={onClear}
          className="flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-100"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
          Clear search
        </button>
      </div>
    </div>
  )

  /** Inline grid: anchor card first, then nearby results (Option B) */
  const content = loading ? (
    <div className="flex justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" aria-hidden />
    </div>
  ) : (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3 p-4">
      <LeadCard
        lead={anchor}
        marketLabel={null}
        isAnchor
        onChangeAnchor={onClear}
      />
      {nearby.map((item, i) => (
        <LeadCard
          key={item.lead.place_id || i}
          lead={item.lead}
          marketLabel={null}
          distance={item.distance_text ? { distance_text: item.distance_text, duration_text: '', duration_seconds: 0 } : null}
          similarityScore={item.similarity_score}
        />
      ))}
    </div>
  )

  return (
    <div className="rounded-[var(--radius-card)] border border-slate-200 bg-white shadow-[var(--shadow-card)] overflow-hidden">
      {searchContextBanner}
      {content}
    </div>
  )
}
