import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { getLeads, getLead, getFollowUps, addFollowUp, updateLead, type SavedLead, type LeadDetail, type FollowUp } from '../api/client'
import { Clock, X } from 'lucide-react'

const PIPELINE_STAGES = [
  { id: 'new', label: 'New' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'qualified', label: 'Qualified' },
  { id: 'converted', label: 'Converted' },
  { id: 'lost', label: 'Lost' },
] as const

const LOST_REASONS = ['Budget', 'Timing', 'Competitor', 'No response', 'Other'] as const

const LEAD_SOURCE_COLORS: Record<string, string> = {
  utm: 'bg-violet-100 text-violet-800',
  organic: 'bg-sky-100 text-sky-800',
  referral: 'bg-emerald-100 text-emerald-800',
  campaign: 'bg-amber-100 text-amber-800',
  default: 'bg-slate-100 text-slate-700',
}

function getSourceTagClass(source: string | null | undefined): string {
  if (!source) return LEAD_SOURCE_COLORS.default
  const key = source.toLowerCase()
  if (key.includes('utm') || key.includes('campaign')) return LEAD_SOURCE_COLORS.utm
  if (key.includes('organic')) return LEAD_SOURCE_COLORS.organic
  if (key.includes('referral')) return LEAD_SOURCE_COLORS.referral
  return LEAD_SOURCE_COLORS.default
}

function isLastContactStale(lastContact: string | null | undefined): boolean {
  if (!lastContact) return true
  const then = new Date(lastContact).getTime()
  const now = Date.now()
  return (now - then) / (24 * 60 * 60 * 1000) > 3
}

function isRotting(lead: SavedLead): boolean {
  if (lead.at_risk) return true
  const last = lead.last_contact_date
  if (!last) return true
  const then = new Date(last).getTime()
  const now = Date.now()
  return (now - then) / (60 * 60 * 1000) > 48
}

function formatLastContact(lastContact: string | null | undefined): string {
  if (!lastContact) return 'Never'
  const d = new Date(lastContact)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString()
}

type ViewMode = 'pipeline' | 'table'

