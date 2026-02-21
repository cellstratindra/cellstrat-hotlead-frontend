import { useEffect, useState, type FC } from 'react';
import { Switch } from '@headlessui/react';
import { searchLeads, saveLeads, enrichLeads, fetchMarketInsights, getStats, type StatsResponse, type ScoreWeights } from '../api/client';
import type { HotLead, MarketInsightsResponse } from '../types/leads';
import { LeadCardGrid } from '../components/LeadCardGrid';
import { ExportCsvButton } from '../components/ExportCsvButton';
import { SearchBarWithChips, type SearchChips, type SearchFilters } from '../components/SearchBarWithChips';
import { useSearchResults } from '../contexts/SearchResultsContext';
import { X } from 'lucide-react';
import { LeadPipelineViewTracker } from '../components/LeadPipelineViewTracker';

const DEFAULT_SCORE_WEIGHTS: ScoreWeights = {
  rating_weight: 50, review_count_weight: 25, phone_weight: 15, enrichment_weight: 10,
};

interface AiPoweredInsightsProps {
  report: MarketInsightsResponse | null;
  onClose: () => void;
  qualificationScore: number;
}

const AiPoweredInsights: FC<AiPoweredInsightsProps> = ({ report, onClose, qualificationScore }) => {
  if (!report) return null;

  return (
    <aside className="fixed top-16 right-4 w-96 bg-white rounded-lg shadow-xl p-6 z-20">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-slate-800">AI-Powered Insights</h2>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-800"><X size={20} /></button>
      </div>
      <div className="space-y-6">
        {report.market_pulse && (
          <div>
            <h3 className="font-semibold text-slate-700">Review Summary</h3>
            <p className="text-sm text-slate-600 mt-1">{report.market_pulse}</p>
          </div>
        )}
        <div>
            <h3 className="font-semibold text-slate-700 mb-2">Review Distribution</h3>
            <div className="bg-slate-50 p-4 rounded-lg text-center text-sm text-slate-500">[Chart Placeholder]</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-4">
            <h3 className="font-semibold text-slate-700">Qualification Score</h3>
            <p className="text-5xl font-bold text-blue-600">{qualificationScore}</p>
        </div>
        <button className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 transition-colors">Generate Insights</button>
      </div>
    </aside>
  );
}

export function Dashboard() {
  const { lastSearch, saveSearch } = useSearchResults();
  const [searchChips, setSearchChips] = useState<SearchChips>(() => lastSearch?.searchChips ?? { city: 'Bangalore', specialty: 'Healthcare', region: 'India' });
  const [scoreWeights] = useState<ScoreWeights>(() => lastSearch?.scoreWeights ?? DEFAULT_SCORE_WEIGHTS);
  const [leads, setLeads] = useState<HotLead[]>(() => lastSearch?.leads ?? []);
  const [loading, setLoading] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [isPipelineView, setIsPipelineView] = useState(true);
  const [showInsights, setShowInsights] = useState(false);
  const [marketReport, setMarketReport] = useState<MarketInsightsResponse | null>(null);
  const [qualificationScore] = useState(8);

  useEffect(() => {
    getStats().then(setStats).catch(() => setStats(null));
  }, [leads.length]);

  async function handleSaveAll() {
    if (leads.length === 0) return;
    setError(null);
    setSaveMessage(null);
    setSaving(true);
    try {
      const ids = await saveLeads(leads, searchChips.city || undefined, searchChips.specialty || undefined, searchChips.region.trim() || undefined);
      setSaveMessage(`Saved ${ids.length} lead(s) to My Leads.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleEnrich() {
    if (leads.length === 0) return;
    setError(null);
    setEnriching(true);
    try {
      const enriched = await enrichLeads(leads);
      setLeads(enriched);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enrichment failed');
    } finally {
      setEnriching(false);
    }
  }

  async function handleGetInsights() {
    if (leads.length === 0) return;
    setError(null);
    setInsightsLoading(true);
    try {
      const report = await fetchMarketInsights(leads);
      setMarketReport(report.market_pulse || report.market_themes?.length ? report : null);
      setShowInsights(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get insights');
    } finally {
      setInsightsLoading(false);
    }
  }

  async function handleSearch(chips: SearchChips, filters: SearchFilters) {
    setError(null);
    setSearchChips(chips);
    setLoading(true);
    try {
      const res = await searchLeads({ 
        ...chips, 
        ...filters, 
        score_weights: scoreWeights, 
        min_rating: Number(filters.min_rating),
        min_review_count: Number(filters.min_review_count),
        budget_max: Number(filters.budget_max) 
      });
      setLeads(res.leads);
      setMarketReport(null);
      saveSearch({ leads: res.leads, searchChips: chips, filters, scoreWeights });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 bg-slate-50 min-h-full">
      <div className="max-w-screen-xl mx-auto">
        {stats != null && (
          <div className="mb-5 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm">
            <p className="text-slate-600">
              <span className="font-semibold text-slate-800">Platform reach:</span> {stats.total_leads} saved leads (new: {stats.by_stage?.new ?? 0})
            </p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-5 mb-8">
          <SearchBarWithChips 
              key={`search-${searchChips.city}-${searchChips.specialty}-${searchChips.region}`}
              onSubmit={handleSearch}
              loading={loading}
              initialChips={searchChips}
              initialFilters={lastSearch?.filters ?? undefined}
            />
          <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <ExportCsvButton leads={leads} />
                <button onClick={handleSaveAll} disabled={saving || leads.length === 0} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save all'}
                </button>
                <button onClick={handleEnrich} disabled={enriching || leads.length === 0} className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg shadow-sm hover:bg-purple-700 disabled:opacity-50">
                    {enriching ? 'Enriching...' : 'Enrich with AI'}
                </button>
                <button onClick={handleGetInsights} disabled={insightsLoading || leads.length === 0} className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg shadow-sm hover:bg-orange-600 disabled:opacity-50">
                    {insightsLoading ? 'Getting...' : 'Get Insights'}
                </button>
            </div>
            <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-700">Pipeline View</span>
                <Switch
                    checked={isPipelineView}
                    onChange={setIsPipelineView}
                    className={`${isPipelineView ? 'bg-blue-600' : 'bg-gray-200'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}>
                    <span className={`${isPipelineView ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                </Switch>
            </div>
          </div>
        </div>
        
        {error && <div className="mb-4 rounded-lg bg-red-100 p-4 text-sm text-red-700">{error}</div>}
        {saveMessage && <p className="mb-3 text-sm text-green-600">{saveMessage}</p>}
        
        {loading ? (
          <div className="text-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mx-auto" />
            <p className="mt-3 text-slate-500">Searching for clinics...</p>
          </div>
        ) : isPipelineView ? (
          <LeadPipelineViewTracker leads={leads} />
        ) : (
          <LeadCardGrid leads={leads} marketLabel={`${searchChips.specialty} in ${searchChips.city}`} />
        )}

        {!loading && leads.length === 0 && (
            <div className="text-center py-16 bg-white rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-slate-800">No leads found</h3>
                <p className="mt-2 text-slate-500">Use the search bar above to find new leads.</p>
            </div>
        )}

        {showInsights && <AiPoweredInsights report={marketReport} onClose={() => setShowInsights(false)} qualificationScore={qualificationScore} />}
      </div>
    </div>
  );
}