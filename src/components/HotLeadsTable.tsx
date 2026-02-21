import React, { useState, useMemo } from 'react'
import type { HotLead } from '../types/leads'

type SortKey = 'name' | 'rating' | 'review_count' | 'phone'

function allFlaggedKeywords(lead: HotLead): string[] {
  const set = new Set<string>()
  const reviews = lead.reviews ?? []
  for (const r of reviews) {
    const kws = r.flagged_keywords ?? []
    for (const kw of kws) set.add(kw)
  }
  return [...set]
}

interface HotLeadsTableProps {
  leads: HotLead[]
}

export function HotLeadsTable({ leads }: HotLeadsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('rating')
  const [asc, setAsc] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const sortedLeads = useMemo(() => {
    const arr = [...leads]
    arr.sort((a, b) => {
      let aVal: string | number = a[sortKey]
      let bVal: string | number = b[sortKey]
      if (sortKey === 'rating' || sortKey === 'review_count') {
        aVal = Number(aVal)
        bVal = Number(bVal)
        return asc ? aVal - bVal : bVal - aVal
      }
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
      setAsc(true)
    }
  }

  return (
    <div className="overflow-x-auto rounded border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 text-left">
              <button
                type="button"
                onClick={() => toggleSort('name')}
                className="font-medium text-gray-700 hover:underline"
              >
                Business Name {sortKey === 'name' && (asc ? '↑' : '↓')}
              </button>
            </th>
            <th className="px-4 py-2 text-left">
              <button
                type="button"
                onClick={() => toggleSort('rating')}
                className="font-medium text-gray-700 hover:underline"
              >
                Rating {sortKey === 'rating' && (asc ? '↑' : '↓')}
              </button>
            </th>
            <th className="px-4 py-2 text-left">
              <button
                type="button"
                onClick={() => toggleSort('review_count')}
                className="font-medium text-gray-700 hover:underline"
              >
                Review Count {sortKey === 'review_count' && (asc ? '↑' : '↓')}
              </button>
            </th>
            <th className="px-4 py-2 text-left">
              <button
                type="button"
                onClick={() => toggleSort('phone')}
                className="font-medium text-gray-700 hover:underline"
              >
                Phone {sortKey === 'phone' && (asc ? '↑' : '↓')}
              </button>
            </th>
            <th className="px-4 py-2 text-left font-medium text-gray-700">
              Flagged keywords
            </th>
            <th className="w-10 px-2 py-2" aria-label="Expand" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {sortedLeads.map((lead, i) => {
            const rowKey = lead.place_id ? lead.place_id : `row-${i}`
            const isExpanded = expandedId === rowKey
            const hasEnrichment = lead.enrichment_summary != null || lead.outreach_suggestion != null
            return (
              <React.Fragment key={rowKey}>
                <tr
                  key={rowKey}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : rowKey)}
                >
                  <td className="px-4 py-2 text-gray-900">{lead.name ?? '—'}</td>
                  <td className="px-4 py-2">{(Number(lead.rating) ?? 0).toFixed(1)}</td>
                  <td className="px-4 py-2">{lead.review_count ?? 0}</td>
                  <td className="px-4 py-2 text-gray-700">{lead.phone ?? '—'}</td>
                  <td className="px-4 py-2 text-sm text-gray-600">
                    {allFlaggedKeywords(lead).length > 0
                      ? allFlaggedKeywords(lead).join(', ')
                      : '—'}
                  </td>
                  <td className="px-2 py-2 text-gray-500">
                    {hasEnrichment ? (isExpanded ? '▼' : '▶') : '—'}
                  </td>
                </tr>
                {isExpanded && (lead.enrichment_summary != null || lead.outreach_suggestion != null) && (
                  <tr key={`${rowKey}-expanded`} className="bg-violet-50">
                    <td colSpan={6} className="px-4 py-3 text-sm">
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
                      {!lead.enrichment_summary && !lead.outreach_suggestion && (
                        <p className="text-gray-500">No AI enrichment yet. Click &quot;Enrich with AI&quot; above.</p>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
