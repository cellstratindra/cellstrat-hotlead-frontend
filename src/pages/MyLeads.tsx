import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { UserButton } from '@clerk/clerk-react'
import { exportForCrmUrl, getLeads, type SavedLead } from '../api/client'

const STAGES = ['new', 'contacted', 'meeting_booked', 'qualified', 'nurtured']

export function MyLeads() {
  const [leads, setLeads] = useState<SavedLead[]>([])
  const [loading, setLoading] = useState(true)
  const [stageFilter, setStageFilter] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    getLeads(stageFilter ? { stage: stageFilter } : undefined)
      .then((data) => { if (!cancelled) setLeads(data) })
      .catch(() => { if (!cancelled) setLeads([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [stageFilter])

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-blue-600 hover:underline">Dashboard</Link>
            <h1 className="text-2xl font-bold text-gray-900">My Leads</h1>
          </div>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-4">
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
        {!loading && leads.length > 0 && (
          <div className="overflow-x-auto rounded border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Name</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Rating</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Stage</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Source</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-900">{lead.name}</td>
                    <td className="px-4 py-2">{Number(lead.rating).toFixed(1)}</td>
                    <td className="px-4 py-2 capitalize">{lead.stage.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {[lead.source_specialty, lead.source_city, lead.source_region].filter(Boolean).join(', ') || '—'}
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
      </div>
    </div>
  )
}
