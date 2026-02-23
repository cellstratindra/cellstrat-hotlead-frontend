import type { HotLead } from '../types/leads'

function escapeCsvCell(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function allFlaggedKeywords(lead: HotLead): string {
  const set = new Set<string>()
  const reviews = lead.reviews ?? []
  for (const r of reviews) {
    const kws = r.flagged_keywords ?? []
    for (const kw of kws) set.add(kw)
  }
  return [...set].join('; ')
}

/** Programmatic export for use from header actions */
export function exportLeadsToCsv(leads: HotLead[]): void {
  if (leads.length === 0) return
  const headers = ['name', 'rating', 'review_count', 'phone', 'reach_band', 'tier', 'estimated_budget_tier', 'flagged_keywords', 'top_complaints', 'top_strengths', 'enrichment_summary', 'outreach_suggestion']
  const rows = leads.map((lead) => [
    escapeCsvCell(lead.name ?? ''),
    String(lead.rating ?? 0),
    String(lead.review_count ?? 0),
    escapeCsvCell(lead.phone ?? ''),
    escapeCsvCell(lead.reach_band ?? ''),
    escapeCsvCell(lead.tier ?? ''),
    escapeCsvCell(lead.estimated_budget_tier ?? ''),
    escapeCsvCell(allFlaggedKeywords(lead)),
    escapeCsvCell((lead.top_complaints ?? []).join('; ')),
    escapeCsvCell((lead.top_strengths ?? []).join('; ')),
    escapeCsvCell(lead.enrichment_summary ?? ''),
    escapeCsvCell(lead.outreach_suggestion ?? ''),
  ])
  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'hot-leads.csv'
  a.click()
  URL.revokeObjectURL(url)
}

interface ExportCsvButtonProps {
  leads: HotLead[]
  className?: string
}

export function ExportCsvButton({ leads, className }: ExportCsvButtonProps) {
  return (
    <button
      type="button"
      onClick={() => exportLeadsToCsv(leads)}
      className={className ?? 'rounded-[var(--radius-button)] bg-green-600 px-4 py-2 text-white hover:bg-green-700'}
    >
      Export CSV
    </button>
  )
}