export function LeadLifecycleDashboard() {
  const [leads, setLeads] = useState<SavedLead[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('pipeline')
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null)
  const [detailLead, setDetailLead] = useState<LeadDetail | null>(null)
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [lostModal, setLostModal] = useState<{ leadId: number; leadName: string } | null>(null)
  const [lostReason, setLostReason] = useState('')
  const [moving, setMoving] = useState(false)
  const [addFollowUpType, setAddFollowUpType] = useState<'email' | 'call' | 'manual'>('manual')
  const [addFollowUpSummary, setAddFollowUpSummary] = useState('')
  const [addingFollowUp, setAddingFollowUp] = useState(false)

  const loadLeads = useCallback(() => {
    setLoading(true)
    getLeads()
      .then(setLeads)
      .catch(() => setLeads([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadLeads()
  }, [loadLeads])

  useEffect(() => {
    if (selectedLeadId == null) {
      setDetailLead(null)
      setFollowUps([])
      return
    }
    getLead(selectedLeadId).then(setDetailLead).catch(() => setDetailLead(null))
    getFollowUps(selectedLeadId).then(setFollowUps).catch(() => setFollowUps([]))
  }, [selectedLeadId])

  const leadsByStage = useMemo(() => {
    const map: Record<string, SavedLead[]> = {}
    PIPELINE_STAGES.forEach((s) => { map[s.id] = [] })
    leads.forEach((l) => {
      const stage = PIPELINE_STAGES.some((s) => s.id === l.stage) ? l.stage : 'new'
      if (!map[stage]) map[stage] = []
      map[stage].push(l)
    })
    return map
  }, [leads])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const activeLead = useMemo(() => (activeId ? leads.find((l) => l.id === activeId) : null), [activeId, leads])

  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActiveId(e.active.id as number)
  }, [])

  const handleDragEnd = useCallback(async (e: DragEndEvent) => {
    setActiveId(null)
    const leadId = e.active.id as number
    const over = e.over?.id
    if (over == null) return
    let newStage: string | null = null
    if (typeof over === 'string' && PIPELINE_STAGES.some((s) => s.id === over)) {
      newStage = over
    } else if (typeof over === 'number') {
      const targetLead = leads.find((l) => l.id === over)
      if (targetLead) newStage = targetLead.stage
    }
    if (!newStage) return
    const lead = leads.find((l) => l.id === leadId)
    if (!lead || lead.stage === newStage) return
    if (newStage === 'lost') {
      setLostModal({ leadId, leadName: lead.name })
      setLostReason('')
      return
    }
    setMoving(true)
    try {
      await updateLead(leadId, { stage: newStage })
      loadLeads()
    } finally {
      setMoving(false)
    }
  }, [leads, loadLeads])

  const confirmLost = useCallback(async () => {
    if (!lostModal || !lostReason.trim()) return
    setMoving(true)
    try {
      await updateLead(lostModal.leadId, { stage: 'lost', lost_reason: lostReason.trim() })
      setLostModal(null)
      setLostReason('')
      loadLeads()
      if (selectedLeadId === lostModal.leadId) setSelectedLeadId(null)
    } finally {
      setMoving(false)
    }
  }, [lostModal, lostReason, selectedLeadId, loadLeads])

  const handleAddFollowUp = useCallback(async () => {
    if (selectedLeadId == null) return
    setAddingFollowUp(true)
    try {
      await addFollowUp(selectedLeadId, addFollowUpType, addFollowUpSummary.trim() || undefined)
      setAddFollowUpSummary('')
      const list = await getFollowUps(selectedLeadId)
      setFollowUps(list)
      loadLeads()
    } finally {
      setAddingFollowUp(false)
    }
  }, [selectedLeadId, addFollowUpType, addFollowUpSummary, loadLeads])

  function LeadCard({ lead, isOverlay }: { lead: SavedLead; isOverlay?: boolean }) {
    const stale = isLastContactStale(lead.last_contact_date)
    const rotting = isRotting(lead)
    return (
      <div
        className={`relative rounded-lg border bg-white p-3 shadow-sm transition-shadow ${
          isOverlay ? 'cursor-grabbing shadow-lg ring-2 ring-slate-300' : 'cursor-grab border-slate-200'
        } ${lead.stage === 'converted' ? 'border-emerald-200' : ''} ${lead.stage === 'lost' ? 'border-[#f4a494]' : ''}`}
      >
        {rotting && !isOverlay && (
          <div className="absolute inset-0 rounded-lg bg-slate-400/10 pointer-events-none flex items-center justify-center">
            <Clock className="h-5 w-5 text-slate-500" aria-hidden />
          </div>
        )}
        <div className="relative">
          <p className="font-medium text-slate-900 truncate">{lead.name}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {lead.lead_source && (
              <span className={`inline-flex rounded px-1.5 py-0.5 text-xs font-medium ${getSourceTagClass(lead.lead_source)}`}>
                {lead.lead_source}
              </span>
            )}
            {lead.qualification_score != null && (
              <span className="inline-flex rounded-full bg-slate-800 px-2 py-0.5 text-xs font-bold text-white">
                {lead.qualification_score}/10
              </span>
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500">
            <span>Follow-ups: {lead.follow_up_count ?? 0}</span>
            <span className={stale ? 'text-red-600 font-medium' : ''}>
              Last: {formatLastContact(lead.last_contact_date)}
            </span>
          </div>
        </div>
      </div>
    )
  }

  function DraggableLeadCard({ lead }: { lead: SavedLead }) {
    const { attributes, listeners, setNodeRef } = useDraggable({ id: lead.id })
    return (
      <div ref={setNodeRef} {...listeners} {...attributes} onClick={() => setSelectedLeadId(lead.id)}>
        <LeadCard lead={lead} />
      </div>
    )
  }

  function DroppableColumn({ stage, children }: { stage: (typeof PIPELINE_STAGES)[number]; children: React.ReactNode }) {
    const { setNodeRef } = useDroppable({ id: stage.id })
    return (
      <div
        ref={setNodeRef}
        className={`flex min-w-[280px] flex-col rounded-xl border-2 border-dashed p-3 ${
          stage.id === 'converted' ? 'border-emerald-200 bg-emerald-50/30' :
          stage.id === 'lost' ? 'border-[#f4a494] bg-[#fef5f3]' :
          'border-slate-200 bg-white'
        }`}
      >
        <h2 className="mb-3 font-semibold text-slate-800">{stage.label}</h2>
        <div className="flex flex-1 flex-col gap-2">
          {children}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-900">Lead Lifecycle</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">View:</span>
            <button
              type="button"
              onClick={() => setViewMode('pipeline')}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${viewMode === 'pipeline' ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
            >
              Pipeline
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${viewMode === 'table' ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
            >
              Table
            </button>
          </div>
        </header>

        {loading && <p className="text-slate-500">Loading…</p>}
        {!loading && leads.length === 0 && (
          <p className="text-slate-500">No leads. Save leads from the Dashboard to see them here.</p>
        )}

        {!loading && leads.length > 0 && viewMode === 'pipeline' && (
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {PIPELINE_STAGES.map((stage) => (
                <DroppableColumn key={stage.id} stage={stage}>
                  {(leadsByStage[stage.id] ?? []).map((lead) => (
                    <DraggableLeadCard key={lead.id} lead={lead} />
                  ))}
                </DroppableColumn>
              ))}
            </div>
            <DragOverlay>
              {activeLead ? <LeadCard lead={activeLead} isOverlay /> : null}
            </DragOverlay>
          </DndContext>
        )}

        {!loading && leads.length > 0 && viewMode === 'table' && (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">Name</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">Source</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">Score</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">Follow-ups</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">Last contact</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">Stage</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">At risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {leads.map((lead) => {
                  const stale = isLastContactStale(lead.last_contact_date)
                  return (
                    <tr
                      key={lead.id}
                      onClick={() => setSelectedLeadId(lead.id)}
                      className="hover:bg-slate-50 cursor-pointer"
                    >
                      <td className="px-4 py-2 text-slate-900">{lead.name}</td>
                      <td className="px-4 py-2">
                        {lead.lead_source && (
                          <span className={`inline-flex rounded px-1.5 py-0.5 text-xs font-medium ${getSourceTagClass(lead.lead_source)}`}>
                            {lead.lead_source}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2">{lead.qualification_score ?? '—'}</td>
                      <td className="px-4 py-2">{lead.follow_up_count ?? 0}</td>
                      <td className={`px-4 py-2 text-sm ${stale ? 'text-red-600' : 'text-slate-600'}`}>
                        {formatLastContact(lead.last_contact_date)}
                      </td>
                      <td className="px-4 py-2 capitalize text-slate-700">{lead.stage.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-2">{lead.at_risk ? 'Yes' : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Lost reason modal */}
        {lostModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
              <h3 className="font-semibold text-slate-900">Move to Lost</h3>
              <p className="mt-1 text-sm text-slate-600">Reason required for &quot;{lostModal.leadName}&quot;</p>
              <select
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                className="mt-3 w-full rounded border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Select reason…</option>
                {LOST_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setLostModal(null); setLostReason('') }}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmLost}
                  disabled={!lostReason.trim() || moving}
                  className="rounded-lg bg-[#e07a6f] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#c4695f] disabled:opacity-50"
                >
                  {moving ? 'Saving…' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Right-side drawer */}
        {selectedLeadId != null && (
          <div className="fixed inset-0 z-40 flex justify-end bg-black/20" onClick={() => setSelectedLeadId(null)}>
            <div
              className="w-full max-w-md bg-white shadow-xl overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
                <h2 className="font-semibold text-slate-900">Lead details</h2>
                <button
                  type="button"
                  onClick={() => setSelectedLeadId(null)}
                  className="rounded p-1 text-slate-500 hover:bg-slate-100"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-4 space-y-6">
                {detailLead && (
                  <>
                    <section>
                      <h3 className="text-sm font-medium text-slate-700 mb-2">Contact</h3>
                      <p className="text-slate-900 font-medium">{detailLead.name}</p>
                      {detailLead.phone && <p className="text-sm text-slate-600">Phone: {detailLead.phone}</p>}
                      <p className="text-sm text-slate-600">
                        {[detailLead.source_specialty, detailLead.source_city, detailLead.source_region].filter(Boolean).join(', ') || '—'}
                      </p>
                      {detailLead.lead_source && (
                        <span className={`inline-flex mt-1 rounded px-1.5 py-0.5 text-xs font-medium ${getSourceTagClass(detailLead.lead_source)}`}>
                          {detailLead.lead_source}
                        </span>
                      )}
                    </section>
                    <section>
                      <h3 className="text-sm font-medium text-slate-700 mb-2">Follow-up history</h3>
                      <ul className="space-y-1 text-sm text-slate-600">
                        {followUps.length === 0 && <li>No follow-ups yet.</li>}
                        {followUps.map((fu) => (
                          <li key={fu.id}>
                            <span className="font-medium text-slate-700">{fu.type}</span>
                            {fu.summary && ` — ${fu.summary}`}
                            <span className="text-slate-400 ml-1">{fu.created_at ? new Date(fu.created_at).toLocaleDateString() : ''}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-2 flex flex-wrap gap-2 items-end">
                        <select
                          value={addFollowUpType}
                          onChange={(e) => setAddFollowUpType(e.target.value as 'email' | 'call' | 'manual')}
                          className="rounded border border-slate-300 px-2 py-1 text-sm"
                        >
                          <option value="email">Email</option>
                          <option value="call">Call</option>
                          <option value="manual">Manual</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Summary (optional)"
                          value={addFollowUpSummary}
                          onChange={(e) => setAddFollowUpSummary(e.target.value)}
                          className="flex-1 min-w-[120px] rounded border border-slate-300 px-2 py-1 text-sm"
                        />
                        <button
                          type="button"
                          onClick={handleAddFollowUp}
                          disabled={addingFollowUp}
                          className="rounded bg-slate-800 px-3 py-1 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
                        >
                          {addingFollowUp ? 'Adding…' : 'Add'}
                        </button>
                      </div>
                    </section>
                    {(detailLead.stage === 'lost' || detailLead.lost_reason) && (
                      <section>
                        <h3 className="text-sm font-medium text-slate-700 mb-2">Lost reason</h3>
                        <p className="text-sm text-slate-600">{detailLead.lost_reason || '—'}</p>
                        {detailLead.stage === 'lost' && (
                          <select
                            value={detailLead.lost_reason ?? ''}
                            onChange={async (e) => {
                              const v = e.target.value
                              await updateLead(detailLead.id, { lost_reason: v || null })
                              const updated = await getLead(detailLead.id)
                              setDetailLead(updated)
                              loadLeads()
                            }}
                            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                          >
                            <option value="">—</option>
                            {LOST_REASONS.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        )}
                      </section>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
