import { memo } from 'react'
import { Link } from 'react-router-dom'
import { Phone, Mail, FileText } from 'lucide-react'
import type { SavedLead } from '../api/client'

interface SavedLeadCardProps {
  lead: SavedLead
  /** True when this lead is assigned to the current user (used for highlight style) */
  isYou: boolean
  /** Resolved display name of the assignee (or null if unassigned) */
  assignedToLabel: string | null
  selected: boolean
  onToggle: (leadId: number, checked: boolean) => void
}

function stageLabel(s: string): string {
  return s.replace(/_/g, ' ')
}

function SavedLeadCardInner({ lead, isYou, assignedToLabel, selected, onToggle }: SavedLeadCardProps) {
  const source = [lead.source_specialty, lead.source_city, lead.source_region].filter(Boolean).join(', ') || '—'
  const contact = [lead.director_name, lead.contact_email].filter(Boolean).join(' · ') || '—'

  return (
    <article
      className="rounded-[var(--radius-card)] border-default bg-white/90 backdrop-blur-sm p-[var(--space-4)] shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-dropdown)]"
      aria-label={`Lead: ${lead.name}`}
    >
      <div className="flex flex-col gap-[var(--space-3)]">
        {/* Header: name + Hot Score / stage badge */}
        <div className="flex items-start justify-between gap-[var(--space-2)]">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onToggle(lead.id, e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)] shrink-0 mt-0.5"
            aria-label={`Select ${lead.name}`}
          />
          <h3 className="text-base font-semibold leading-tight text-slate-900 flex-1 min-w-0">
            {lead.name}
          </h3>
          <span className="rounded-[var(--radius-button)] border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-[var(--space-2)] py-[var(--space-1)] text-sm font-bold tabular-nums text-[var(--color-primary)] shrink-0">
            {(lead as { qualification_score?: number }).qualification_score ?? Number(lead.rating).toFixed(1)}
          </span>
          <span className="rounded-[var(--radius-sm)] border border-slate-200 bg-slate-50 px-[var(--space-2)] py-[var(--space-1)] text-xs font-medium text-slate-700 capitalize shrink-0">
            {stageLabel(lead.stage)}
          </span>
        </div>
        {/* Body: 2–3 key metrics */}
        <p className="text-sm text-slate-500">
          {Number(lead.rating).toFixed(1)} rating · {lead.review_count} reviews
        </p>
        {source !== '—' && (
          <span className="inline-flex w-fit rounded-full bg-slate-100 px-[var(--space-3)] py-[var(--space-1)] text-xs font-medium text-slate-600" aria-label={`Source: ${source}`}>
            {source}
          </span>
        )}
        {contact !== '—' && (
          <p className="text-xs text-slate-600 truncate" title={contact}>{contact}</p>
        )}
        {/* Footer: quick actions (Call, Email, Note) + assigned */}
        <div className="flex flex-wrap items-center justify-between gap-[var(--space-2)] border-t border-slate-100 pt-[var(--space-2)]">
          <div className="flex items-center gap-[var(--space-1)]">
            {lead.phone && (
              <a
                href={`tel:${lead.phone.replace(/\D/g, '')}`}
                className="touch-target flex items-center justify-center rounded-[var(--radius-button)] p-[var(--space-2)] text-slate-600 hover:bg-slate-100 hover:text-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
                style={{ minHeight: 'var(--touch-min)', minWidth: 'var(--touch-min)' }}
                aria-label="Call"
              >
                <Phone className="h-5 w-5" aria-hidden />
              </a>
            )}
            {lead.contact_email && (
              <a
                href={`mailto:${lead.contact_email}`}
                className="touch-target flex items-center justify-center rounded-[var(--radius-button)] p-[var(--space-2)] text-slate-600 hover:bg-slate-100 hover:text-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
                style={{ minHeight: 'var(--touch-min)', minWidth: 'var(--touch-min)' }}
                aria-label="Email"
              >
                <Mail className="h-5 w-5" aria-hidden />
              </a>
            )}
            <Link
              to={`/leads/${lead.id}`}
              className="touch-target flex items-center justify-center rounded-[var(--radius-button)] p-[var(--space-2)] text-slate-600 hover:bg-slate-100 hover:text-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
              style={{ minHeight: 'var(--touch-min)', minWidth: 'var(--touch-min)' }}
              aria-label="Note / View detail"
            >
              <FileText className="h-5 w-5" aria-hidden />
            </Link>
          </div>
          {assignedToLabel ? (
            <span
              className={`inline-flex rounded-[var(--radius-button)] px-[var(--space-2)] py-[var(--space-1)] text-xs font-medium ${
                isYou ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {assignedToLabel}
            </span>
          ) : (
            <span className="text-slate-400 text-xs">Unassigned</span>
          )}
        </div>
      </div>
    </article>
  )
}

export const SavedLeadCard = memo(SavedLeadCardInner)
