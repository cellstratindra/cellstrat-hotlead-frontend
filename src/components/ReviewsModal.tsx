import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Sparkles, X, Send, ChevronDown } from 'lucide-react'
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
const SUMMARY_PREVIEW_LEN = 220

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
  const isPositive = rating != null && rating >= 3
  const sentimentBarColor = rating == null ? 'bg-slate-200' : isPositive ? 'bg-emerald-500' : 'bg-red-500'
  return (
    <article className="flex rounded-lg border border-slate-200/80 bg-white overflow-hidden shadow-sm">
      <div className={`w-1 shrink-0 ${sentimentBarColor}`} aria-hidden />
      <div className="flex-1 min-w-0 p-3">
        <div className="flex items-center gap-2 flex-wrap">
          {rating != null && (
            <span className="text-amber-600 text-sm font-medium">★ {Number(rating).toFixed(1)}</span>
          )}
          {relativeTime && (
            <span className="text-xs text-slate-500">{relativeTime}</span>
          )}
        </div>
        <p className="text-sm text-slate-700 whitespace-pre-wrap mt-1">{display}</p>
        {!short && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="text-[var(--color-primary)] text-xs mt-1.5 font-medium hover:underline"
          >
            {open ? 'Read less' : 'Read more'}
          </button>
        )}
        {flagged.length > 0 && (
          <p className="text-xs text-amber-700 mt-1">Flagged: {flagged.join(', ')}</p>
        )}
      </div>
    </article>
  )
}

