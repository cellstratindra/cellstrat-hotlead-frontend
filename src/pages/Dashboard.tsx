import { useEffect, useState, useCallback, useRef, type FC } from 'react';
import { useUser } from '@clerk/clerk-react';
import { searchLeads, saveLeads, enrichLeads, fetchMarketInsights, getStats, getKpis, bulkUpdateLeads, type StatsResponse, type ScoreWeights } from '../api/client';
import type { HotLead, MarketInsightsResponse } from '../types/leads';
import { LeadCardGrid, getLeadSelectId } from '../components/LeadCardGrid';
import { ExportCsvButton, exportLeadsToCsv } from '../components/ExportCsvButton';
import { CampaignDrawer } from '../components/CampaignDrawer';
import { LeadDetailsDrawer, type LeadDetailsUpdates } from '../components/LeadDetailsDrawer';
import { SearchBarWithChips, type SearchChips, type SearchFilters } from '../components/SearchBarWithChips';
import { SearchProgressBar } from '../components/SearchProgressBar';
import { KpiRibbon, type KpiRibbonData } from '../components/KpiRibbon';
import { FilterDrawer } from '../components/FilterDrawer';
import { useSearchResults } from '../contexts/SearchResultsContext';
import { useFilterDrawer } from '../contexts/FilterDrawerContext';
import { useHeaderActions } from '../contexts/HeaderActionsContext';
import { X, SlidersHorizontal, Sparkles, Mail, Save, MoreVertical, BarChart3, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';

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
    <aside className="fixed top-16 right-[var(--space-4)] w-96 bg-white rounded-[var(--radius-card)] border-default shadow-[var(--shadow-dropdown)] p-[var(--space-6)] z-20">
      <div className="flex justify-between items-center mb-[var(--space-4)]">
        <h2 className="text-lg font-bold text-[var(--color-navy)]">AI-Powered Insights</h2>
        <button onClick={onClose} className="touch-target flex items-center justify-center rounded-[var(--radius-button)] text-slate-500 hover:text-slate-800 focus:ring-2 focus:ring-[var(--color-primary)]" aria-label="Close"><X size={20} /></button>
      </div>
      <div className="space-y-[var(--space-6)]">
        {report.market_pulse && (
          <div>
            <h3 className="font-semibold text-slate-700">Review Summary</h3>
            <p className="text-sm text-slate-600 mt-[var(--space-1)]">{report.market_pulse}</p>
          </div>
        )}
        <div>
            <h3 className="font-semibold text-slate-700 mb-[var(--space-2)]">Review Distribution</h3>
            <div className="bg-slate-50 p-[var(--space-4)] rounded-[var(--radius-button)] text-center text-sm text-slate-500">[Chart Placeholder]</div>
        </div>
        <div className="bg-slate-50 rounded-[var(--radius-card)] p-[var(--space-4)]">
            <h3 className="font-semibold text-slate-700">Qualification Score</h3>
            <p className="text-5xl font-bold text-[var(--color-primary)]">{qualificationScore}</p>
            <p className="text-xs text-slate-500 mt-[var(--space-1)]">Reflects follow-up count and last contact recency for this market set.</p>
        </div>
        <button className="w-full bg-[var(--color-primary)] text-white font-semibold py-[var(--space-2)] rounded-[var(--radius-button)] shadow-[var(--shadow-button)] hover:bg-[var(--color-primary-hover)] transition-colors focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2">Generate Insights</button>
      </div>
    </aside>
  );
}

