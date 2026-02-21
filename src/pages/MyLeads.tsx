import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { bulkUpdateLeads, exportForCrmUrl, getLeads, type SavedLead } from '../api/client'
import { PipelineBoard } from '../components/PipelineBoard'
import { LeadDetailsDrawer, type LeadDetailsUpdates } from '../components/LeadDetailsDrawer'

const STAGES = ['new', 'contacted', 'meeting_booked', 'qualified', 'nurtured']
type ViewMode = 'list' | 'pipeline'

export function MyLeads() {
  const [leads, setLeads] = useState<SavedLead[]>([])
  const [loading, setLoading] = useState(true)
  const [stageFilter, setStageFilter] = useState<string>('')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false)

  const fetchLeads = useCallback(() => {
    getLeads(viewMode === 'pipeline' ? undefined : stageFilter ? { stage: stageFilter } : undefined)
      .then(setLeads)
      .catch(() => setLeads([]))
      .finally(() => setLoading(false))
  }, [stageFilter, viewMode])

  useEffect(() => {
    setLoading(true)
    let cancelled = false
    getLeads(viewMode === 'pipeline' ? undefined : stageFilter ? { stage: stageFilter } : undefined)
      .then((data) => { if (!cancelled) setLeads(data) })
      .catch(() => { if (!cancelled) setLeads([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [stageFilter, viewMode])

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
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Leads</h1>
        </header>
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-100">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md ${viewMode === 'list' ? 'bg-white text-slate-900 shadow' : 'text-slate-600 hover:text-slate-900'}`}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => setViewMode('pipeline')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md ${viewMode === 'pipeline' ? 'bg-white text-slate-900 shadow' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Pipeline
            </button>
          </div>
          {viewMode === 'list' && (
            <>
              <label className="text-sm text-gray-600">Stage:</label>
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="rounded border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">All</option>
                {STAGES.map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </>
          )}
          <button
            type="button"
            onClick={() => setDetailsDrawerOpen(true)}
            disabled={selectedIds.size === 0}
            className="rounded bg-slate-600 px-4 py-2 text-white hover:bg-slate-700 disabled:opacity-50"
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
            className="rounded bg-amber-600 px-4 py-2 text-white hover:bg-amber-700"
          >
            Export for CRM
          </button>
        </div>
        {loading && <p className="text-gray-500">Loading…</p>}
        {!loading && leads.length === 0 && (
          <p className="text-gray-500">No saved leads. Search on the Dashboard and click &quot;Save all&quot;.</p>
        )}
        {!loading && leads.length > 0 && viewMode === 'pipeline' && (
          <PipelineBoard leads={leads} onLeadsChange={setLeads} />
        )}
        {!loading && leads.length > 0 && viewMode === 'list' && (
          <div className="overflow-x-auto rounded border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 w-10">
                    <span className="sr-only">Select</span>
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Name</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Rating</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Stage</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Source</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Contact</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(lead.id)}
                        onChange={(e) => toggleSelect(lead.id, e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600"
                        aria-label={`Select ${lead.name}`}
                      />
                    </td>
                    <td className="px-4 py-2 text-gray-900">{lead.name}</td>
                    <td className="px-4 py-2">{Number(lead.rating).toFixed(1)}</td>
                    <td className="px-4 py-2 capitalize">{lead.stage.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {[lead.source_specialty, lead.source_city, lead.source_region].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {[lead.director_name, lead.contact_email].filter(Boolean).join(' · ') || '—'}
                    </td>
                    <td className="px-4 py-2">
                      <Link to={`/leads/${lead.id}`} className="text-blue-600 hover:underline">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
