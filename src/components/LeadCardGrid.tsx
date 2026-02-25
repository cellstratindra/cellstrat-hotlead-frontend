import { useMemo } from 'react'
import type { HotLead } from '../types/leads'
import { LeadCard } from './LeadCard'
import { useGeoOptional } from '../contexts/GeoContext'

export type SortKey = 'recommendation_score' | 'rating' | 'review_count' | 'name' | 'tier' | 'distance'

/** Lead identity for selection: id for saved leads, place_id for search results */
export function getLeadSelectId(lead: HotLead): string {
  const id = (lead as HotLead & { id?: number }).id
  return id != null ? String(id) : lead.place_id
}

interface LeadCardGridProps {
  leads: HotLead[]
  showSort?: boolean
  /** Controlled sort (when provided, sort UI is in toolbar; grid just renders sorted list) */
  sortBy?: SortKey
  order?: 'asc' | 'desc'
  onSortChange?: (sortBy: SortKey, order: 'asc' | 'desc') => void
  /** e.g. "Cardiology in Bangalore" for benchmark label on cards */
  marketLabel?: string | null
  /** When set, show checkboxes and allow multi-select */
  selectedIds?: Set<string>
  onSelectLead?: (id: string, checked: boolean) => void
  /** When set, show "Find Nearby" in card menu and call this when clicked */
  onFindNearby?: (lead: HotLead) => void
  /** When set, show "Save Lead" primary CTA and call this when clicked */
  onSave?: (lead: HotLead) => void | Promise<void>
  /** Place IDs of leads just saved (show "Saved" until refetch) */
  savedPlaceIds?: Set<string>
  /** When set, card location MapPin centers the map on that lead */
  onLocateOnMap?: (lat: number, lng: number) => void
}

export function LeadCardGrid({
  leads,
  showSort: _showSort = true,
  sortBy: controlledSortBy,
  order: controlledOrder,
  onSortChange: _onSortChange,
  marketLabel,
  selectedIds,
  onSelectLead,
  onFindNearby,
  onSave,
  savedPlaceIds,
  onLocateOnMap,
}: LeadCardGridProps) {
  const geo = useGeoOptional()
  const showCheckbox = selectedIds != null && onSelectLead != null
  const sortBy = controlledSortBy ?? 'recommendation_score'
  const order = controlledOrder ?? 'desc'
  const distanceMap = geo?.distanceMap ?? {}

  const sortedLeads = useMemo(() => {
    const arr = [...leads]
    const getVal = (l: HotLead): string | number => {
      switch (sortBy) {
        case 'name':
          return l.name ?? ''
        case 'rating':
          return l.rating ?? 0
        case 'review_count':
          return l.review_count ?? 0
        case 'recommendation_score':
          return l.recommendation_score ?? 0
        case 'tier':
          return l.tier ?? ''
        case 'distance': {
          const d = distanceMap[l.place_id]
          return d?.duration_seconds ?? 0
        }
        default:
          return 0
      }
    }
    arr.sort((a, b) => {
      const aVal = getVal(a)
      const bVal = getVal(b)
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return order === 'asc' ? aVal - bVal : bVal - aVal
      }
      const aStr = String(aVal)
      const bStr = String(bVal)
      return order === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr)
    })
    return arr
  }, [leads, sortBy, order, distanceMap])

  return (
    <div className="space-y-[var(--space-4)]">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {sortedLeads.map((lead, i) => (
          <LeadCard
            key={lead.place_id || `lead-${i}`}
            lead={lead}
            marketLabel={marketLabel}
            distance={distanceMap[lead.place_id] ?? null}
            showCheckbox={showCheckbox}
            selected={showCheckbox ? selectedIds!.has(getLeadSelectId(lead)) : undefined}
            onToggle={showCheckbox ? (checked) => onSelectLead!(getLeadSelectId(lead), checked) : undefined}
            onFindNearby={onFindNearby}
            onSave={onSave}
            isSavedOverride={savedPlaceIds?.has(lead.place_id)}
            onLocateOnMap={onLocateOnMap}
          />
        ))}
      </div>
    </div>
  )
}