/** Simple render of markdown-like text: **bold** and bullet lines. */
function renderMarkdownLike(text: string): ReactNode {
  const lines = text.split('\n')
  return lines.map((line, i) => {
    const trimmed = line.trim()
    const bulletMatch = trimmed.match(/^\*\s+(.*)$/) || trimmed.match(/^-\s+(.*)$/)
    const content = bulletMatch ? bulletMatch[1] : trimmed
    const parts: React.ReactNode[] = []
    let remaining = content
    while (remaining.length > 0) {
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
      if (boldMatch) {
        const idx = remaining.indexOf(boldMatch[0])
        if (idx > 0) parts.push(remaining.slice(0, idx))
        parts.push(<strong key={parts.length} className="font-semibold text-slate-900">{boldMatch[1]}</strong>)
        remaining = remaining.slice(idx + boldMatch[0].length)
      } else {
        parts.push(remaining)
        break
      }
    }
    if (bulletMatch) {
      return <li key={i} className="ml-4 list-disc text-sm text-slate-700">{parts}</li>
    }
    return <p key={i} className="text-sm text-slate-700 mb-1">{parts.length ? parts : line}</p>
  })
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
  const [scopeDropdownOpen, setScopeDropdownOpen] = useState(false)
  const [lastScopeUsed, setLastScopeUsed] = useState<string | null>(null)
  const [lastReviewCountUsed, setLastReviewCountUsed] = useState<number | null>(null)
  const scopeDropdownRef = useRef<HTMLDivElement>(null)
  const chatMessagesRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)
  const [summaryExpanded, setSummaryExpanded] = useState(false)
  const REVIEWS_BATCH = 15
  const [reviewsVisibleCount, setReviewsVisibleCount] = useState(REVIEWS_BATCH)

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
    setSummaryExpanded(false)
    setReviewsVisibleCount(REVIEWS_BATCH)
  }, [lead?.place_id])

  useEffect(() => {
    if (!scopeDropdownOpen) return
    const onClick = (e: MouseEvent) => {
      if (scopeDropdownRef.current && !scopeDropdownRef.current.contains(e.target as Node)) setScopeDropdownOpen(false)
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [scopeDropdownOpen])

  // Scroll chat to bottom when a new message is added (e.g. AI response)
  useEffect(() => {
    if (tab !== 'insights' || !chatMessagesRef.current) return
    const el = chatMessagesRef.current
    el.scrollTop = el.scrollHeight
  }, [tab, messages.length])

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
  const tabLabels: Record<TabId, string> = { summary: 'Summary', reviews: 'Reviews', insights: 'Ask & Insights' }
  const leadWithSource = lead as HotLead & { source_city?: string | null }
  const breadcrumbParts = lead
    ? ['Leads', leadWithSource.source_city || 'Clinic', (lead.name ?? '').slice(0, 40) + (lead.name && lead.name.length > 40 ? '…' : '')]
    : ['Leads', 'Reviews']

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reviews-modal-title"
    >
      <div
        className="bg-white rounded-t-2xl md:rounded-xl shadow-xl max-w-2xl w-full max-h-[100dvh] md:max-h-[85vh] flex flex-col overflow-hidden font-sans text-slate-900"
        style={{
          fontFamily: 'Inter, var(--font-sans), ui-sans-serif, sans-serif',
          paddingTop: 'max(0px, env(safe-area-inset-top))',
          paddingBottom: 'max(0px, env(safe-area-inset-bottom))',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky header + tabs: safe zone below, box-shadow so content doesn’t bleed */}
        <div className="sticky top-0 z-10 shrink-0 bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
          <header className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-200/60">
            <div className="min-w-0 flex-1">
              <nav className="text-xs text-slate-500 font-medium" aria-label="Breadcrumb">
                {breadcrumbParts.map((part, i) => (
                  <span key={i}>
                    {i > 0 && <span className="mx-1.5 text-slate-300">›</span>}
                    <span className={i === breadcrumbParts.length - 1 ? 'text-slate-900 font-semibold' : ''}>{part}</span>
                  </span>
                ))}
              </nav>
              {lead != null && (
                <span className="inline-flex items-center gap-1 mt-0.5 text-xs text-slate-500">
                  <span className="text-amber-600">★</span>
                  <span>{Number(lead.rating).toFixed(1)}</span>
                  <span>·</span>
                  <span>{lead.review_count ?? 0} reviews</span>
                </span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {tab === 'summary' && hasReviews && (
                <button
                  type="button"
                  onClick={handleGenerateSummary}
                  disabled={summaryLoading}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:opacity-50"
                  aria-label="Generate summary"
                  title="Generate summary"
                >
                  <Sparkles className="h-4 w-4" aria-hidden />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
          </header>

          {/* Segmented control (pill-style) tabs */}
          <div className="px-5 pt-2 pb-4">
            <div className="inline-flex rounded-full bg-slate-100/80 p-0.5" role="tablist" aria-label="Section">
              {(['summary', 'reviews', 'insights'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    tab === t ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/60' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tabLabels[t]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Body: safe zone 24px top padding so content doesn’t touch header */}
        <div className="flex-1 overflow-y-auto px-5 pt-8 pb-5 min-h-0">
          {tab === 'summary' && (
            <>
              {hasReviews ? (
                <div className="space-y-4">
                  {displaySummary && !displaySummary.includes('not configured') ? (
                    <>
                      {/* Glassmorphic AI summary card with 1px blue border; accordion preview on mobile */}
                      <div className="relative overflow-hidden rounded-xl border border-[var(--color-primary)] bg-white/80 p-4 shadow-sm backdrop-blur-md">
                        <span className="inline-block rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-xs font-medium text-[var(--color-primary)]">
                          AI-Generated
                        </span>
                        <p className="mt-2 text-sm text-slate-700 leading-relaxed" style={{ fontFamily: 'var(--font-sans), Inter, sans-serif' }}>
                          {(() => {
                            const isLong = displaySummary.length > SUMMARY_PREVIEW_LEN
                            const showFull = summaryExpanded || !isLong
                            const text = showFull ? displaySummary : displaySummary.slice(0, SUMMARY_PREVIEW_LEN) + '…'
                            const content = summaryNegativeKeywords.length > 0 && showFull
                              ? segmentForHighlight(text, summaryNegativeKeywords).map((seg, i) =>
                                  seg.type === 'highlight' ? (
                                    <span key={i} className="underline decoration-amber-500 decoration-2 text-amber-800 font-medium">
                                      {seg.text}
                                    </span>
                                  ) : (
                                    <span key={i}>{seg.text}</span>
                                  )
                                )
                              : text
                            return <>{content}</>
                          })()}
                        </p>
                        {displaySummary.length > SUMMARY_PREVIEW_LEN && (
                          <button
                            type="button"
                            onClick={() => setSummaryExpanded((e) => !e)}
                            className="mt-2 text-[var(--color-primary)] text-xs font-medium hover:underline min-h-[44px] min-w-[44px] touch-target md:min-h-0 md:min-w-0"
                          >
                            {summaryExpanded ? 'Show less' : 'Show more'}
                          </button>
                        )}
                      </div>
                      {/* Sentiment chips: negatives 🚩 from summaryNegativeKeywords, positives ✅ from lead.top_strengths */}
                      {(summaryNegativeKeywords.length > 0 || (lead?.top_strengths?.length ?? 0) > 0 || (lead?.top_complaints?.length ?? 0) > 0) && (
                        <div className="flex flex-wrap gap-2">
                          {(summaryNegativeKeywords ?? []).slice(0, 8).map((kw, i) => (
                            <span
                              key={`neg-${i}`}
                              className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50/80 px-2.5 py-1 text-xs font-medium text-red-800"
                            >
                              {kw.replace(/\b\w/g, (c) => c.toUpperCase())} 🚩
                            </span>
                          ))}
                          {(lead?.top_strengths ?? []).slice(0, 5).map((s, i) => (
                            <span
                              key={`str-${i}`}
                              className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50/80 px-2.5 py-1 text-xs font-medium text-emerald-800"
                            >
                              {s} ✅
                            </span>
                          ))}
                          {(lead?.top_complaints ?? []).slice(0, 5).map((c, i) => (
                            <span
                              key={`comp-${i}`}
                              className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50/80 px-2.5 py-1 text-xs font-medium text-amber-800"
                            >
                              {c} 🚩
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  ) : displaySummary && displaySummary.includes('not configured') ? (
                    <div className="text-sm text-amber-800 bg-amber-50 rounded-xl border border-amber-200/60 p-3">
                      <p>{GEMINI_NOT_CONFIGURED_HINT}</p>
                      <button type="button" onClick={handleGenerateSummary} disabled={summaryLoading} className="mt-2 text-[var(--color-primary)] hover:underline disabled:opacity-50">
                        {summaryLoading ? 'Generating…' : 'Try again'}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleGenerateSummary}
                      disabled={summaryLoading}
                      className="rounded-lg border border-[var(--color-primary)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 disabled:opacity-50"
                    >
                      {summaryLoading ? 'Generating…' : 'Generate summary'}
                    </button>
                  )}

                  {displaySummary && !displaySummary.includes('not configured') && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                      <label htmlFor="summary-question" className="text-sm font-medium text-slate-700">Summarize with a question</label>
                      <div className="mt-2 flex gap-2">
                        <input
                          id="summary-question"
                          type="text"
                          value={questionInput}
                          onChange={(e) => setQuestionInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSummarizeWithQuestion()}
                          placeholder="e.g. What do patients say about wait times?"
                          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                        <button
                          type="button"
                          onClick={handleSummarizeWithQuestion}
                          disabled={questionLoading || !questionInput.trim()}
                          className="rounded-lg border border-[var(--color-primary)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 disabled:opacity-50"
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
                <p className="text-sm text-slate-500">No review text available.</p>
              )}
            </>
          )}

          {tab === 'reviews' && (
            <>
              {reviews.length === 0 ? (
                <p className="text-sm text-slate-500">No review text available.</p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <label htmlFor="review-sort" className="text-sm font-medium text-slate-700">Sort by</label>
                    <select
                      id="review-sort"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as ReviewSortOption)}
                      className="rounded-lg border border-slate-300 text-sm px-2 py-1.5 text-slate-700"
                    >
                      <option value="latest">Latest (date)</option>
                      <option value="oldest">Oldest (date)</option>
                      <option value="highest_rating">Highest rating</option>
                      <option value="lowest_rating">Lowest rating</option>
                    </select>
                  </div>
                  <ul className="space-y-2" role="list">
                    {sortedReviews.slice(0, reviewsVisibleCount).map((r, idx) => (
                      <li key={idx}>
                        <ReviewItem
                          text={r.text}
                          flagged={r.flagged_keywords ?? []}
                          rating={r.rating}
                          relativeTime={r.relative_time_description}
                        />
                      </li>
                    ))}
                  </ul>
                  {reviewsVisibleCount < sortedReviews.length && (
                    <div className="mt-4 flex justify-center">
                      <button
                        type="button"
                        onClick={() => setReviewsVisibleCount((c) => c + REVIEWS_BATCH)}
                        className="touch-target min-h-[44px] rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 md:min-h-0"
                      >
                        Load more reviews
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {tab === 'insights' && (
            <>
              {!hasReviews ? (
                <p className="text-sm text-slate-500">No review data.</p>
              ) : (
                <>
                  <p className="text-xs text-slate-500 mb-3">Based on the {n} reviews we have for this clinic (from Google).</p>

                  {/* Insights Bento: Donut + Bar side-by-side, each in card */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    {/* Sentiment donut card */}
                    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-none">
                      <h3 className="text-xs font-medium text-slate-500 mb-3 uppercase tracking-wider">Sentiment</h3>
                      {negativePositiveData.length > 0 ? (
                        <div className="relative h-20 md:h-32 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <defs>
                                <linearGradient id="emeraldGradientModal" x1="0" y1="0" x2="1" y2="1">
                                  <stop offset="0%" stopColor="#a7f3d0" />
                                  <stop offset="100%" stopColor="#10b981" />
                                </linearGradient>
                                <linearGradient id="coralGradientModal" x1="0" y1="0" x2="1" y2="1">
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
                                innerRadius={28}
                                outerRadius={40}
                                stroke="rgba(255,255,255,0.9)"
                                strokeWidth={1.5}
                              >
                                {negativePositiveData.map((entry, i) => (
                                  <Cell key={i} fill={entry.name.includes('Positive') ? 'url(#emeraldGradientModal)' : 'url(#coralGradientModal)'} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                              <p className="text-sm font-bold tabular-nums text-slate-800">{sentimentTotals.total}</p>
                              <p className="text-[10px] text-slate-500">reviews</p>
                              <p className="text-xs font-semibold text-emerald-600">{sentimentTotals.pct}% positive</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 py-2">No ratings to show.</p>
                      )}
                    </div>
                    {/* Review distribution bar card */}
                    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-none">
                      <h3 className="text-xs font-medium text-slate-500 mb-3 uppercase tracking-wider">Review Distribution</h3>
                      {!ratingDistribution.every((d) => d.count === 0) ? (
                        <div className="h-20 md:h-32 w-full min-w-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={ratingDistribution} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                              <XAxis dataKey="star" tick={{ fontSize: 10 }} />
                              <YAxis width={18} tick={{ fontSize: 10 }} />
                              <Tooltip />
                              <Bar dataKey="count" name="Reviews" radius={[3, 3, 0, 0]} fill="var(--color-primary)">
                                {ratingDistribution.map((entry, i) => {
                                  const maxCount = Math.max(...ratingDistribution.map((d) => d.count), 1)
                                  const intensity = entry.count === 0 ? 0.2 : 0.4 + (0.6 * entry.count) / maxCount
                                  return <Cell key={i} fill={`rgba(37, 99, 235, ${intensity})`} />
                                })}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 py-2">No per-review ratings.</p>
                      )}
                    </div>
                  </div>

                  {insightsLoading && <p className="text-sm text-slate-500 mb-2">Loading insights…</p>}
                  {insightsError && <p className="text-sm text-red-600 mb-2">{insightsError}</p>}
                  {insights && !insightsLoading && (
                    <div className="mb-5 rounded-xl border border-slate-200/80 bg-white p-4 text-sm text-slate-600 space-y-1">
                      <p>Negative (low rating): <strong>{insights.negative_review_count}</strong> of <strong>{insights.total_shown}</strong></p>
                      <p>Complaints about doctors: <strong>{insights.complaints_about_doctors_count}</strong></p>
                      {insights.top_10_improvements.length > 0 && (
                        <div className="mt-2">
                          <p className="font-medium text-slate-800 mb-1">Top improvements</p>
                          <ol className="list-decimal list-inside space-y-0.5 text-slate-600 text-xs">
                            {insights.top_10_improvements.slice(0, 5).map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Minimal outlined chips (Linear/Stripe style) */}
                  <div className="mb-5">
                    <h3 className="text-xs font-medium text-slate-500 mb-3 uppercase tracking-wider">Suggested questions</h3>
                    <div className="flex flex-wrap gap-2">
                      {SUGGESTED_QUESTIONS.map((q, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSuggestedClick(q)}
                          disabled={chatLoading}
                          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 hover:border-blue-500/50 hover:text-blue-600 disabled:opacity-50 transition-colors"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden />
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Scope: dropdown to save vertical space */}
                  <div className="mb-3" ref={scopeDropdownRef}>
                    <p className="text-xs text-slate-500 mb-1.5">Answer from which reviews:</p>
                    <div className="relative inline-block">
                      <button
                        type="button"
                        onClick={() => setScopeDropdownOpen((o) => !o)}
                        disabled={chatLoading}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        {(
                          [
                            ['all', 'All reviews'],
                            ['top_20_negative', 'Top 20 negative'],
                            ['top_50_negative', 'Top 50 negative'],
                            ['top_20_positive', 'Top 20 positive'],
                            ['top_50_positive', 'Top 50 positive'],
                          ] as const
                        ).find(([v]) => v === askScope)?.[1] ?? 'All reviews'}
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${scopeDropdownOpen ? 'rotate-180' : ''}`} aria-hidden />
                      </button>
                      {scopeDropdownOpen && (
                        <div className="absolute left-0 top-full z-20 mt-1 min-w-[160px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
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
                              onClick={() => { setAskScope(value); setScopeDropdownOpen(false) }}
                              disabled={chatLoading}
                              className={`block w-full px-3 py-1.5 text-left text-xs font-medium disabled:opacity-50 ${
                                askScope === value ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {lastScopeUsed != null && lastReviewCountUsed != null && (
                      <p className="mt-1 text-xs text-slate-500">
                        From <strong>{lastReviewCountUsed}</strong> reviews ({lastScopeUsed.replace(/_/g, ' ')}).
                      </p>
                    )}
                  </div>

                  {/* Response stream: user left, AI with faint blue bg + markdown-style; scroll to bottom on new message */}
                  <div
                    ref={chatMessagesRef}
                    className="space-y-2 min-h-[28vh] max-h-[55vh] sm:min-h-0 sm:max-h-44 overflow-y-auto rounded-lg p-2 mb-2"
                  >
                    {messages.length === 0 && (
                      <p className="text-xs text-slate-500">Ask a question or click a suggestion above.</p>
                    )}
                    {messages.map((msg, i) => {
                      const isUser = msg.role === 'user'
                      const userLabel = 'You: '
                      const displayContent = isUser ? (msg.content.startsWith(userLabel) ? msg.content : userLabel + msg.content) : msg.content
                      const isNotConfigured = !isUser && msg.content.includes('not configured')
                      return (
                        <div
                          key={i}
                          className={`rounded-xl px-3 py-2 text-sm ${
                            isUser
                              ? 'text-right bg-slate-100/80'
                              : 'bg-[#F0F9FF] text-left'
                          }`}
                        >
                          <span className={isUser ? 'text-[var(--color-primary)] font-medium' : 'text-slate-600 font-medium'}>
                            {isUser ? '' : 'Answer: '}
                          </span>
                          {isUser ? (
                            <span className="whitespace-pre-wrap">{displayContent}</span>
                          ) : (
                            <div className="mt-0.5">
                              {isNotConfigured ? GEMINI_NOT_CONFIGURED_HINT : renderMarkdownLike(msg.content)}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Floating Ask AI bar: pill-shaped, subtle glow (Electric Blue); keyboard-aware on mobile */}
                  <div
                    className="sticky bottom-0 left-0 right-0 -mx-5 -mb-5 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-white/90 backdrop-blur-md border-t border-slate-200/60 rounded-b-xl"
                  >
                    <div
                      className="flex gap-2 items-center rounded-full border border-slate-200 bg-white px-4 py-3 shadow-[0_0_0_1px_rgba(0,0,0,0.03),0_2px_4px_rgba(0,0,0,0.05),0_0_20px_-5px_rgba(59,130,246,0.15)] focus-within:border-blue-500/50 focus-within:shadow-[0_0_0_1px_rgba(59,130,246,0.3),0_0_24px_-4px_rgba(59,130,246,0.2)] transition-all"
                    >
                      <Sparkles className="h-4 w-4 text-slate-400 shrink-0" aria-hidden />
                      <input
                        ref={chatInputRef}
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendQuestion(chatInput)}
                        onFocus={() => {
                          requestAnimationFrame(() => {
                            chatInputRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
                          })
                        }}
                        placeholder="Ask AI…"
                        className="flex-1 min-w-0 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none"
                        disabled={chatLoading}
                      />
                      <button
                        type="button"
                        onClick={() => handleSendQuestion(chatInput)}
                        disabled={chatLoading || !chatInput.trim()}
                        className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Send"
                      >
                        <Send className="h-4 w-4" aria-hidden />
                      </button>
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
