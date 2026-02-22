import { Link } from 'react-router-dom'
import type { SavedLead } from '../api/client'

interface SavedLeadCardProps {
  lead: SavedLead
  isYou: boolean
  selected: boolean
  onToggle: (checked: boolean) => void
}

function stageLabel(s: string): string {
  return s.replace(/_/g, ' ')
}

export function SavedLeadCard({ lead, isYou, selected, onToggle }: SavedLeadCardProps) {
  const source = [lead.source_specialty, lead.source_city, lead.source_region].filter(Boolean).join(', ') || '—'
  const contact = [lead.director_name, lead.contact_email].filter(Boolean).join(' · ') || '—'

  return (
    <article
      className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
      aria-label={`Lead: ${lead.name}`}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onToggle(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)] shrink-0 mt-0.5"
            aria-label={`Select ${lead.name}`}
          />
          <h3 className="text-base font-semibold leading-tight text-slate-900 flex-1 min-w-0">
            {lead.name}
          </h3>
          <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700 capitalize shrink-0">
            {stageLabel(lead.stage)}
          </span>
        </div>
        <p className="text-sm text-slate-500">
          {Number(lead.rating).toFixed(1)} · {lead.review_count} reviews
        </p>
        {source !== '—' && (
          <p className="text-xs text-slate-600">Source: {source}</p>
        )}
        {contact !== '—' && (
          <p className="text-xs text-slate-600 truncate" title={contact}>{contact}</p>
        )}
        <div className="flex items-center justify-between">
          {lead.assigned_to ? (
            <span
              className={`inline-flex rounded-[8px] px-2 py-0.5 text-xs font-medium ${
                isYou ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {isYou ? 'You' : 'Team'}
            </span>
          ) : (
            <span className="text-slate-400 text-xs">Unassigned</span>
          )}
          <Link
            to={`/leads/${lead.id}`}
            className="text-sm font-medium text-[var(--color-primary)] hover:underline touch-target flex items-center"
            style={{ minHeight: 'var(--touch-min)' }}
          >
            View
          </Link>
        </div>
      </div>
    </article>
  )
}
