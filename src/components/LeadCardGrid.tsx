import { useMemo, useState } from 'react'
import type { HotLead } from '../types/leads'
import { LeadCard } from './LeadCard'

type SortKey = 'recommendation_score' | 'rating' | 'review_count' | 'name' | 'tier'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'recommendation_score', label: 'Recommended' },
  { value: 'rating', label: 'Rating' },
  { value: 'review_count', label: 'Reviews' },
  { value: 'name', label: 'Name' },
  { value: 'tier', label: 'Tier' },
]

/** Lead identity for selection: id for saved leads, place_id for search results */
export function getLeadSelectId(lead: HotLead): string {
  const id = (lead as HotLead & { id?: number }).id
  return id != null ? String(id) : lead.place_id
}

interface LeadCardGridProps {
  leads: HotLead[]
  showSort?: boolean
  /** e.g. "Cardiology in Bangalore" for benchmark label on cards */
  marketLabel?: string | null
  /** When set, show checkboxes and allow multi-select */
  selectedIds?: Set<string>
  onSelectLead?: (id: string, checked: boolean) => void
}

export function LeadCardGrid({ leads, showSort = true, marketLabel, selectedIds, onSelectLead }: LeadCardGridProps) {
  const showCheckbox = selectedIds != null && onSelectLead != null
  const [sortBy, setSortBy] = useState<SortKey>('recommendation_score')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')

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
  }, [leads, sortBy, order])

  return (
    <div className="space-y-[var(--space-3)]">
      {showSort && (
        <div className="flex flex-wrap items-center gap-[var(--space-2)]">
          <label className="text-sm text-slate-600">Sort by</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="rounded-[var(--radius-button)] border border-slate-200 bg-white px-[var(--space-3)] py-[var(--space-2)] text-sm shadow-[var(--shadow-soft)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            value={order}
            onChange={(e) => setOrder(e.target.value as 'asc' | 'desc')}
            className="rounded-[var(--radius-button)] border border-slate-200 bg-white px-[var(--space-3)] py-[var(--space-2)] text-sm shadow-[var(--shadow-soft)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
        </div>
      )}
      <div className="grid grid-cols-1 gap-[var(--space-3)] sm:grid-cols-2 xl:grid-cols-3">
        {sortedLeads.map((lead, i) => (
          <LeadCard
            key={lead.place_id || `lead-${i}`}
            lead={lead}
            marketLabel={marketLabel}
            showCheckbox={showCheckbox}
            selected={showCheckbox ? selectedIds!.has(getLeadSelectId(lead)) : undefined}
            onToggle={showCheckbox ? (checked) => onSelectLead!(getLeadSelectId(lead), checked) : undefined}
          />
        ))}
      </div>
    </div>
  )
}
