import { useEffect, useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
} from 'recharts'
import type { HotLead, ReviewChatScope, ReviewInsightsResponse, ReviewWithFlags } from '../types/leads'
import { fetchReviewChat, fetchReviewInsights, fetchReviewSummary } from '../api/client'

const REVIEW_EXPAND_LEN = 120

const SUGGESTED_QUESTIONS = [
  'How many patients gave bad reviews?',
  'How many complained about doctors?',
  'What are the top 10 things to improve?',
  'Any wait time issues?',
  'What do patients praise?',
  'Summarize the main complaints.',
  'Is the front desk or phone handling mentioned?',
]

/** Backend returns these when GEMINI_API_KEY is not set; we show a friendly message instead. */
const GEMINI_NOT_CONFIGURED_HINT =
  'AI features are not available. Ask your admin to set GEMINI_API_KEY on the server.'

export type ReviewSortOption = 'latest' | 'oldest' | 'highest_rating' | 'lowest_rating'

export function sortReviews(reviews: ReviewWithFlags[], sortBy: ReviewSortOption): ReviewWithFlags[] {
  const arr = [...reviews]
  switch (sortBy) {
    case 'latest':
      return arr.sort((a, b) => (b.time ?? 0) - (a.time ?? 0))
    case 'oldest':
      return arr.sort((a, b) => (a.time ?? 0) - (b.time ?? 0))
    case 'highest_rating':
      return arr.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    case 'lowest_rating':
      return arr.sort((a, b) => (a.rating ?? 0) - (b.rating ?? 0))
    default:
      return arr
  }
}

function ReviewItem({
  text,
  flagged,
  rating,
  relativeTime,
}: {
  text: string
  flagged: string[]
  rating?: number | null
  relativeTime?: string | null
}) {
  const [open, setOpen] = useState(false)
  const t = (text ?? '').trim()
  const short = t.length <= REVIEW_EXPAND_LEN
  const display = short ? t : open ? t : t.slice(0, REVIEW_EXPAND_LEN) + '…'
  return (
    <li className="border-b border-gray-200 last:border-0 pb-3 last:pb-0">
      <div className="flex items-center gap-2 flex-wrap">
        {rating != null && (
          <span className="text-amber-600 text-sm font-medium">★ {Number(rating).toFixed(1)}</span>
        )}
        {relativeTime && (
          <span className="text-xs text-gray-500">{relativeTime}</span>
        )}
      </div>
      <p className="text-gray-700 whitespace-pre-wrap">{display}</p>
      {!short && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="text-blue-600 text-xs mt-1 hover:underline"
        >
          {open ? 'Show less' : 'Show more'}
        </button>
      )}
      {flagged.length > 0 && (
        <p className="text-xs text-amber-700 mt-1">Flagged: {flagged.join(', ')}</p>
      )}
    </li>
  )
}

/** Split summary into segments so negative keywords can be highlighted. */
function segmentForHighlight(text: string, keywords: string[]): Array<{ type: 'normal' | 'highlight'; text: string }> {
  if (!text || !keywords.length) return [{ type: 'normal', text }]
  const escaped = keywords
    .filter((k) => k.length > 0)
    .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .sort((a, b) => b.length - a.length)
  if (escaped.length === 0) return [{ type: 'normal', text }]
  const re = new RegExp(`(${escaped.join('|')})`, 'gi')
  const segments: Array<{ type: 'normal' | 'highlight'; text: string }> = []
  let lastIndex = 0
  let m
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) segments.push({ type: 'normal', text: text.slice(lastIndex, m.index) })
    segments.push({ type: 'highlight', text: m[1] })
    lastIndex = re.lastIndex
  }
  if (lastIndex < text.length) segments.push({ type: 'normal', text: text.slice(lastIndex) })
  return segments.length ? segments : [{ type: 'normal', text }]
}

type TabId = 'summary' | 'reviews' | 'insights'

interface ReviewsModalProps {
  lead: HotLead | null
  open: boolean
  onClose: () => void
  onSummaryGenerated?: (summary: string) => void
}

