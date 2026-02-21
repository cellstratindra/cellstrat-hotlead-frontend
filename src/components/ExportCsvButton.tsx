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

interface ExportCsvButtonProps {
  leads: HotLead[]
}

export function ExportCsvButton({ leads }: ExportCsvButtonProps) {
  function handleClick() {
    const headers = ['name', 'rating', 'review_count', 'phone', 'flagged_keywords', 'enrichment_summary', 'outreach_suggestion']
    const rows = leads.map((lead) => [
      escapeCsvCell(lead.name ?? ''),
      String(lead.rating ?? 0),
      String(lead.review_count ?? 0),
      escapeCsvCell(lead.phone ?? ''),
      escapeCsvCell(allFlaggedKeywords(lead)),
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

  return (
    <button
      type="button"
      onClick={handleClick}
      className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
    >
      Export CSV
    </button>
  )
}
