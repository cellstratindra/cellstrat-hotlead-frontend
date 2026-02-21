import React, { useState, useMemo } from 'react'
import type { HotLead } from '../types/leads'
import { ReviewsModal } from './ReviewsModal'

type SortKey = 'name' | 'rating' | 'review_count' | 'phone' | 'recommendation_score' | 'tier' | 'estimated_budget_tier' | 'reach_band'

const REVIEW_SUMMARY_LEN = 60

function allFlaggedKeywords(lead: HotLead): string[] {
  const set = new Set<string>()
  const reviews = lead.reviews ?? []
  for (const r of reviews) {
    const kws = r.flagged_keywords ?? []
    for (const kw of kws) set.add(kw)
  }
  return [...set]
}

function reviewSummary(lead: HotLead): string {
  const reviews = lead.reviews ?? []
  if (reviews.length === 0) return '—'
  const first = (reviews[0]?.text ?? '').trim()
  if (!first) return `${reviews.length} review${reviews.length !== 1 ? 's' : ''}`
  if (first.length <= REVIEW_SUMMARY_LEN) return first
  return first.slice(0, REVIEW_SUMMARY_LEN) + '…'
}

const REVIEW_EXPAND_LEN = 120

function ReviewExpandable({
  text,
  flagged,
  rating,
}: {
  text: string
  flagged: string[]
  rating?: number | null
}) {
  const [open, setOpen] = useState(false)
  const t = (text ?? '').trim()
  const short = t.length <= REVIEW_EXPAND_LEN
  const display = short ? t : (open ? t : t.slice(0, REVIEW_EXPAND_LEN) + '…')
  return (
    <li className="border-b border-gray-100 last:border-0 pb-2 last:pb-0">
      {rating != null && (
        <span className="text-amber-600 text-sm font-medium">★ {Number(rating).toFixed(1)} </span>
      )}
      <p className="text-gray-700 whitespace-pre-wrap">{display}</p>
      {!short && (
        <button type="button" onClick={() => setOpen((o) => !o)} className="text-blue-600 text-xs mt-1 hover:underline">
          {open ? 'Show less' : 'Show more'}
        </button>
      )}
      {flagged.length > 0 && (
        <p className="text-xs text-amber-700 mt-1">Flagged: {flagged.join(', ')}</p>
      )}
    </li>
  )
}

interface HotLeadsTableProps {
  leads: HotLead[]
}

