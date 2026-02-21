import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  addNote,
  addFeatureOccurrence,
  createMeeting,
  fetchBenchmark,
  fetchReviewInsights,
  fetchReviewSummary,
  getLead,
  listFeatureOccurrences,
  listMeetings,
  updateLeadStage,
  type BenchmarkResponse,
  type LeadDetail,
} from '../api/client'
import type { FeatureOccurrence, ReviewInsightsResponse } from '../types/leads'
import { sortReviews, type ReviewSortOption } from '../components/ReviewsModal'
import { PrecallBriefModal } from '../components/PrecallBriefModal'

const STAGES = ['new', 'contacted', 'meeting_booked', 'qualified', 'nurtured']
type TabKey = 'overview' | 'features'

export function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [lead, setLead] = useState<LeadDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [noteContent, setNoteContent] = useState('')
  const [submittingNote, setSubmittingNote] = useState(false)
  const [reviewSort, setReviewSort] = useState<ReviewSortOption>('latest')
  const [reviewsSummaryLocal, setReviewsSummaryLocal] = useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [leadInsights, setLeadInsights] = useState<ReviewInsightsResponse | null>(null)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [benchmark, setBenchmark] = useState<BenchmarkResponse | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [featureOccurrences, setFeatureOccurrences] = useState<FeatureOccurrence[]>([])
  const [meetings, setMeetings] = useState<{ id: number; lead_id: number; title?: string | null; transcript_or_summary: string; created_at?: string }[]>([])
  const [featuresLoading, setFeaturesLoading] = useState(false)
  const [addFeatureOpen, setAddFeatureOpen] = useState(false)
  const [addFeatureName, setAddFeatureName] = useState('')
  const [addFeatureSubmitting, setAddFeatureSubmitting] = useState(false)
  const [addMeetingOpen, setAddMeetingOpen] = useState(false)
  const [addMeetingTitle, setAddMeetingTitle] = useState('')
  const [addMeetingText, setAddMeetingText] = useState('')
  const [addMeetingSubmitting, setAddMeetingSubmitting] = useState(false)
  const [expandedMeetingId, setExpandedMeetingId] = useState<number | null>(null)
  const [precallBriefOpen, setPrecallBriefOpen] = useState(false)

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

  useEffect(() => {
    if (!lead?.place_id || !lead?.source_city || !lead?.source_specialty) return
    let cancelled = false
    fetchBenchmark(lead.source_city, lead.source_specialty, lead.place_id, lead.source_region ?? undefined)
      .then((b) => { if (!cancelled) setBenchmark(b) })
      .catch(() => { if (!cancelled) setBenchmark(null) })
    return () => { cancelled = true }
  }, [lead?.place_id, lead?.source_city, lead?.source_specialty, lead?.source_region])

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

  const reviews = lead?.reviews ?? []
  const hasReviewText = reviews.length > 0 && reviews.some((r) => (r.text ?? '').trim())
  const sortedReviews = useMemo(() => sortReviews(reviews, reviewSort), [reviews, reviewSort])
  const displaySummary = (lead as { reviews_summary?: string | null })?.reviews_summary ?? reviewsSummaryLocal

  async function handleGenerateSummary() {
    if (!lead || !hasReviewText) return
    setSummaryLoading(true)
    try {
      const data = await fetchReviewSummary(lead)
      setReviewsSummaryLocal(data.reviews_summary)
    } finally {
      setSummaryLoading(false)
    }
  }

  async function handleLoadInsights() {
    if (!lead || !hasReviewText) return
    setInsightsLoading(true)
    try {
      const data = await fetchReviewInsights(lead)
      setLeadInsights(data)
    } finally {
      setInsightsLoading(false)
    }
  }

  const loadFeaturesData = useCallback(async () => {
    if (!lead) return
    setFeaturesLoading(true)
    try {
      const [occRes, meetRes] = await Promise.all([listFeatureOccurrences(lead.id), listMeetings(lead.id)])
      setFeatureOccurrences(occRes.occurrences)
      setMeetings(meetRes.meetings)
    } finally {
      setFeaturesLoading(false)
    }
  }, [lead?.id])

  useEffect(() => {
    if (lead && activeTab === 'features') loadFeaturesData()
  }, [lead, activeTab, loadFeaturesData])

  async function handleAddFeature(e: React.FormEvent) {
    e.preventDefault()
    if (!lead || !addFeatureName.trim()) return
    setAddFeatureSubmitting(true)
    try {
      await addFeatureOccurrence(lead.id, { canonical_name: addFeatureName.trim(), source_type: 'manual' })
      setAddFeatureName('')
      setAddFeatureOpen(false)
      await loadFeaturesData()
    } finally {
      setAddFeatureSubmitting(false)
    }
  }

  async function handleAddMeeting(e: React.FormEvent) {
    e.preventDefault()
    if (!lead || !addMeetingText.trim()) return
    setAddMeetingSubmitting(true)
    try {
      await createMeeting(lead.id, { title: addMeetingTitle.trim() || undefined, transcript_or_summary: addMeetingText.trim() })
      setAddMeetingTitle('')
      setAddMeetingText('')
      setAddMeetingOpen(false)
      await loadFeaturesData()
    } finally {
      setAddMeetingSubmitting(false)
    }
  }

  if (loading || !id) return <div className="p-6">Loading…</div>
  if (!lead) return <div className="p-6 text-red-600">Lead not found.</div>

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center gap-4">
          <Link to="/my-leads" className="text-[#2563EB] hover:underline">Leads</Link>
          <h1 className="text-2xl font-bold text-slate-900">{lead.name}</h1>
        </div>
        <div className="mb-4 flex gap-2 border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab === 'overview' ? 'border-[#2563EB] text-[#2563EB]' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('features')}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab === 'features' ? 'border-[#2563EB] text-[#2563EB]' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
          >
            Features
          </button>
        </div>
        {activeTab === 'overview' && (
        <>
        <div className="space-y-4 rounded border border-gray-200 bg-white p-4">
          {benchmark && (
            <p className="text-sm font-medium text-[#2563EB]">
              Rank in {lead.source_city}: Top {Math.round(100 - benchmark.percentile)}% of {lead.source_specialty} · Rank {benchmark.rank} of {benchmark.total_in_market}
            </p>
          )}
          <p><span className="font-medium text-gray-700">Rating:</span> {Number(lead.rating).toFixed(1)}</p>
          <p><span className="font-medium text-gray-700">Review count:</span> {lead.review_count}</p>
          {lead.estimated_monthly_patients != null && (
            <p><span className="font-medium text-gray-700">Est. monthly patients:</span> {lead.estimated_monthly_patients.toLocaleString()}</p>
          )}
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
          <button
            type="button"
            onClick={() => setPrecallBriefOpen(true)}
            className="rounded bg-slate-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            Pre-call brief
          </button>
          {(lead.enrichment_summary || lead.outreach_suggestion) && (
            <div className="relative overflow-hidden rounded-xl border border-white/40 bg-white/60 p-4 shadow-sm backdrop-blur-md">
              <span className="inline-block rounded-full bg-[#2563EB]/10 px-2 py-0.5 text-xs font-medium text-[#2563EB]">
                AI-Generated
              </span>
              {lead.enrichment_summary && (
                <p className="mt-2 text-sm text-slate-700"><span className="font-medium text-slate-800">Summary:</span> {lead.enrichment_summary}</p>
              )}
              {lead.outreach_suggestion && (
                <p className="mt-1 text-sm text-slate-700"><span className="font-medium text-slate-800">Outreach:</span> {lead.outreach_suggestion}</p>
              )}
            </div>
          )}
        </div>
        <div className="mt-6 rounded border border-gray-200 bg-white p-4">
          <h2 className="mb-2 font-semibold text-gray-900">Reviews and ratings</h2>
          <p className="text-sm text-gray-600 mb-3">
            {Number(lead.rating).toFixed(1)} · {lead.review_count} reviews
          </p>
          {hasReviewText && (
            <div className="mb-3">
              <h3 className="text-sm font-medium text-slate-800 mb-1">Review summary</h3>
              {displaySummary ? (
                <div className="relative overflow-hidden rounded-xl border border-white/40 bg-white/60 p-4 shadow-sm backdrop-blur-md">
                  <span className="inline-block rounded-full bg-[#2563EB]/10 px-2 py-0.5 text-xs font-medium text-[#2563EB]">
                    AI-Generated
                  </span>
                  <p className="mt-2 text-sm text-slate-700">{displaySummary}</p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleGenerateSummary}
                  disabled={summaryLoading}
                  className="text-sm text-[#2563EB] hover:underline disabled:opacity-50"
                >
                  {summaryLoading ? 'Generating…' : 'Generate summary (Gemini)'}
                </button>
              )}
            </div>
          )}
          {(lead.reviews?.length ?? 0) === 0 ? (
            <p className="text-gray-500 text-sm">No review text available.</p>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <label htmlFor="lead-review-sort" className="text-sm font-medium text-gray-700">Sort by</label>
                <select
                  id="lead-review-sort"
                  value={reviewSort}
                  onChange={(e) => setReviewSort(e.target.value as ReviewSortOption)}
                  className="rounded border border-gray-300 text-sm px-2 py-1"
                >
                  <option value="latest">Latest (date)</option>
                  <option value="oldest">Oldest (date)</option>
                  <option value="highest_rating">Highest rating</option>
                  <option value="lowest_rating">Lowest rating</option>
                </select>
              </div>
              <ul className="space-y-3 max-h-64 overflow-y-auto rounded border border-gray-100 bg-gray-50 p-2">
                {sortedReviews.map((r, idx) => (
                  <li key={idx} className="border-b border-gray-200 last:border-0 pb-3 last:pb-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {r.rating != null && (
                        <span className="text-amber-600 text-sm font-medium">★ {Number(r.rating).toFixed(1)}</span>
                      )}
                      {r.relative_time_description && (
                        <span className="text-xs text-gray-500">{r.relative_time_description}</span>
                      )}
                    </div>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap">{r.text?.trim() || '—'}</p>
                    {((r.flagged_keywords)?.length ?? 0) > 0 && (
                      <p className="text-xs text-amber-700 mt-1">Flagged: {(r.flagged_keywords ?? []).join(', ')}</p>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        {hasReviewText && (
          <div className="mt-6 rounded border border-gray-200 bg-white p-4">
            <h2 className="mb-2 font-semibold text-gray-900">Review insights</h2>
            <p className="text-xs text-gray-500 mb-2">Based on the {lead.reviews?.length ?? 0} reviews we have for this clinic.</p>
            {!leadInsights ? (
              <button
                type="button"
                onClick={handleLoadInsights}
                disabled={insightsLoading}
                className="text-sm text-blue-600 hover:underline disabled:opacity-50"
              >
                {insightsLoading ? 'Loading…' : 'Load insights'}
              </button>
            ) : (
              <div className="space-y-2 text-sm">
                <p className="text-gray-700">
                  Negative reviews (low rating): <strong>{leadInsights.negative_review_count}</strong> of <strong>{leadInsights.total_shown}</strong>
                </p>
                <p className="text-gray-700">
                  Mentions of doctors/complaints: <strong>{leadInsights.complaints_about_doctors_count}</strong>
                </p>
                {leadInsights.top_10_improvements.length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium text-gray-800 mb-1">Top 10 things to improve</p>
                    <ol className="list-decimal list-inside space-y-0.5 text-gray-700">
                      {leadInsights.top_10_improvements.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
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
        <PrecallBriefModal
          open={precallBriefOpen}
          onClose={() => setPrecallBriefOpen(false)}
          leadName={lead.name}
          painPoints={lead.top_complaints ?? []}
          praise={lead.top_strengths ?? []}
          hook={lead.outreach_suggestion ?? lead.enrichment_summary ?? ''}
        />
        </>
        )}
        {activeTab === 'features' && (
          <div className="space-y-4">
            <div className="rounded border border-gray-200 bg-white p-4">
              <h2 className="mb-2 font-semibold text-gray-900">CellAssist features</h2>
              <p className="text-sm text-gray-600 mb-3">Product feature requests and pain points for this clinic (from reviews, meetings, or manual).</p>
              <div className="mb-3 flex gap-2">
                <button type="button" onClick={() => setAddFeatureOpen(true)} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">
                  Add feature
                </button>
                <button type="button" onClick={() => setAddMeetingOpen(true)} className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">
                  Add meeting
                </button>
              </div>
              {featuresLoading ? (
                <p className="text-sm text-gray-500">Loading…</p>
              ) : featureOccurrences.length === 0 ? (
                <p className="text-sm text-gray-500">No features recorded yet. Add one manually or add a meeting to extract from transcript/summary.</p>
              ) : (
                <ul className="space-y-2">
                  {featureOccurrences.map((occ) => (
                    <li key={occ.id} className="rounded bg-gray-50 px-3 py-2 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-gray-800">{occ.feature_name ?? '—'}</span>
                        <span className="rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-600 shrink-0">{occ.source_type}</span>
                      </div>
                      {occ.raw_phrase && <p className="mt-1 text-gray-500 text-xs">{occ.raw_phrase}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded border border-gray-200 bg-white p-4">
              <h2 className="mb-2 font-semibold text-gray-900">Meetings</h2>
              {meetings.length === 0 ? (
                <p className="text-sm text-gray-500">No meetings yet. Use “Add meeting” to paste a transcript or summary and extract features.</p>
              ) : (
                <ul className="space-y-2">
                  {meetings.map((m) => (
                    <li key={m.id} className="rounded border border-gray-100 bg-gray-50">
                      <button
                        type="button"
                        onClick={() => setExpandedMeetingId(expandedMeetingId === m.id ? null : m.id)}
                        className="w-full px-3 py-2 text-left text-sm font-medium text-gray-800 flex justify-between items-center"
                      >
                        {m.title || `Meeting ${m.id}`}
                        <span className="text-xs text-gray-500">{m.created_at}</span>
                      </button>
                      {expandedMeetingId === m.id && (
                        <div className="px-3 pb-3 text-sm text-gray-600 whitespace-pre-wrap border-t border-gray-100 pt-2">{m.transcript_or_summary}</div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
        {addFeatureOpen && (
          <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/50" onClick={() => !addFeatureSubmitting && setAddFeatureOpen(false)}>
            <div className="rounded-lg bg-white p-4 shadow-xl max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-semibold text-gray-900 mb-2">Add feature</h3>
              <form onSubmit={handleAddFeature} className="flex flex-col gap-2">
                <input
                  type="text"
                  value={addFeatureName}
                  onChange={(e) => setAddFeatureName(e.target.value)}
                  placeholder="Feature name (e.g. Call handling)"
                  className="rounded border border-gray-300 px-3 py-2"
                />
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setAddFeatureOpen(false)} className="rounded border border-gray-300 px-3 py-1.5 text-sm">Cancel</button>
                  <button type="submit" disabled={addFeatureSubmitting || !addFeatureName.trim()} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50">Add</button>
                </div>
              </form>
            </div>
          </div>
        )}
        {addMeetingOpen && (
          <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/50" onClick={() => !addMeetingSubmitting && setAddMeetingOpen(false)}>
            <div className="rounded-lg bg-white p-4 shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-semibold text-gray-900 mb-2">Add meeting</h3>
              <p className="text-xs text-gray-500 mb-2">Paste transcript or summary. We’ll extract product feature / pain point phrases and add them to this lead.</p>
              <form onSubmit={handleAddMeeting} className="flex flex-col gap-2">
                <input
                  type="text"
                  value={addMeetingTitle}
                  onChange={(e) => setAddMeetingTitle(e.target.value)}
                  placeholder="Title (optional)"
                  className="rounded border border-gray-300 px-3 py-2"
                />
                <textarea
                  value={addMeetingText}
                  onChange={(e) => setAddMeetingText(e.target.value)}
                  placeholder="Transcript or summary…"
                  rows={6}
                  className="rounded border border-gray-300 px-3 py-2"
                />
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setAddMeetingOpen(false)} className="rounded border border-gray-300 px-3 py-1.5 text-sm">Cancel</button>
                  <button type="submit" disabled={addMeetingSubmitting || !addMeetingText.trim()} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50">{addMeetingSubmitting ? 'Adding…' : 'Add meeting'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
