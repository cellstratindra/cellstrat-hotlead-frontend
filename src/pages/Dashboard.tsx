import { useEffect, useState } from 'react'
import { enrichLeads, fetchHighlights, fetchMarketInsights, fetchRecommendations, getStats, saveLeads, searchLeads, type StatsResponse, type ScoreWeights } from '../api/client'
import type { HotLead, MarketInsightsResponse } from '../types/leads'
import { LeadCardGrid } from '../components/LeadCardGrid'
import { ExportCsvButton } from '../components/ExportCsvButton'
import { SearchBarWithChips, type SearchChips, type SearchFilters } from '../components/SearchBarWithChips'
import { useSearchResults } from '../contexts/SearchResultsContext'
import { SlidersHorizontal, History, Trash2 } from 'lucide-react'

const DEFAULT_SCORE_WEIGHTS: ScoreWeights = {
  rating_weight: 50,
  review_count_weight: 25,
  phone_weight: 15,
  enrichment_weight: 10,
}

function formatTimeAgo(ts: number): string {
  const sec = Math.floor((Date.now() - ts) / 1000)
  if (sec < 60) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} min ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} hr ago`
  const day = Math.floor(hr / 24)
  return `${day} day${day !== 1 ? 's' : ''} ago`
}

export function Dashboard() {
  const { lastSearch, saveSearch, searchHistory, removeHistoryEntry, clearHistory } = useSearchResults()
  const [searchChips, setSearchChips] = useState<SearchChips>(
    () => lastSearch?.searchChips ?? { city: '', specialty: '', region: '' }
  )
  const [scoreWeights, setScoreWeights] = useState<ScoreWeights>(
    () => lastSearch?.scoreWeights ?? DEFAULT_SCORE_WEIGHTS
  )
  const [scorePrefsOpen, setScorePrefsOpen] = useState(false)
  const [leads, setLeads] = useState<HotLead[]>(() => lastSearch?.leads ?? [])
  const [loading, setLoading] = useState(false)
  const [enriching, setEnriching] = useState(false)
  const [highlightsLoading, setHighlightsLoading] = useState(false)
  const [recommendationsLoading, setRecommendationsLoading] = useState(false)
  const [recommendedLeads, setRecommendedLeads] = useState<HotLead[]>([])
  const [marketReport, setMarketReport] = useState<MarketInsightsResponse | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<StatsResponse | null>(null)

  useEffect(() => {
    getStats().then(setStats).catch(() => setStats(null))
  }, [leads.length])

  async function handleSaveAll() {
    if (leads.length === 0) return
    setError(null)
    setSaveMessage(null)
    setSaving(true)
    try {
      const ids = await saveLeads(
        leads,
        searchChips.city || undefined,
        searchChips.specialty || undefined,
        searchChips.region.trim() || undefined
      )
      setSaveMessage(`Saved ${ids.length} lead(s) to My Leads.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleEnrich() {
    if (leads.length === 0) return
    setError(null)
    setEnriching(true)
    try {
      const enriched = await enrichLeads(leads)
      setLeads(enriched)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enrichment failed')
    } finally {
      setEnriching(false)
    }
  }

  async function handleGetInsights() {
    if (leads.length === 0) return
    setError(null)
    setHighlightsLoading(true)
    try {
      const withHighlights = await fetchHighlights(leads)
      setLeads(withHighlights)
      if (withHighlights.length > 1) {
        const report = await fetchMarketInsights(withHighlights)
        setMarketReport(report.market_pulse || report.market_themes?.length ? report : null)
      } else {
        setMarketReport(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Highlights failed')
    } finally {
      setHighlightsLoading(false)
    }
  }

  async function handleGetRecommendations() {
    if (leads.length === 0) return
    setError(null)
    setRecommendationsLoading(true)
    try {
      const ranked = await fetchRecommendations(leads)
      setRecommendedLeads(ranked)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recommendations failed')
    } finally {
      setRecommendationsLoading(false)
    }
  }

  async function handleSearch(chips: SearchChips, filters: SearchFilters) {
    setError(null)
    setSearchChips(chips)
    setLoading(true)
    try {
      const res = await searchLeads({
        city: chips.city,
        specialty: chips.specialty,
        region: chips.region.trim() || undefined,
        sort_by: filters.sort_by || undefined,
        order: filters.order || undefined,
        min_rating: filters.min_rating !== '' ? Number(filters.min_rating) : undefined,
        min_review_count: filters.min_review_count !== '' ? Number(filters.min_review_count) : undefined,
        has_phone: filters.has_phone || undefined,
        budget_max: filters.budget_max !== '' ? Number(filters.budget_max) : undefined,
        score_weights: scoreWeights,
      })
      setLeads(res.leads)
      setRecommendedLeads([])
      setMarketReport(null)
      saveSearch({
        leads: res.leads,
        searchChips: chips,
        filters,
        scoreWeights,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
      setLeads([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        </header>

        {stats != null && (
          <div className="mb-4 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm">
            <span className="font-medium text-gray-700">Platform reach: </span>
            <span className="text-gray-600">{stats.total_leads} saved lead{stats.total_leads !== 1 ? 's' : ''}</span>
            {Object.keys(stats.by_stage).length > 0 && (
              <span className="ml-2 text-gray-500">
                ({Object.entries(stats.by_stage).map(([s, n]) => `${s}: ${n}`).join(', ')})
              </span>
            )}
          </div>
        )}

        <div className="mb-6 space-y-3">
          <SearchBarWithChips
            key={`search-${searchChips.city}-${searchChips.specialty}-${searchChips.region}`}
            onSubmit={handleSearch}
            loading={loading}
            initialChips={searchChips.city || searchChips.specialty ? searchChips : undefined}
            initialFilters={lastSearch?.filters ?? undefined}
          />
          {searchHistory.length > 0 && (
            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <History className="h-4 w-4 text-slate-500" />
                  Recent searches
                </h3>
                <button
                  type="button"
                  onClick={clearHistory}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear
                </button>
              </div>
              <ul className="mt-2 flex flex-wrap gap-2" role="list">
                {searchHistory.map((entry) => (
                  <li key={entry.id}>
                    <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm">
                      <button
                        type="button"
                        onClick={() => handleSearch(entry.chips, entry.filters)}
                        disabled={loading}
                        className="text-left text-slate-700 hover:text-[#2563EB] hover:underline disabled:opacity-50"
                      >
                        {[entry.chips.city, entry.chips.specialty].filter(Boolean).join(' · ')}
                        {entry.chips.region && ` · ${entry.chips.region}`} — {entry.resultCount} lead{entry.resultCount !== 1 ? 's' : ''}
                      </button>
                      <span className="text-xs text-slate-400">{formatTimeAgo(entry.timestamp)}</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeHistoryEntry(entry.id) }}
                        className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                        aria-label={`Remove ${entry.chips.city} ${entry.chips.specialty} from history`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <button
              type="button"
              onClick={() => setScorePrefsOpen((o) => !o)}
              className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Score preferences
            </button>
            {scorePrefsOpen && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="block">
                  <span className="mb-1 block text-xs text-slate-600">Rating weight</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={scoreWeights.rating_weight}
                    onChange={(e) =>
                      setScoreWeights((w) => ({ ...w, rating_weight: Number(e.target.value) }))
                    }
                    className="w-full"
                  />
                  <span className="text-xs text-slate-500">{scoreWeights.rating_weight}</span>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-slate-600">Review count weight</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={scoreWeights.review_count_weight}
                    onChange={(e) =>
                      setScoreWeights((w) => ({ ...w, review_count_weight: Number(e.target.value) }))
                    }
                    className="w-full"
                  />
                  <span className="text-xs text-slate-500">{scoreWeights.review_count_weight}</span>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-slate-600">Phone weight</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={scoreWeights.phone_weight}
                    onChange={(e) =>
                      setScoreWeights((w) => ({ ...w, phone_weight: Number(e.target.value) }))
                    }
                    className="w-full"
                  />
                  <span className="text-xs text-slate-500">{scoreWeights.phone_weight}</span>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-slate-600">Enrichment weight</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={scoreWeights.enrichment_weight}
                    onChange={(e) =>
                      setScoreWeights((w) => ({ ...w, enrichment_weight: Number(e.target.value) }))
                    }
                    className="w-full"
                  />
                  <span className="text-xs text-slate-500">{scoreWeights.enrichment_weight}</span>
                </label>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700" role="alert">
            {error}
          </div>
        )}

        {loading && (
          <div className="mb-6 flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white py-12 shadow-sm">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" aria-hidden />
            <p className="mt-3 text-sm text-gray-500">Searching for clinics…</p>
          </div>
        )}

        {!loading && leads.length > 0 && (
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm" aria-label="Results">
            {saveMessage && <p className="mb-3 text-sm text-green-600">{saveMessage}</p>}
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-slate-700">
                {leads.length} lead{leads.length !== 1 ? 's' : ''} found
              </span>
              <ExportCsvButton leads={leads} />
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={saving}
                className="rounded-lg border border-emerald-600/30 bg-[#10B981] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-600 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save all'}
              </button>
              <button
                type="button"
                onClick={handleEnrich}
                disabled={enriching}
                className="rounded-lg border border-violet-500/30 bg-gradient-to-r from-violet-500 to-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:from-violet-600 hover:to-blue-700 disabled:opacity-50"
              >
                {enriching ? 'Enriching…' : 'Enrich with AI'}
              </button>
              <button
                type="button"
                onClick={handleGetInsights}
                disabled={highlightsLoading}
                className="rounded-lg border border-amber-500/30 bg-[#F59E0B] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-600 disabled:opacity-50"
              >
                {highlightsLoading ? 'Getting insights…' : 'Get insights'}
              </button>
              <button
                type="button"
                onClick={handleGetRecommendations}
                disabled={recommendationsLoading}
                className="rounded-lg border border-sky-500/30 bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-700 disabled:opacity-50"
              >
                {recommendationsLoading ? 'Loading…' : 'Get recommendations'}
              </button>
            </div>
            {(recommendedLeads.length > 0 || marketReport) && (
              <div className="mb-4 space-y-4">
                {recommendedLeads.length > 0 && (
                  <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4">
                    <h3 className="text-sm font-semibold text-slate-800 mb-2">Top 5 to contact this week</h3>
                    <ul className="space-y-3">
                      {recommendedLeads
                        .filter((l) => (l.contact_rank ?? 0) <= 5)
                        .sort((a, b) => (a.contact_rank ?? 99) - (b.contact_rank ?? 99))
                        .map((l) => (
                          <li key={l.place_id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                            <div className="font-medium text-slate-900">
                              #{l.contact_rank ?? '—'} {l.name}
                            </div>
                            {l.reason_to_contact && (
                              <p className="mt-1 text-slate-600">
                                <span className="text-slate-500">Why contact: </span>
                                {l.reason_to_contact}
                              </p>
                            )}
                            {l.suggested_action && (
                              <p className="mt-0.5 text-slate-600">
                                <span className="text-slate-500">Talking point: </span>
                                {l.suggested_action}
                              </p>
                            )}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
                {marketReport && (marketReport.market_pulse || marketReport.market_themes?.length > 0) && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                    <h3 className="text-sm font-semibold text-slate-800 mb-2">Market report</h3>
                    {marketReport.market_themes?.length > 0 && (
                      <p className="text-xs text-slate-600 mb-2">
                        <span className="font-medium text-slate-700">Key themes: </span>
                        {marketReport.market_themes.join(' · ')}
                      </p>
                    )}
                    {marketReport.market_pulse && (
                      <p className="text-sm text-slate-700">
                        <span className="font-medium text-slate-700">Market pulse: </span>
                        {marketReport.market_pulse}
                      </p>
                    )}
                    {marketReport.prioritized_place_ids?.length > 0 && (
                      <p className="mt-2 text-xs text-slate-500">
                        Top to prioritize: {marketReport.prioritized_place_ids.slice(0, 5).map((id: string) => leads.find((l) => l.place_id === id)?.name ?? id).filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
            <LeadCardGrid
              leads={leads}
              marketLabel={searchChips.city && searchChips.specialty ? `${searchChips.specialty} in ${searchChips.city}` : null}
            />
          </section>
        )}

        {!loading && leads.length === 0 && !error && (
          <section className="rounded-lg border border-gray-200 bg-white py-16 text-center shadow-sm" aria-label="Empty state">
            <p className="text-lg font-medium text-gray-700">No clinics yet</p>
            <p className="mt-2 max-w-sm mx-auto text-sm text-gray-500">
              Choose a city and healthcare specialty above and click Search to find hot leads.
            </p>
          </section>
        )}
      </div>
    </div>
  )
}
