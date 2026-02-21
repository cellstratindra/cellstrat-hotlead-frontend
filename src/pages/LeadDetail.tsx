import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { UserButton } from '@clerk/clerk-react'
import { addNote, getLead, updateLeadStage, type LeadDetail } from '../api/client'

const STAGES = ['new', 'contacted', 'meeting_booked', 'qualified', 'nurtured']

export function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [lead, setLead] = useState<LeadDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [noteContent, setNoteContent] = useState('')
  const [submittingNote, setSubmittingNote] = useState(false)

  useEffect(() => {
    if (!id) return
    const numId = parseInt(id, 10)
    if (Number.isNaN(numId)) return
    let cancelled = false
    getLead(numId)
      .then((data) => { if (!cancelled) setLead(data) })
      .catch(() => { if (!cancelled) setLead(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault()
    if (!lead || !noteContent.trim()) return
    setSubmittingNote(true)
    try {
      await addNote(lead.id, noteContent.trim())
      const updated = await getLead(lead.id)
      setLead(updated)
      setNoteContent('')
    } finally {
      setSubmittingNote(false)
    }
  }

  async function handleStageChange(newStage: string) {
    if (!lead) return
    await updateLeadStage(lead.id, newStage)
    const updated = await getLead(lead.id)
    setLead(updated)
  }

  if (loading || !id) return <div className="p-6">Loading…</div>
  if (!lead) return <div className="p-6 text-red-600">Lead not found.</div>

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/my-leads" className="text-blue-600 hover:underline">My Leads</Link>
            <h1 className="text-2xl font-bold text-gray-900">{lead.name}</h1>
          </div>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
        <div className="space-y-4 rounded border border-gray-200 bg-white p-4">
          <p><span className="font-medium text-gray-700">Rating:</span> {Number(lead.rating).toFixed(1)}</p>
          <p><span className="font-medium text-gray-700">Review count:</span> {lead.review_count}</p>
          <p><span className="font-medium text-gray-700">Phone:</span> {lead.phone || '—'}</p>
          <p><span className="font-medium text-gray-700">Stage:</span>
            <select
              value={lead.stage}
              onChange={(e) => handleStageChange(e.target.value)}
              className="ml-2 rounded border border-gray-300 px-2 py-1 text-sm"
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </p>
          {lead.enrichment_summary && (
            <p><span className="font-medium text-gray-700">AI Summary:</span> {lead.enrichment_summary}</p>
          )}
          {lead.outreach_suggestion && (
            <p><span className="font-medium text-gray-700">Outreach:</span> {lead.outreach_suggestion}</p>
          )}
        </div>
        <div className="mt-6 rounded border border-gray-200 bg-white p-4">
          <h2 className="mb-2 font-semibold text-gray-900">Stage history</h2>
          <ul className="list-inside list-disc text-sm text-gray-600">
            {lead.stage_history.length === 0 && <li>No history yet</li>}
            {lead.stage_history.map((h, i) => (
              <li key={i}>{h.stage} — {h.created_at}</li>
            ))}
          </ul>
        </div>
        <div className="mt-6 rounded border border-gray-200 bg-white p-4">
          <h2 className="mb-2 font-semibold text-gray-900">Notes</h2>
          <form onSubmit={handleAddNote} className="mb-4 flex gap-2">
            <input
              type="text"
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Add a note…"
              className="flex-1 rounded border border-gray-300 px-3 py-2"
            />
            <button type="submit" disabled={submittingNote || !noteContent.trim()} className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50">
              Add
            </button>
          </form>
          <ul className="space-y-2 text-sm">
            {lead.notes.length === 0 && <li className="text-gray-500">No notes yet</li>}
            {lead.notes.map((n) => (
              <li key={n.id} className="rounded bg-gray-50 p-2">
                <span className="text-gray-600">{n.content}</span>
                <span className="ml-2 text-gray-400">{n.created_at}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
