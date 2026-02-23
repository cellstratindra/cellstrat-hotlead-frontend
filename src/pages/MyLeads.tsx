import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import {
  bulkUpdateLeads,
  exportForCrmUrl,
  getLeads,
  getAssignableUsers,
  assignLead,
  unassignLead,
  updateLeadStage,
  type SavedLead,
  type AssignableUser,
} from '../api/client'
import { PipelineBoard } from '../components/PipelineBoard'
import { LeadDetailsDrawer, type LeadDetailsUpdates } from '../components/LeadDetailsDrawer'
import { SwipeableLeadCard } from '../components/SwipeableLeadCard'
import { useHeaderActions } from '../contexts/HeaderActionsContext'

const STAGES = ['new', 'contacted', 'meeting_booked', 'qualified', 'nurtured']
type ViewMode = 'list' | 'pipeline'
type LeadScope = 'my' | 'org'

export function MyLeads() {
  const { user } = useUser()
  const [leads, setLeads] = useState<SavedLead[]>([])
  const [loading, setLoading] = useState(true)
  const [stageFilter, setStageFilter] = useState<string>('')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [leadScope, setLeadScope] = useState<LeadScope>('my')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false)
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([])
  const headerActions = useHeaderActions()

  useEffect(() => {
    getAssignableUsers().then(setAssignableUsers).catch(() => setAssignableUsers([]))
  }, [])

  useEffect(() => {
    if (!headerActions) return
    headerActions.setExportAction({
      label: 'Export for CRM',
      onClick: () => {
        const url = exportForCrmUrl(stageFilter ? { stage: stageFilter } : undefined)
        fetch(url)
          .then((r) => r.text())
          .then((csv) => {
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
            const a = document.createElement('a')
            a.href = URL.createObjectURL(blob)
            a.download = 'hot-leads-crm-export.csv'
            a.click()
            URL.revokeObjectURL(a.href)
          })
      },
    })
    return () => headerActions.setExportAction(null)
  }, [headerActions, stageFilter])

  const fetchLeads = useCallback(() => {
    const params: Parameters<typeof getLeads>[0] =
      viewMode === 'pipeline' ? undefined : stageFilter ? { stage: stageFilter } : undefined
    const withScope = {
      ...params,
      scope: leadScope,
      user_id: leadScope === 'my' ? user?.id ?? null : undefined,
    }
    getLeads(withScope)
      .then(setLeads)
      .catch(() => setLeads([]))
      .finally(() => setLoading(false))
  }, [stageFilter, viewMode, leadScope, user?.id])

  useEffect(() => {
    setLoading(true)
    let cancelled = false
    const params: Parameters<typeof getLeads>[0] =
      viewMode === 'pipeline' ? undefined : stageFilter ? { stage: stageFilter } : undefined
    const withScope = {
      ...params,
      scope: leadScope,
      user_id: leadScope === 'my' ? user?.id ?? null : undefined,
    }
    getLeads(withScope)
      .then((data) => { if (!cancelled) setLeads(data) })
      .catch(() => { if (!cancelled) setLeads([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [stageFilter, viewMode, leadScope, user?.id])

  const selectedLeads = leads.filter((l) => selectedIds.has(l.id))

  async function handleSaveDetails(updates: LeadDetailsUpdates) {
    await bulkUpdateLeads({
      lead_ids: [...selectedIds],
      contact_email: updates.contact_email ?? null,
      director_name: updates.director_name ?? null,
      note: updates.note ?? null,
    })
    setSelectedIds(new Set())
    setDetailsDrawerOpen(false)
    fetchLeads()
  }

  function toggleSelect(id: number, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] p-[var(--edge-padding)] md:p-[var(--space-6)] pb-20 md:pb-[var(--space-6)]">
      <div className="mx-auto max-w-6xl">
        <header className="mb-[var(--space-4)]">
          <h1 className="text-2xl font-bold text-[var(--color-navy)]">Leads</h1>
        </header>
        {/* Mobile: segmented control for stage only */}
        <div className="md:hidden mb-[var(--space-4)] overflow-x-auto -mx-[var(--edge-padding)] px-[var(--edge-padding)]">
          <div className="flex gap-[var(--space-2)] pb-[var(--space-2)] min-w-0">
            {['', ...STAGES].map((s) => (
              <button
                key={s || 'all'}
                type="button"
                onClick={() => setStageFilter(s)}
                className={`touch-target shrink-0 px-[var(--space-4)] py-2.5 rounded-[var(--radius-button)] text-sm font-medium whitespace-nowrap focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 ${stageFilter === s ? 'bg-[var(--color-primary)] text-white' : 'bg-slate-100 text-slate-700'}`}
                style={{ minHeight: 'var(--touch-min)' }}
              >
                {s ? s.replace(/_/g, ' ') : 'All'}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-[var(--space-4)] flex flex-wrap items-center gap-[var(--space-4)]">
          {/* Desktop: List / Pipeline toggle */}
          <div className="hidden md:flex rounded-[var(--radius-button)] border border-slate-200 p-[var(--space-1)] bg-slate-100">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-[var(--space-3)] py-[var(--space-2)] text-sm font-medium rounded-[var(--radius-sm)] ${viewMode === 'list' ? 'bg-white text-slate-900 shadow' : 'text-slate-600 hover:text-slate-900'}`}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => setViewMode('pipeline')}
              className={`px-[var(--space-3)] py-[var(--space-2)] text-sm font-medium rounded-[var(--radius-sm)] ${viewMode === 'pipeline' ? 'bg-white text-slate-900 shadow' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Pipeline
            </button>
          </div>
          <div className="flex items-center gap-[var(--space-2)]">
            <span className="text-sm text-slate-600">Lead view:</span>
            <div className="flex rounded-[var(--radius-button)] border border-slate-200 p-[var(--space-1)] bg-slate-100">
              <button
                type="button"
                onClick={() => setLeadScope('my')}
                className={`px-[var(--space-3)] py-[var(--space-2)] text-sm font-medium rounded-[var(--radius-sm)] touch-target ${leadScope === 'my' ? 'bg-white text-slate-900 shadow' : 'text-slate-600 hover:text-slate-900'}`}
              >
                My Leads
              </button>
              <button
                type="button"
                onClick={() => setLeadScope('org')}
                className={`px-[var(--space-3)] py-[var(--space-2)] text-sm font-medium rounded-[var(--radius-sm)] touch-target ${leadScope === 'org' ? 'bg-white text-slate-900 shadow' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Organization
              </button>
            </div>
          </div>
          {viewMode === 'list' && (
            <div className="hidden md:flex items-center gap-[var(--space-2)]">
              <label className="text-sm text-slate-600">Stage:</label>
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="rounded-[var(--radius-button)] border border-slate-300 px-[var(--space-3)] py-[var(--space-2)] text-sm"
              >
                <option value="">All</option>
                {STAGES.map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          )}
          <button
            type="button"
            onClick={() => setDetailsDrawerOpen(true)}
            disabled={selectedIds.size === 0}
            className="rounded-[var(--radius-button)] bg-slate-600 px-[var(--space-4)] py-[var(--space-2)] text-white shadow-[var(--shadow-button)] hover:bg-slate-700 disabled:opacity-50 focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
          >
            Add details {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
          </button>
          <button
            type="button"
            onClick={() => {
              const url = exportForCrmUrl(stageFilter ? { stage: stageFilter } : undefined)
              fetch(url)
                .then((r) => r.text())
                .then((csv) => {
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
                  const a = document.createElement('a')
                  a.href = URL.createObjectURL(blob)
                  a.download = 'hot-leads-crm-export.csv'
                  a.click()
                  URL.revokeObjectURL(a.href)
                })
            }}
            className="rounded-[var(--radius-button)] bg-amber-600 px-[var(--space-4)] py-[var(--space-2)] text-white shadow-[var(--shadow-button)] hover:bg-amber-700 focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
          >
            Export for CRM
          </button>
        </div>
        {loading && <p className="text-slate-500">Loading…</p>}
        {!loading && leads.length === 0 && (
          <p className="text-slate-500">No saved leads. Search on the Dashboard and click &quot;Save all&quot;.</p>
        )}
        {/* Pipeline: desktop only */}
        {!loading && leads.length > 0 && viewMode === 'pipeline' && (
          <div className="hidden md:block">
          <PipelineBoard
            leads={leads}
            onLeadsChange={setLeads}
            assignableUsers={assignableUsers}
            currentUserId={user?.id ?? null}
            onAssign={async (leadId, userId) => {
              await assignLead(leadId, userId)
              fetchLeads()
            }}
            onUnassign={async (leadId) => {
              await unassignLead(leadId)
              fetchLeads()
            }}
          />
          </div>
        )}
        {/* List: mobile = cards with swipe; desktop = table */}
        {!loading && leads.length > 0 && viewMode === 'list' && (
          <>
            <div className="md:hidden space-y-[var(--space-3)]">
              {leads.map((lead, index) => (
                <SwipeableLeadCard
                  key={lead.id}
                  lead={lead}
                  isYou={lead.assigned_to === user?.id}
                  selected={selectedIds.has(lead.id)}
                  onToggle={(checked) => toggleSelect(lead.id, checked)}
                  onSwipeRight={async () => {
                    await updateLeadStage(lead.id, 'qualified')
                    fetchLeads()
                  }}
                  onSwipeLeft={async () => {
                    await updateLeadStage(lead.id, 'new')
                    fetchLeads()
                  }}
                  showSwipeHint={index === 0}
                />
              ))}
            </div>
            <div className="hidden md:block overflow-x-auto rounded-[var(--radius-button)] border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-[var(--space-4)] py-[var(--space-2)] w-10">
                    <span className="sr-only">Select</span>
                  </th>
                  <th className="px-[var(--space-4)] py-[var(--space-2)] text-left font-medium text-slate-700">Name</th>
                  <th className="px-[var(--space-4)] py-[var(--space-2)] text-left font-medium text-slate-700">Rating</th>
                  <th className="px-[var(--space-4)] py-[var(--space-2)] text-left font-medium text-slate-700">Stage</th>
                  <th className="px-[var(--space-4)] py-[var(--space-2)] text-left font-medium text-slate-700">Assigned</th>
                  <th className="px-[var(--space-4)] py-[var(--space-2)] text-left font-medium text-slate-700">Source</th>
                  <th className="px-[var(--space-4)] py-[var(--space-2)] text-left font-medium text-slate-700">Contact</th>
                  <th className="px-[var(--space-4)] py-[var(--space-2)] text-left font-medium text-slate-700">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50">
                    <td className="px-[var(--space-4)] py-[var(--space-2)]">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(lead.id)}
                        onChange={(e) => toggleSelect(lead.id, e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-[var(--color-primary)]"
                        aria-label={`Select ${lead.name}`}
                      />
                    </td>
                    <td className="px-[var(--space-4)] py-[var(--space-2)] text-slate-900">{lead.name}</td>
                    <td className="px-[var(--space-4)] py-[var(--space-2)]">{Number(lead.rating).toFixed(1)}</td>
                    <td className="px-[var(--space-4)] py-[var(--space-2)] capitalize">{lead.stage.replace(/_/g, ' ')}</td>
                    <td className="px-[var(--space-4)] py-[var(--space-2)]">
                      {lead.assigned_to ? (
                        <span
                          className={`inline-flex rounded-[8px] px-2 py-0.5 text-xs font-medium ${
                            lead.assigned_to === user?.id ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'bg-slate-100 text-slate-700'
                          }`}
                          title={lead.assigned_to}
                        >
                          {lead.assigned_to === user?.id ? 'You' : 'Team'}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-[var(--space-4)] py-[var(--space-2)] text-sm text-slate-600">
                      {[lead.source_specialty, lead.source_city, lead.source_region].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="px-[var(--space-4)] py-[var(--space-2)] text-sm text-slate-600">
                      {[lead.director_name, lead.contact_email].filter(Boolean).join(' · ') || '—'}
                    </td>
                    <td className="px-[var(--space-4)] py-[var(--space-2)]">
                      <Link to={`/leads/${lead.id}`} className="text-[var(--color-primary)] hover:underline">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
        <LeadDetailsDrawer
          open={detailsDrawerOpen}
          onClose={() => setDetailsDrawerOpen(false)}
          leads={selectedLeads}
          onSave={handleSaveDetails}
          requireSavedFirst={false}
        />
      </div>
    </div>
  )
}