export function HotLeadsTable({ leads }: HotLeadsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('recommendation_score')
  const [asc, setAsc] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [reviewsModalLead, setReviewsModalLead] = useState<HotLead | null>(null)

  const sortedLeads = useMemo(() => {
    const arr = [...leads]
    const getVal = (l: HotLead): string | number => {
      switch (sortKey) {
        case 'name': return l.name ?? ''
        case 'rating': return l.rating ?? 0
        case 'review_count': return l.review_count ?? 0
        case 'phone': return l.phone ?? ''
        case 'recommendation_score': return l.recommendation_score ?? 0
        case 'tier': return l.tier ?? ''
        case 'estimated_budget_tier': return l.estimated_budget_tier ?? ''
        case 'reach_band': return l.reach_band ?? ''
        default: return ''
      }
    }
    arr.sort((a, b) => {
      const aVal = getVal(a)
      const bVal = getVal(b)
      if (typeof aVal === 'number' && typeof bVal === 'number')
        return asc ? aVal - bVal : bVal - aVal
      const aStr = String(aVal)
      const bStr = String(bVal)
      return asc ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr)
    })
    return arr
  }, [leads, sortKey, asc])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setAsc((x) => !x)
    else {
      setSortKey(key)
      setAsc(key === 'name' ? true : false)
    }
  }

  return (
    <div className="overflow-x-auto rounded border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 text-left">
              <button type="button" onClick={() => toggleSort('name')} className="font-medium text-gray-700 hover:underline">
                Name {sortKey === 'name' && (asc ? '↑' : '↓')}
              </button>
            </th>
            <th className="px-4 py-2 text-left">
              <button type="button" onClick={() => toggleSort('rating')} className="font-medium text-gray-700 hover:underline">
                Rating {sortKey === 'rating' && (asc ? '↑' : '↓')}
              </button>
            </th>
            <th className="px-4 py-2 text-left">
              <button type="button" onClick={() => toggleSort('review_count')} className="font-medium text-gray-700 hover:underline">
                Reviews {sortKey === 'review_count' && (asc ? '↑' : '↓')}
              </button>
            </th>
            <th className="px-4 py-2 text-left">
              <button type="button" onClick={() => toggleSort('reach_band')} className="font-medium text-gray-700 hover:underline">
                Reach {sortKey === 'reach_band' && (asc ? '↑' : '↓')}
              </button>
            </th>
            <th className="px-4 py-2 text-left">
              <button type="button" onClick={() => toggleSort('recommendation_score')} className="font-medium text-gray-700 hover:underline">
                Score {sortKey === 'recommendation_score' && (asc ? '↑' : '↓')}
              </button>
            </th>
            <th className="px-4 py-2 text-left">
              <button type="button" onClick={() => toggleSort('tier')} className="font-medium text-gray-700 hover:underline">
                Tier {sortKey === 'tier' && (asc ? '↑' : '↓')}
              </button>
            </th>
            <th className="px-4 py-2 text-left">
              <button type="button" onClick={() => toggleSort('estimated_budget_tier')} className="font-medium text-gray-700 hover:underline">
                Budget {sortKey === 'estimated_budget_tier' && (asc ? '↑' : '↓')}
              </button>
            </th>
            <th className="px-4 py-2 text-left text-gray-700">Phone</th>
            <th className="px-4 py-2 text-left font-medium text-gray-700">Flagged</th>
            <th className="px-4 py-2 text-left font-medium text-gray-700 max-w-[200px]">Review text</th>
            <th className="w-10 px-2 py-2" aria-label="Expand" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {sortedLeads.map((lead, i) => {
            const rowKey = lead.place_id ? lead.place_id : `row-${i}`
            const isExpanded = expandedId === rowKey
            const hasEnrichment = lead.enrichment_summary != null || lead.outreach_suggestion != null
            const hasHighlights = (lead.top_complaints?.length ?? 0) > 0 || (lead.top_strengths?.length ?? 0) > 0
            const hasReviews = (lead.reviews?.length ?? 0) > 0
            const canExpand = hasEnrichment || hasHighlights || hasReviews
            return (
              <React.Fragment key={rowKey}>
                <tr
                  key={rowKey}
                  className={'hover:bg-gray-50 cursor-pointer' + (canExpand ? '' : '')}
                  onClick={() => canExpand && setExpandedId(isExpanded ? null : rowKey)}
                >
                  <td className="px-4 py-2 text-gray-900">{lead.name ?? '—'}</td>
                  <td className="px-4 py-2">{(Number(lead.rating) ?? 0).toFixed(1)}</td>
                  <td className="px-4 py-2">{lead.review_count ?? 0}</td>
                  <td className="px-4 py-2 text-sm">{lead.reach_band ?? '—'}</td>
                  <td className="px-4 py-2 text-sm">{lead.recommendation_score != null ? Math.round(lead.recommendation_score) : '—'}</td>
                  <td className="px-4 py-2 text-sm">{lead.tier ?? '—'}</td>
                  <td className="px-4 py-2 text-sm">{lead.estimated_budget_tier ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-700 text-sm">{lead.phone ?? '—'}</td>
                  <td className="px-4 py-2 text-sm text-gray-600">
                    {allFlaggedKeywords(lead).length > 0 ? allFlaggedKeywords(lead).join(', ') : '—'}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600 max-w-[200px]" onClick={(e) => e.stopPropagation()}>
                    <span className="truncate block" title={reviewSummary(lead)}>{reviewSummary(lead)}</span>
                    {hasReviews && (
                      <button
                        type="button"
                        onClick={() => setReviewsModalLead(lead)}
                        className="text-blue-600 text-xs hover:underline mt-0.5"
                      >
                        View reviews
                      </button>
                    )}
                  </td>
                  <td className="px-2 py-2 text-gray-500">
                    {canExpand ? (isExpanded ? '▼' : '▶') : '—'}
                  </td>
                </tr>
                {isExpanded && canExpand && (
                  <tr key={`${rowKey}-expanded`} className="bg-gray-50">
                    <td colSpan={12} className="px-4 py-3 text-sm">
                      {hasReviews && (
                        <div className="mb-3">
                          <p className="font-medium text-gray-800 mb-2">Review text</p>
                          <ul className="space-y-2 max-h-48 overflow-y-auto rounded border border-gray-200 bg-white p-2">
                            {(lead.reviews ?? []).map((r, idx) => (
                              <ReviewExpandable
                                key={idx}
                                text={r.text}
                                flagged={r.flagged_keywords ?? []}
                                rating={r.rating}
                              />
                            ))}
                          </ul>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setReviewsModalLead(lead) }}
                            className="mt-2 text-sm text-blue-600 hover:underline"
                          >
                            View all reviews
                          </button>
                        </div>
                      )}
                      {(lead.top_complaints?.length ?? 0) > 0 && (
                        <p className="mb-2">
                          <span className="font-medium text-red-700">Top complaints: </span>
                          <span className="text-gray-700">{(lead.top_complaints ?? []).join(' • ')}</span>
                        </p>
                      )}
                      {(lead.top_strengths?.length ?? 0) > 0 && (
                        <p className="mb-2">
                          <span className="font-medium text-green-700">Doing great: </span>
                          <span className="text-gray-700">{(lead.top_strengths ?? []).join(' • ')}</span>
                        </p>
                      )}
                      {lead.enrichment_summary && (
                        <p className="mb-2">
                          <span className="font-medium text-gray-700">Summary: </span>
                          {lead.enrichment_summary}
                        </p>
                      )}
                      {lead.outreach_suggestion && (
                        <p>
                          <span className="font-medium text-gray-700">Outreach: </span>
                          {lead.outreach_suggestion}
                        </p>
                      )}
                      {!hasHighlights && !hasEnrichment && !hasReviews && (
                        <p className="text-gray-500">No review text or insights yet.</p>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
      <ReviewsModal
        lead={reviewsModalLead}
        open={!!reviewsModalLead}
        onClose={() => setReviewsModalLead(null)}
      />
    </div>
  )
}
