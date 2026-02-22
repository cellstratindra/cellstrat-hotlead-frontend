import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { HotLead } from '../types/leads'

const TOP_N = 8

type LeadWithScores = HotLead & { qualification_score?: number; priority_score?: number }

interface TaskPrioritySidebarProps {
  leads: HotLead[]
  /** Optional: label for the list, e.g. "From this search" */
  title?: string
  /** When provided, clicking a lead calls this (e.g. open detail drawer) */
  onLeadClick?: (lead: HotLead) => void
}

function getReadinessScore(l: LeadWithScores): number {
  return l.priority_score ?? l.recommendation_score ?? l.qualification_score ?? 0
}

export function TaskPrioritySidebar({ leads, title = 'Task Priority', onLeadClick }: TaskPrioritySidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  const sorted = [...leads]
    .filter((l) => getReadinessScore(l as LeadWithScores) > 0 || l.recommendation_score != null || (l as LeadWithScores).qualification_score != null)
    .sort((a, b) => getReadinessScore(b as LeadWithScores) - getReadinessScore(a as LeadWithScores))
    .slice(0, TOP_N)

  if (leads.length === 0) return null

  return (
    <aside
      className={`shrink-0 border-l border-slate-200 bg-white shadow-[var(--shadow-dropdown)] transition-[width] ${
        collapsed ? 'w-10' : 'w-56'
      }`}
      aria-label={title}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-slate-200 px-2 py-2">
          {!collapsed && <h3 className="text-sm font-medium text-[#1E293B] truncate">{title}</h3>}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="rounded-[8px] p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
        {!collapsed && (
          <ul className="flex-1 overflow-y-auto p-2 space-y-1">
            {sorted.length === 0 && <li className="text-xs text-slate-500">No scored leads</li>}
            {sorted.map((lead, i) => {
              const score = getReadinessScore(lead as LeadWithScores)
              return (
                <li key={lead.place_id ?? lead.id ?? i}>
                  <button
                    type="button"
                    onClick={() => onLeadClick?.(lead)}
                    className="w-full text-left rounded-[8px] px-2 py-1.5 bg-slate-50 text-sm hover:bg-slate-100 transition-colors"
                  >
                    <span className="font-medium text-slate-800 truncate block" title={lead.name}>
                      {lead.name ?? '—'}
                    </span>
                    <span className="text-xs text-[#2563EB] tabular-nums">{Math.round(Number(score))}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </aside>
  )
}