export function ReviewsModal({ lead, open, onClose, onSummaryGenerated }: ReviewsModalProps) {
  const [tab, setTab] = useState<TabId>('summary')
  const [sortBy, setSortBy] = useState<ReviewSortOption>('latest')
  const [summaryLocal, setSummaryLocal] = useState<string | null>(null)
  const [summaryNegativeKeywords, setSummaryNegativeKeywords] = useState<string[]>([])
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [questionInput, setQuestionInput] = useState('')
  const [questionSummary, setQuestionSummary] = useState<string | null>(null)
  const [questionLoading, setQuestionLoading] = useState(false)
  const [insights, setInsights] = useState<ReviewInsightsResponse | null>(null)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [insightsError, setInsightsError] = useState<string | null>(null)
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [askScope, setAskScope] = useState<ReviewChatScope>('all')
  const [lastScopeUsed, setLastScopeUsed] = useState<string | null>(null)
  const [lastReviewCountUsed, setLastReviewCountUsed] = useState<number | null>(null)

  const reviews = lead?.reviews ?? []
  const sortedReviews = useMemo(() => sortReviews(reviews, sortBy), [reviews, sortBy])
  const displaySummary = lead?.reviews_summary ?? summaryLocal
  const hasReviews = reviews.length > 0 && reviews.some((r) => (r.text ?? '').trim())
  const n = reviews.length

  // Reset insights and summary extras when lead changes
  useEffect(() => {
    setInsights(null)
    setInsightsError(null)
    setMessages([])
    setChatInput('')
    setSummaryNegativeKeywords([])
    setQuestionSummary(null)
    setQuestionInput('')
    setLastScopeUsed(null)
    setLastReviewCountUsed(null)
  }, [lead?.place_id])

  // Load insights when switching to insights tab and we have a lead with reviews
  useEffect(() => {
    if (tab !== 'insights' || !lead || !hasReviews) return
    if (insights != null) return
    setInsightsLoading(true)
    setInsightsError(null)
    fetchReviewInsights(lead)
      .then(setInsights)
      .catch((e) => setInsightsError(e instanceof Error ? e.message : 'Failed to load insights'))
      .finally(() => setInsightsLoading(false))
  }, [tab, lead, hasReviews, insights])

  const ratingDistribution = useMemo(() => {
    const count: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    for (const r of reviews) {
      if (r.rating != null && r.rating >= 1 && r.rating <= 5) {
        const star = Math.round(r.rating)
        count[star] = (count[star] ?? 0) + 1
      }
    }
    return [1, 2, 3, 4, 5].map((star) => ({ star: `${star}★`, count: count[star] ?? 0 }))
  }, [reviews])

  const negativePositiveData = useMemo(() => {
    let negative = 0
    let positive = 0
    for (const r of reviews) {
      if (r.rating != null) {
        if (r.rating < 3) negative += 1
        else positive += 1
      }
    }
    return [
      { name: 'Negative (<3★)', value: negative, color: 'url(#coralGradient)' },
      { name: 'Positive (≥3★)', value: positive, color: 'url(#emeraldGradient)' },
    ].filter((d) => d.value > 0)
  }, [reviews])

  const sentimentTotals = useMemo(() => {
    let negative = 0
    let positive = 0
    for (const r of reviews) {
      if (r.rating != null) {
        if (r.rating < 3) negative += 1
        else positive += 1
      }
    }
    const total = negative + positive
    const pct = total > 0 ? Math.round((positive / total) * 100) : 0
    return { total, positive, negative, pct }
  }, [reviews])

  async function handleGenerateSummary() {
    if (!lead || !hasReviews) return
    setSummaryLoading(true)
    try {
      const data = await fetchReviewSummary(lead)
      setSummaryLocal(data.reviews_summary)
      setSummaryNegativeKeywords(data.negative_keywords ?? [])
      setQuestionSummary(null)
      onSummaryGenerated?.(data.reviews_summary)
    } finally {
      setSummaryLoading(false)
    }
  }

  async function handleSummarizeWithQuestion() {
    if (!lead || !hasReviews || !questionInput.trim()) return
    const q = questionInput.trim()
    setQuestionLoading(true)
    try {
      const data = await fetchReviewSummary(lead, q)
      setQuestionSummary(data.question_summary ?? null)
      if (data.reviews_summary) setSummaryLocal(data.reviews_summary)
      if (data.negative_keywords?.length) setSummaryNegativeKeywords(data.negative_keywords)
    } finally {
      setQuestionLoading(false)
    }
  }

  async function handleSendQuestion(question: string) {
    if (!lead || !question.trim()) return
    const q = question.trim()
    setChatInput('')
    setMessages((m) => [...m, { role: 'user', content: q }])
    setChatLoading(true)
    setLastScopeUsed(null)
    setLastReviewCountUsed(null)
    try {
      const res = await fetchReviewChat(lead, q, askScope)
      setMessages((m) => [...m, { role: 'assistant', content: res.answer }])
      if (res.scope_used != null) setLastScopeUsed(res.scope_used)
      if (res.review_count_used != null) setLastReviewCountUsed(res.review_count_used)
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', content: e instanceof Error ? e.message : 'Failed to get answer.' }])
    } finally {
      setChatLoading(false)
    }
  }

  function handleSuggestedClick(question: string) {
    setChatInput(question)
    handleSendQuestion(question)
  }

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reviews-modal-title"
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div>
            <h2 id="reviews-modal-title" className="text-lg font-semibold text-gray-900">
              {lead?.name ?? 'Reviews'}
            </h2>
            <p className="text-sm text-gray-600 mt-0.5">
              {lead != null
                ? `${Number(lead.rating).toFixed(1)} · ${lead.review_count ?? 0} reviews`
                : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex border-b border-gray-200 px-2">
          {(['summary', 'reviews', 'insights'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                tab === t
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {t === 'summary' ? 'Summary' : t === 'reviews' ? 'Reviews' : 'Ask & Insights'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0">
          {tab === 'summary' && (
            <>
              {hasReviews ? (
                <div className="mb-4 space-y-4">
                  <h3 className="text-sm font-semibold text-slate-800 mb-2">Review summary</h3>
                  {displaySummary && !displaySummary.includes('not configured') ? (
                    <div className="relative overflow-hidden rounded-xl border border-white/40 bg-white/60 p-4 shadow-sm backdrop-blur-md">
                      <span className="inline-block rounded-full bg-[#2563EB]/10 px-2 py-0.5 text-xs font-medium text-[#2563EB]">
                        AI-Generated
                      </span>
                      <p className="mt-2 text-sm text-slate-700">
                        {summaryNegativeKeywords.length > 0
                          ? segmentForHighlight(displaySummary, summaryNegativeKeywords).map((seg, i) =>
                              seg.type === 'highlight' ? (
                                <span
                                  key={i}
                                  className="underline decoration-amber-500 decoration-2 text-amber-800 font-medium"
                                >
                                  {seg.text}
                                </span>
                              ) : (
                                <span key={i}>{seg.text}</span>
                              )
                            )
                          : displaySummary}
                      </p>
                    </div>
                  ) : displaySummary && displaySummary.includes('not configured') ? (
                    <div className="text-sm text-amber-800 bg-amber-50 rounded-xl border border-amber-200/60 p-3 backdrop-blur-sm">
                      <p>{GEMINI_NOT_CONFIGURED_HINT}</p>
                      <button
                        type="button"
                        onClick={handleGenerateSummary}
                        disabled={summaryLoading}
                        className="mt-2 text-[#2563EB] hover:underline disabled:opacity-50"
                      >
                        {summaryLoading ? 'Generating…' : 'Try again'}
                      </button>
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

                  {displaySummary && !displaySummary.includes('not configured') && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                      <label htmlFor="summary-question" className="text-sm font-medium text-slate-700">
                        Summarize with a question
                      </label>
                      <div className="mt-2 flex gap-2">
                        <input
                          id="summary-question"
                          type="text"
                          value={questionInput}
                          onChange={(e) => setQuestionInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSummarizeWithQuestion()}
                          placeholder="e.g. What do patients say about wait times?"
                          className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm"
                        />
                        <button
                          type="button"
                          onClick={handleSummarizeWithQuestion}
                          disabled={questionLoading || !questionInput.trim()}
                          className="rounded bg-[#2563EB] px-3 py-2 text-sm font-medium text-white hover:bg-[#1d4ed8] disabled:opacity-50"
                        >
                          {questionLoading ? '…' : 'Ask'}
                        </button>
                      </div>
                      {questionSummary != null && (
                        <p className="mt-2 text-sm text-slate-700 border-t border-slate-200 pt-2">
                          <span className="font-medium text-slate-600">Answer: </span>
                          {questionSummary}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-slate-500">No review text available.</p>
              )}
            </>
          )}

          {tab === 'reviews' && (
            <>
              {reviews.length === 0 ? (
                <p className="text-gray-500">No review text available.</p>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <label htmlFor="review-sort" className="text-sm font-medium text-gray-700">Sort by</label>
                    <select
                      id="review-sort"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as ReviewSortOption)}
                      className="rounded border border-gray-300 text-sm px-2 py-1"
                    >
                      <option value="latest">Latest (date)</option>
                      <option value="oldest">Oldest (date)</option>
                      <option value="highest_rating">Highest rating</option>
                      <option value="lowest_rating">Lowest rating</option>
                    </select>
                  </div>
                  <ul className="space-y-3">
                    {sortedReviews.map((r, idx) => (
                      <ReviewItem
                        key={idx}
                        text={r.text}
                        flagged={r.flagged_keywords ?? []}
                        rating={r.rating}
                        relativeTime={r.relative_time_description}
                      />
                    ))}
                  </ul>
                </>
              )}
            </>
          )}

          {tab === 'insights' && (
            <>
              {!hasReviews ? (
                <p className="text-gray-500">No review data.</p>
              ) : (
                <>
                  <p className="text-xs text-gray-500 mb-3">Based on the {n} reviews we have for this clinic (from Google).</p>

                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-gray-800 mb-2">Insights</h3>
                    {insightsLoading ? (
                      <p className="text-sm text-gray-500">Loading insights…</p>
                    ) : insightsError ? (
                      <p className="text-sm text-red-600">{insightsError}</p>
                    ) : insights ? (
                      <div className="space-y-2 text-sm">
                        <p className="text-gray-700">
                          Negative reviews (low rating): <strong>{insights.negative_review_count}</strong> of <strong>{insights.total_shown}</strong>
                        </p>
                        <p className="text-gray-700">
                          Mentions of doctors/complaints: <strong>{insights.complaints_about_doctors_count}</strong>
                        </p>
                        {insights.top_10_improvements.length > 0 && (
                          <div className="mt-2">
                            <p className="font-medium text-gray-800 mb-1">Top 10 things to improve</p>
                            <ol className="list-decimal list-inside space-y-0.5 text-gray-700">
                              {insights.top_10_improvements.map((item, i) => (
                                <li key={i}>{item}</li>
                              ))}
                            </ol>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>

                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-slate-800 mb-2">Review Distribution</h3>
                    {ratingDistribution.every((d) => d.count === 0) ? (
                      <p className="text-sm text-slate-500 py-2">No per-review ratings available for this clinic.</p>
                    ) : (
                      <div className="h-32 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={ratingDistribution} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                            <XAxis dataKey="star" tick={{ fontSize: 11 }} />
                            <YAxis width={20} tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar
                              dataKey="count"
                              name="Reviews"
                              radius={[4, 4, 0, 0]}
                              fill="#2563EB"
                            >
                              {ratingDistribution.map((entry, i) => {
                                const maxCount = Math.max(...ratingDistribution.map((d) => d.count), 1)
                                const intensity = entry.count === 0 ? 0.2 : 0.4 + (0.6 * entry.count) / maxCount
                                return (
                                  <Cell
                                    key={i}
                                    fill={`rgba(37, 99, 235, ${intensity})`}
                                  />
                                )
                              })}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-slate-800 mb-2">Sentiment</h3>
                    {negativePositiveData.length > 0 ? (
                      <div className="relative h-44 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <defs>
                              <linearGradient id="emeraldGradient" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#a7f3d0" />
                                <stop offset="100%" stopColor="#10b981" />
                              </linearGradient>
                              <linearGradient id="coralGradient" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#fed7aa" />
                                <stop offset="100%" stopColor="#f97316" />
                              </linearGradient>
                            </defs>
                            <Pie
                              data={negativePositiveData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={44}
                              outerRadius={58}
                              stroke="rgba(255,255,255,0.8)"
                              strokeWidth={2}
                            >
                              {negativePositiveData.map((entry, i) => (
                                <Cell key={i} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="text-center">
                            <p className="text-lg font-bold tabular-nums text-slate-800">{sentimentTotals.total}</p>
                            <p className="text-xs text-slate-500">reviews</p>
                            <p className="text-sm font-semibold text-[#10B981]">{sentimentTotals.pct}% positive</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">No per-review ratings to show.</p>
                    )}
                  </div>

                  <div className="mb-3">
                    <h3 className="text-sm font-semibold text-gray-800 mb-2">Suggested questions</h3>
                    <div className="flex flex-wrap gap-2">
                      {SUGGESTED_QUESTIONS.map((q, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSuggestedClick(q)}
                          disabled={chatLoading}
                          className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-3">
                    <h3 className="text-sm font-semibold text-gray-800 mb-2">Scope</h3>
                    <p className="text-xs text-gray-500 mb-1">Answer from which reviews:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(
                        [
                          ['all', 'All reviews'],
                          ['top_20_negative', 'Top 20 negative'],
                          ['top_50_negative', 'Top 50 negative'],
                          ['top_20_positive', 'Top 20 positive'],
                          ['top_50_positive', 'Top 50 positive'],
                        ] as const
                      ).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setAskScope(value)}
                          disabled={chatLoading}
                          className={`rounded-full px-3 py-1 text-xs font-medium disabled:opacity-50 ${
                            askScope === value
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    {lastScopeUsed != null && lastReviewCountUsed != null && (
                      <p className="mt-1.5 text-xs text-slate-500">
                        Answering from <strong>{lastReviewCountUsed}</strong> reviews ({lastScopeUsed.replace(/_/g, ' ')}).
                      </p>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 mb-2">Ask about reviews</h3>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendQuestion(chatInput)}
                        placeholder="Ask a question…"
                        className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
                        disabled={chatLoading}
                      />
                      <button
                        type="button"
                        onClick={() => handleSendQuestion(chatInput)}
                        disabled={chatLoading || !chatInput.trim()}
                        className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {chatLoading ? '…' : 'Ask'}
                      </button>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto rounded border border-gray-100 bg-gray-50 p-2">
                      {messages.length === 0 && (
                        <p className="text-xs text-gray-500">Ask a question or click a suggestion above.</p>
                      )}
                      {messages.map((msg, i) => {
                        const isUser = msg.role === 'user'
                        // Avoid double "You: " if user pasted a previous message
                        const userLabel = 'You: '
                        const displayContent = isUser
                          ? (msg.content.startsWith(userLabel) ? msg.content : userLabel + msg.content)
                          : msg.content
                        const isNotConfigured = !isUser && msg.content.includes('not configured')
                        return (
                          <div
                            key={i}
                            className={`text-sm ${isUser ? 'text-right' : 'text-left'}`}
                          >
                            <span className={isUser ? 'text-blue-700' : 'text-gray-700'}>
                              {isUser ? '' : 'Answer: '}
                            </span>
                            <span className="whitespace-pre-wrap">
                              {isUser ? displayContent : (isNotConfigured ? GEMINI_NOT_CONFIGURED_HINT : msg.content)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