export function Dashboard() {
  const { user } = useUser();
  const { lastSearch, saveSearch } = useSearchResults();
  const [searchChips, setSearchChips] = useState<SearchChips>(() => lastSearch?.searchChips ?? { city: 'Bangalore', specialty: 'General practice', region: 'India' });
  const [scoreWeights] = useState<ScoreWeights>(() => lastSearch?.scoreWeights ?? DEFAULT_SCORE_WEIGHTS);
  const [leads, setLeads] = useState<HotLead[]>(() => lastSearch?.leads ?? []);
  const [loading, setLoading] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [showInsights, setShowInsights] = useState(false);
  const [marketReport, setMarketReport] = useState<MarketInsightsResponse | null>(null);
  const [qualificationScore] = useState(8);
  const [campaignDrawerOpen, setCampaignDrawerOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const filterDrawer = useFilterDrawer();
  const headerActions = useHeaderActions();
  const filterDrawerOpen = filterDrawer?.open ?? false;
  const setFilterDrawerOpen = filterDrawer ? (open: boolean) => (open ? filterDrawer.openDrawer() : filterDrawer.closeDrawer()) : () => {};
  const [kpis, setKpis] = useState<KpiRibbonData | null>(null);
  const [kpisLoading, setKpisLoading] = useState(false);

  // Register header export when leads change. Omit headerActions from deps to avoid render loop
  // (context value reference changes when setExportAction runs, which would re-trigger this effect).
  useEffect(() => {
    if (!headerActions) return;
    if (leads.length > 0) {
      headerActions.setExportAction({
        label: 'Export CSV',
        onClick: () => exportLeadsToCsv(leads),
      });
    } else {
      headerActions.setExportAction(null);
    }
    return () => headerActions.setExportAction(null);
  }, [leads]); // eslint-disable-line react-hooks/exhaustive-deps -- headerActions omitted to prevent loop

  useEffect(() => {
    let cancelled = false;
    setKpisLoading(true);
    const fallbackTimer = setTimeout(() => {
      if (cancelled) return;
      setKpisLoading(false);
      setKpis((prev) => prev ?? null);
    }, 6000);
    getKpis()
      .then((data) => { if (!cancelled) setKpis(data); })
      .catch(() => { if (!cancelled) setKpis(null); })
      .finally(() => {
        if (!cancelled) setKpisLoading(false);
        clearTimeout(fallbackTimer);
      });
    return () => { cancelled = true; clearTimeout(fallbackTimer); };
  }, []);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [leads]);

  useEffect(() => {
    getStats().then(setStats).catch(() => setStats(null));
  }, [leads.length]);

  useEffect(() => {
    if (!actionsMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && setActionsMenuOpen(false);
    const onClick = (e: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target as Node)) setActionsMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('click', onClick, true);
    };
  }, [actionsMenuOpen]);

  async function handleSaveAll() {
    if (leads.length === 0) return;
    setError(null);
    setSaveMessage(null);
    setSaving(true);
    try {
      const ids = await saveLeads(leads, searchChips.city || undefined, searchChips.specialty || undefined, searchChips.region.trim() || undefined, user?.id ?? undefined);
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
    const safetyTimer = setTimeout(() => setEnriching(false), 50000);
    try {
      const enriched = await enrichLeads(leads);
      setLeads(enriched);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enrichment failed');
    } finally {
      clearTimeout(safetyTimer);
      setEnriching(false);
    }
  }

  async function handleGetInsights() {
    if (leads.length === 0) return;
    setError(null);
    setInsightsLoading(true);
    const safetyTimer = setTimeout(() => setInsightsLoading(false), 50000);
    try {
      const report = await fetchMarketInsights(leads);
      setMarketReport(report.market_pulse || report.market_themes?.length ? report : null);
      setShowInsights(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get insights');
    } finally {
      clearTimeout(safetyTimer);
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

  const selectedLeads = leads.filter((l) => selectedIds.has(getLeadSelectId(l)));
  const selectedSavedIds = selectedLeads
    .map((l) => (l as HotLead & { id?: number }).id)
    .filter((id): id is number => id != null);
  const requireSavedFirst = selectedLeads.length > 0 && selectedSavedIds.length === 0;

  const handleSaveDetails = useCallback(
    async (updates: LeadDetailsUpdates) => {
      await bulkUpdateLeads({
        lead_ids: selectedSavedIds,
        contact_email: updates.contact_email ?? null,
        director_name: updates.director_name ?? null,
        note: updates.note ?? null,
      });
      setSelectedIds(new Set());
    },
    [selectedSavedIds]
  );

  async function handleSaveSelectedFirst() {
    if (selectedLeads.length === 0) return;
    await saveLeads(
      selectedLeads,
      searchChips.city || undefined,
      searchChips.specialty || undefined,
      searchChips.region?.trim() || undefined,
      user?.id ?? undefined
    );
    setSaveMessage(`Saved ${selectedLeads.length} lead(s) to My Leads.`);
    setSelectedIds(new Set());
  }

  function handleSelectLead(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  const breadcrumbLabel = `${searchChips.specialty || 'Leads'} in ${searchChips.city || 'Search'}`

  return (
    <div className="p-[var(--edge-padding)] md:p-[var(--space-6)] bg-[var(--color-canvas)] min-h-full font-[family-name:var(--font-sans)] flex">
      <div className="flex-1 min-w-0 max-w-screen-xl mx-auto">
        <nav className="mb-[var(--space-3)] text-sm text-slate-500" aria-label="Breadcrumb">
          <span>Home</span>
          <span className="mx-[var(--space-2)]">›</span>
          <span className="font-medium text-[var(--color-navy)]">{breadcrumbLabel}</span>
        </nav>
        <KpiRibbon data={kpis} loading={kpisLoading} />
        {/* Mobile: thin sticky strip showing lead count when results exist */}
        {leads.length > 0 && (
          <div className="md:hidden sticky top-[52px] z-30 py-[var(--space-2)] px-[var(--edge-padding)] bg-[var(--color-canvas)] border-b border-slate-200 -mx-[var(--edge-padding)] mb-[var(--space-4)]">
            <p className="text-sm font-medium text-slate-600">
              {leads.length} lead{leads.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
        {stats != null && (
          <div className="mb-[var(--space-4)] rounded-[var(--radius-card)] border-default bg-white/80 backdrop-blur-sm px-[var(--space-4)] py-[var(--space-3)] text-sm shadow-[var(--shadow-card)]">
            <p className="text-slate-600">
              <span className="font-semibold text-[var(--color-navy)]">Platform reach:</span> {stats.total_leads} saved leads (new: {stats.by_stage?.new ?? 0})
            </p>
          </div>
        )}

        {/* Desktop: sticky compact search + primary actions + kebab */}
        <div className="hidden md:block sticky top-14 z-40 bg-white/95 backdrop-blur-sm rounded-[var(--radius-card)] border border-slate-200/80 shadow-[var(--shadow-card)] p-[var(--space-4)] mb-[var(--space-4)]">
          <SearchBarWithChips
            key={`search-${searchChips.city}-${searchChips.specialty}-${searchChips.region}`}
            onSubmit={handleSearch}
            loading={loading}
            initialChips={searchChips}
            initialFilters={lastSearch?.filters ?? undefined}
          />
          <div className="mt-[var(--space-3)] pt-[var(--space-3)] border-t border-slate-100 flex flex-wrap items-center gap-[var(--space-2)]">
            <button
              type="button"
              onClick={() => setCampaignDrawerOpen(true)}
              disabled={leads.length === 0}
              className="cursor-pointer px-[var(--space-4)] py-[var(--space-2)] text-sm font-medium text-white rounded-[var(--radius-button)] shadow-[var(--shadow-button)] bg-gradient-to-r from-violet-500 to-[var(--color-primary)] hover:from-violet-600 hover:to-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
            >
              Generate Campaign
            </button>
            <button type="button" onClick={handleEnrich} disabled={enriching || leads.length === 0} className="cursor-pointer px-[var(--space-4)] py-[var(--space-2)] text-sm font-medium text-white bg-purple-600 rounded-[var(--radius-button)] shadow-[var(--shadow-button)] hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2">
              {enriching ? 'Enriching...' : 'Enrich with AI'}
            </button>
            <button type="button" onClick={handleSaveAll} disabled={saving || leads.length === 0} className="cursor-pointer px-[var(--space-4)] py-[var(--space-2)] text-sm font-medium text-white bg-[var(--color-primary)] rounded-[var(--radius-button)] shadow-[var(--shadow-button)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2">
              {saving ? 'Saving...' : 'Save'}
            </button>
            <div className="relative" ref={actionsMenuRef}>
              <button
                type="button"
                onClick={() => setActionsMenuOpen((o) => !o)}
                className="cursor-pointer flex items-center justify-center rounded-[var(--radius-button)] border border-slate-200 bg-white px-[var(--space-3)] py-[var(--space-2)] text-sm font-medium text-slate-700 hover:bg-slate-50 focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
                aria-expanded={actionsMenuOpen}
                aria-haspopup="true"
                aria-label="More actions"
              >
                <MoreVertical className="h-5 w-5" aria-hidden />
              </button>
              {actionsMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-[var(--space-1)] w-56 rounded-[var(--radius-card)] border-default bg-white py-[var(--space-1)] shadow-[var(--shadow-dropdown)]" role="menu">
                  <div className="py-[var(--space-1)]" role="none">
                    <ExportCsvButton
                      leads={leads}
                      className="flex w-full items-center gap-[var(--space-2)] rounded-none border-0 bg-transparent py-[var(--space-2)] px-[var(--space-3)] text-left text-sm text-slate-700 hover:bg-slate-100 focus:ring-0"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => { handleGetInsights(); setActionsMenuOpen(false); }}
                    disabled={insightsLoading || leads.length === 0}
                    className="flex w-full items-center gap-[var(--space-2)] py-[var(--space-2)] px-[var(--space-3)] text-left text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                    role="menuitem"
                  >
                    <BarChart3 className="h-4 w-4" aria-hidden />
                    {insightsLoading ? 'Getting...' : 'Get Insights'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDetailsDrawerOpen(true); setActionsMenuOpen(false); }}
                    disabled={selectedIds.size === 0}
                    className="flex w-full items-center gap-[var(--space-2)] py-[var(--space-2)] px-[var(--space-3)] text-left text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                    role="menuitem"
                  >
                    <UserPlus className="h-4 w-4" aria-hidden />
                    Add details {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
                  </button>
                  <button
                    type="button"
                    onClick={() => { handleSaveAll(); setActionsMenuOpen(false); }}
                    disabled={saving || leads.length === 0}
                    className="flex w-full items-center gap-[var(--space-2)] py-[var(--space-2)] px-[var(--space-3)] text-left text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                    role="menuitem"
                  >
                    <Save className="h-4 w-4" aria-hidden />
                    {saving ? 'Saving...' : 'Save all'}
                  </button>
                  <div className="my-[var(--space-1)] border-t border-slate-100" role="none" />
                  <Link
                    to="/settings"
                    onClick={() => setActionsMenuOpen(false)}
                    className="flex w-full items-center gap-[var(--space-2)] py-[var(--space-2)] px-[var(--space-3)] text-left text-sm text-slate-700 hover:bg-slate-100"
                    role="menuitem"
                  >
                    Settings
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Mobile: FAB to open filter drawer */}
        <div className="md:hidden mb-[var(--space-4)] flex justify-end">
          <button
            type="button"
            onClick={() => setFilterDrawerOpen(true)}
            className="touch-target cursor-pointer flex items-center justify-center gap-[var(--space-2)] rounded-full bg-[var(--color-primary)] text-white shadow-lg px-[var(--space-4)] py-[var(--space-3)]"
            style={{ minHeight: 'var(--touch-min)', minWidth: 'var(--touch-min)' }}
            aria-label="Search and filters"
          >
            <SlidersHorizontal className="h-5 w-5" />
            <span className="text-sm font-medium">Filter</span>
          </button>
        </div>
        
        {error && <div className="mb-[var(--space-4)] rounded-[var(--radius-card)] bg-red-100 p-[var(--space-4)] text-sm text-red-700">{error}</div>}
        {saveMessage && <p className="mb-[var(--space-3)] text-sm text-green-600">{saveMessage}</p>}
        
        {loading ? (
          <div className="py-[var(--space-8)] flex justify-center items-start">
            <SearchProgressBar active={loading} />
          </div>
        ) : (
          <LeadCardGrid
            leads={leads}
            marketLabel={`${searchChips.specialty} in ${searchChips.city}`}
            selectedIds={selectedIds}
            onSelectLead={handleSelectLead}
          />
        )}

        {!loading && leads.length === 0 && (
            <div className="text-center py-[var(--space-8)] bg-white/80 backdrop-blur-sm rounded-[var(--radius-card)] border-default shadow-[var(--shadow-card)]">
                <h3 className="text-lg font-semibold text-[var(--color-navy)]">No leads found</h3>
                <p className="mt-[var(--space-2)] text-slate-500">Use the search bar above to find new leads.</p>
            </div>
        )}

        {showInsights && <AiPoweredInsights report={marketReport} onClose={() => setShowInsights(false)} qualificationScore={qualificationScore} />}
        <FilterDrawer
          open={filterDrawerOpen}
          onClose={() => setFilterDrawerOpen(false)}
          onSubmit={handleSearch}
          loading={loading}
          initialChips={searchChips}
          initialFilters={lastSearch?.filters ?? undefined}
        />
        {/* Mobile: sticky action bar above bottom nav */}
        {leads.length > 0 && (
          <div
            className="fixed left-0 right-0 z-30 md:hidden bottom-[56px] border-t border-slate-200 bg-white/95 backdrop-blur-sm px-[var(--edge-padding)] py-[var(--space-2)] flex items-center gap-[var(--space-2)]"
            style={{ paddingBottom: 'max(var(--space-2), env(safe-area-inset-bottom))' }}
          >
            <button
              type="button"
              onClick={handleEnrich}
              disabled={enriching}
              className="touch-target cursor-pointer flex-1 flex items-center justify-center gap-[var(--space-2)] rounded-[var(--radius-button)] bg-purple-600 text-white py-[var(--space-3)] text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ minHeight: 'var(--touch-min)' }}
            >
              <Sparkles className="h-4 w-4" />
              Enrich
            </button>
            <button
              type="button"
              onClick={() => setCampaignDrawerOpen(true)}
              className="touch-target cursor-pointer flex-1 flex items-center justify-center gap-[var(--space-2)] rounded-[var(--radius-button)] bg-gradient-to-r from-violet-500 to-[var(--color-primary)] text-white py-[var(--space-3)] text-sm font-medium"
              style={{ minHeight: 'var(--touch-min)' }}
            >
              <Mail className="h-4 w-4" />
              Campaign
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={saving}
              className="touch-target cursor-pointer flex-1 flex items-center justify-center gap-[var(--space-2)] rounded-[var(--radius-button)] bg-[var(--color-primary)] text-white py-[var(--space-3)] text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ minHeight: 'var(--touch-min)' }}
            >
              <Save className="h-4 w-4" />
              {saving ? '…' : 'Save'}
            </button>
          </div>
        )}
        <CampaignDrawer open={campaignDrawerOpen} onClose={() => setCampaignDrawerOpen(false)} leads={leads} />
        <LeadDetailsDrawer
          open={detailsDrawerOpen}
          onClose={() => setDetailsDrawerOpen(false)}
          leads={selectedLeads}
          onSave={handleSaveDetails}
          requireSavedFirst={requireSavedFirst}
          onSaveSelectedFirst={selectedLeads.length > 0 ? handleSaveSelectedFirst : undefined}
        />
      </div>
    </div>
  );
}