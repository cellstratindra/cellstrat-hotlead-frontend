import { useEffect, useState, useCallback, useRef, useMemo, type FC } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { searchLeads, saveLeads, enrichLeads, fetchMarketInsights, bulkUpdateLeads, fetchDistances, fetchNearby, type ScoreWeights, type NearbyResponse } from '../api/client';
import type { HotLead, MarketInsightsResponse } from '../types/leads';
import { LeadCardGrid, getLeadSelectId, type SortKey } from '../components/LeadCardGrid';
import { exportLeadsToCsv, ExportCsvButton } from '../components/ExportCsvButton';
import { SubHeaderToolbar } from '../components/SubHeaderToolbar';
import { CampaignDrawer } from '../components/CampaignDrawer';
import { LeadDetailsDrawer, type LeadDetailsUpdates } from '../components/LeadDetailsDrawer';
import type { SearchChips, SearchFilters } from '../components/SearchBarWithChips';
import { SearchProgressBar } from '../components/SearchProgressBar';
import { FilterPanel } from '../components/FilterPanel';
import { ActiveFilterChips, type ActiveFilterChip } from '../components/ActiveFilterChips';
import { NoLocationPrompt } from '../components/NoLocationPrompt';
import { useSearchResults } from '../contexts/SearchResultsContext';
import { useFilterDrawer } from '../contexts/FilterDrawerContext';
import { useHeaderActions } from '../contexts/HeaderActionsContext';
import { useGeo } from '../contexts/GeoContext';
import { ProximityView } from '../components/ProximityView';
import { MapSplitView } from '../components/MapSplitView';
import { MapLeadPanel } from '../components/MapLeadPanel';
import { resultsToDistanceMap } from '../contexts/GeoContext';
import { geocodeAddress, reverseGeocode } from '../api/client';
import { X, MapPin } from 'lucide-react';

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
    <aside className="fixed top-16 right-[var(--space-4)] w-96 bg-white rounded-[var(--radius-card)] border-default shadow-[var(--shadow-dropdown)] p-[var(--space-6)] z-[var(--z-popover)]">
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
  const [searchChips, setSearchChips] = useState<SearchChips>(() => lastSearch?.searchChips ?? { country: 'India', region: 'India' });
  const [scoreWeights] = useState<ScoreWeights>(() => lastSearch?.scoreWeights ?? DEFAULT_SCORE_WEIGHTS);
  const [leads, setLeads] = useState<HotLead[]>(() => lastSearch?.leads ?? []);
  const [loading, setLoading] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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
  const { basePoint, setDistanceMap, setBasePoint, markLocationJustDetected, locationDetectedAt, locationMode, setLocationMode } = useGeo();
  const filterDrawerOpen = filterDrawer?.open ?? false;
  const setFilterDrawerOpen = filterDrawer ? (open: boolean) => (open ? filterDrawer.openDrawer() : filterDrawer.closeDrawer()) : () => { };
  const [proximityView, setProximityView] = useState<{ anchor: HotLead; nearby: NearbyResponse['nearby']; radiusKm: number } | null>(null);
  const [proximityLoading, setProximityLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('recommendation_score');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [savedPlaceIds, setSavedPlaceIds] = useState<Set<string>>(new Set());
  const [mapExpanded, setMapExpanded] = useState(true); // default open on mobile so location + nearby pins are visible
  const [mapSelectedLead, setMapSelectedLead] = useState<HotLead | null>(null);
  const mapExpandedRef = useRef(mapExpanded);
  mapExpandedRef.current = mapExpanded;
  const savedMapState = useRef<boolean | null>(null);

  const leadsWithCoords = useMemo(
    () => leads.filter((l) => l.latitude != null && l.longitude != null) as (HotLead & { latitude: number; longitude: number })[],
    [leads]
  );
  const mapCentroid = useMemo(() => {
    if (leadsWithCoords.length === 0) return null;
    const sumLat = leadsWithCoords.reduce((a, l) => a + l.latitude, 0);
    const sumLng = leadsWithCoords.reduce((a, l) => a + l.longitude, 0);
    return { lat: sumLat / leadsWithCoords.length, lng: sumLng / leadsWithCoords.length };
  }, [leadsWithCoords]);
  const effectiveMapCenter = mapCenter ?? mapCentroid;
  const effectiveRadiusKm = searchChips.radius_km ?? 10;
  const showMap = leadsWithCoords.length > 0 && effectiveMapCenter != null;

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
    setSelectedIds(new Set());
  }, [leads]);

  useEffect(() => {
    setSavedPlaceIds(new Set());
  }, [leads]);

  // Auto-collapse map on mobile when lead detail panel opens; restore on close
  useEffect(() => {
    if (mapSelectedLead) {
      if (savedMapState.current === null) {
        savedMapState.current = mapExpandedRef.current;
        setMapExpanded(false);
      }
    } else if (savedMapState.current !== null) {
      setMapExpanded(savedMapState.current);
      savedMapState.current = null;
    }
  }, [mapSelectedLead]);

  // When base point is set and we have leads with coordinates, fetch distances and store in Geo context
  useEffect(() => {
    if (!basePoint || leads.length === 0) {
      if (!basePoint) setDistanceMap({});
      return;
    }
    const withCoords = leads.filter(
      (l) => l.latitude != null && l.longitude != null
    ) as (HotLead & { latitude: number; longitude: number })[];
    if (withCoords.length === 0) {
      setDistanceMap({});
      return;
    }
    let cancelled = false;
    fetchDistances(basePoint.lat, basePoint.lng, withCoords.map((l) => ({ place_id: l.place_id, latitude: l.latitude, longitude: l.longitude })))
      .then((results) => {
        if (!cancelled) setDistanceMap(resultsToDistanceMap(results));
      })
      .catch(() => {
        if (!cancelled) setDistanceMap({});
      });
    return () => { cancelled = true; };
  }, [basePoint, leads, setDistanceMap]);

  const handleLocateMeRef = useRef<(lat: number, lng: number) => void>(() => {});
  useEffect(() => {
    if (!navigator.geolocation) return;
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        const { latitude: lat, longitude: lng } = pos.coords;
        setBasePoint({ lat, lng, label: 'Current location' });
        markLocationJustDetected();
        setMapCenter({ lat, lng });
        setSearchChips((prev) => ({
          ...prev,
          center_place: 'Current location',
          center_lat: lat,
          center_lng: lng,
          radius_km: prev.radius_km ?? 5,
        }));
        reverseGeocode(lat, lng)
          .then(({ name }) => {
            if (!cancelled) {
              setBasePoint({ lat, lng, label: name });
              markLocationJustDetected();
            }
          })
          .catch(() => {});
      },
      () => { /* ignore deny/timeout on auto-detect */ },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
    return () => { cancelled = true; };
  }, []); // run once on mount for GPS auto-detect; populates location only, no auto-search

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
      setSavedPlaceIds((prev) => new Set([...prev, ...leads.map((l) => l.place_id)]));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const handleSaveOneLead = useCallback(
    async (lead: HotLead) => {
      setError(null);
      setSaveMessage(null);
      try {
        await saveLeads([lead], searchChips.city || undefined, searchChips.specialty || undefined, searchChips.region?.trim() || undefined, user?.id ?? undefined);
        setSaveMessage('Lead saved to My Leads.');
        setSavedPlaceIds((prev) => new Set([...prev, lead.place_id]));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Save failed');
      }
    },
    [searchChips.city, searchChips.specialty, searchChips.region, user?.id]
  );

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

  // Map center: use coordinates when present (e.g. "Current location"), or basePoint from context, otherwise geocode the place string
  useEffect(() => {
    const { center_place, center_lat, center_lng, radius_km } = searchChips;
    if (!radius_km) {
      setMapCenter(null);
      return;
    }
    if (center_lat != null && center_lng != null) {
      setMapCenter({ lat: center_lat, lng: center_lng });
      return;
    }
    const place = center_place?.trim();
    if (!place) {
      setMapCenter(null);
      return;
    }
    // "Current location" is from GPS – use basePoint coords so we don't geocode the string
    if (place === 'Current location' && basePoint?.label === 'Current location') {
      setMapCenter({ lat: basePoint.lat, lng: basePoint.lng });
      return;
    }
    let cancelled = false;
    geocodeAddress(place).then(({ lat, lng }) => {
      if (!cancelled) setMapCenter({ lat, lng });
    }).catch(() => {
      if (!cancelled) setMapCenter(null);
    });
    return () => { cancelled = true };
  }, [searchChips.center_place, searchChips.center_lat, searchChips.center_lng, searchChips.radius_km, basePoint]);

  async function handleSearch(chips: SearchChips, filters: SearchFilters) {
    setError(null);
    setSearchChips(chips);
    setLoading(true);
    try {
      // When center is "Current location", send coordinates so the backend doesn't geocode the string
      const searchParams = {
        ...chips,
        ...filters,
        score_weights: scoreWeights,
        min_rating: Number(filters.min_rating),
        min_review_count: Number(filters.min_review_count),
        budget_max: Number(filters.budget_max)
      };
      if (chips.center_place?.trim() === 'Current location' && basePoint?.label === 'Current location' && (searchParams.center_lat == null || searchParams.center_lng == null)) {
        searchParams.center_lat = basePoint.lat;
        searchParams.center_lng = basePoint.lng;
      }
      const res = await searchLeads(searchParams);
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

  async function handleFindNearby(lead: HotLead) {
    if (lead.latitude == null || lead.longitude == null) return;
    setProximityLoading(true);
    setProximityView(null);
    try {
      const res = await fetchNearby(lead.place_id, lead.latitude, lead.longitude, 5, searchChips.specialty || undefined);
      setProximityView({ anchor: res.anchor, nearby: res.nearby, radiusKm: 5 });
    } catch {
      setProximityView(null);
    } finally {
      setProximityLoading(false);
    }
  }

  async function handleProximityRadiusChange(newKm: number) {
    if (!proximityView) return;
    setProximityLoading(true);
    try {
      const res = await fetchNearby(
        proximityView.anchor.place_id,
        proximityView.anchor.latitude!,
        proximityView.anchor.longitude!,
        newKm,
        searchChips.specialty || undefined
      );
      setProximityView((prev) => (prev ? { ...prev, anchor: res.anchor, nearby: res.nearby, radiusKm: newKm } : null));
    } finally {
      setProximityLoading(false);
    }
  }

  const handleLocateMe = useCallback(
    (lat: number, lng: number) => {
      setBasePoint({ lat, lng, label: 'Current location' });
      markLocationJustDetected();
      setMapCenter({ lat, lng });
      const defaultFilters = lastSearch?.filters ?? {
        sort_by: 'recommendation_score',
        order: 'desc',
        min_rating: '',
        min_review_count: '',
        has_phone: false,
        budget_max: '',
      } as SearchFilters;
      handleSearch(
        {
          ...searchChips,
          center_place: 'Current location',
          center_lat: lat,
          center_lng: lng,
          radius_km: searchChips.radius_km ?? 5,
        },
        defaultFilters
      );
      reverseGeocode(lat, lng)
        .then(({ name }) => {
          setBasePoint({ lat, lng, label: name });
          markLocationJustDetected();
        })
        .catch(() => { /* keep "Current location" */ });
    },
    [setBasePoint, markLocationJustDetected, searchChips, lastSearch?.filters]
  );

  handleLocateMeRef.current = handleLocateMe;

  const handleSearchThisArea = useCallback(
    (center: { lat: number; lng: number }, radiusKm: number) => {
      setMapCenter(center);
      const defaultFilters = lastSearch?.filters ?? {
        sort_by: 'recommendation_score',
        order: 'desc',
        min_rating: '',
        min_review_count: '',
        has_phone: false,
        budget_max: '',
      } as SearchFilters;
      handleSearch(
        {
          ...searchChips,
          center_place: undefined,
          center_lat: center.lat,
          center_lng: center.lng,
          radius_km: radiusKm,
        },
        defaultFilters
      );
    },
    [searchChips, lastSearch?.filters]
  );

  const handleShowOnMap = useCallback(() => {
    if (mapSelectedLead?.latitude != null && mapSelectedLead?.longitude != null) {
      setMapCenter({ lat: mapSelectedLead.latitude, lng: mapSelectedLead.longitude });
    }
    savedMapState.current = true;
    setMapSelectedLead(null);
  }, [mapSelectedLead]);

  const marketLabel = [searchChips.specialty, searchChips.city || searchChips.country].filter(Boolean).join(' in ') || null;

  return (
    <div className="bg-[var(--color-canvas)] min-h-full font-[family-name:var(--font-sans)] flex flex-col">
      {/* Sub-Header Toolbar: desktop only; on mobile we use header filter + Actions FAB */}
      <div className="hidden md:block">
        <SubHeaderToolbar
          sortBy={sortBy}
          order={order}
          onSortChange={(s, o) => { setSortBy(s); setOrder(o); }}
          showDistanceSort={!!basePoint}
          onSetBasePoint={() => filterDrawer?.openDrawer()}
          radiusKm={searchChips.radius_km ?? 5}
          onOpenFilter={() => filterDrawer?.openDrawer()}
          onCampaign={() => setCampaignDrawerOpen(true)}
          onEnrich={handleEnrich}
          onSave={handleSaveAll}
          onGetInsights={handleGetInsights}
          onAddDetails={() => setDetailsDrawerOpen(true)}
          leads={leads}
          saving={saving}
          enriching={enriching}
          insightsLoading={insightsLoading}
          hasSelection={selectedIds.size > 0}
          selectedCount={selectedIds.size}
          disabled={leads.length === 0}
          actionsMenuOpen={actionsMenuOpen}
          onActionsMenuToggle={() => setActionsMenuOpen((o) => !o)}
          onActionsMenuClose={() => setActionsMenuOpen(false)}
          actionsMenuRef={actionsMenuRef}
          onRibbonSearch={handleSearch}
          searchLoading={loading}
          searchChips={searchChips}
          searchFilters={lastSearch?.filters ?? undefined}
        />
      </div>
      {/* Mobile: floating Actions button (replaces fixed toolbar) */}
      <div className="md:hidden fixed right-[var(--edge-padding)] z-[var(--z-bottom-nav)] flex flex-col items-end" style={{ bottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px) + var(--space-4))' }}>
        {actionsMenuOpen && (
          <>
            <div className="fixed inset-0 z-[var(--z-backdrop)] bg-black/20" aria-hidden onClick={() => setActionsMenuOpen(false)} />
            <div className="absolute bottom-full right-0 mb-2 w-56 rounded-[var(--radius-card)] border border-slate-200 bg-white py-1 shadow-[var(--shadow-elevated)] z-[var(--z-popover)]" role="menu">
              <ExportCsvButton leads={leads} className="flex w-full items-center gap-2 rounded-none border-0 bg-transparent py-2 px-3 text-left text-sm text-slate-700 hover:bg-slate-100 min-h-[44px] touch-target" />
              <button type="button" onClick={() => { handleEnrich(); setActionsMenuOpen(false); }} disabled={enriching || leads.length === 0} className="flex w-full items-center gap-2 py-2 px-3 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50 min-h-[44px] touch-target" role="menuitem">Enrich</button>
              <button type="button" onClick={() => { setCampaignDrawerOpen(true); setActionsMenuOpen(false); }} disabled={leads.length === 0} className="flex w-full items-center gap-2 py-2 px-3 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50 min-h-[44px] touch-target" role="menuitem">Campaign</button>
              <button type="button" onClick={() => { handleGetInsights(); setActionsMenuOpen(false); }} disabled={insightsLoading || leads.length === 0} className="flex w-full items-center gap-2 py-2 px-3 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50 min-h-[44px] touch-target" role="menuitem">{insightsLoading ? '…' : 'Get Insights'}</button>
              <button type="button" onClick={() => { setDetailsDrawerOpen(true); setActionsMenuOpen(false); }} disabled={selectedIds.size === 0} className="flex w-full items-center gap-2 py-2 px-3 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50 min-h-[44px] touch-target" role="menuitem">Add details {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}</button>
              <button type="button" onClick={() => { handleSaveAll(); setActionsMenuOpen(false); }} disabled={saving || leads.length === 0} className="flex w-full items-center gap-2 py-2 px-3 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50 min-h-[44px] touch-target" role="menuitem">{saving ? '…' : 'Save all'}</button>
              <div className="my-1 border-t border-slate-100" role="none" />
              <Link to="/settings" onClick={() => setActionsMenuOpen(false)} className="flex w-full items-center gap-2 py-2 px-3 text-left text-sm text-slate-700 hover:bg-slate-100 min-h-[44px] touch-target" role="menuitem">Settings</Link>
            </div>
          </>
        )}
        <button
          type="button"
          onClick={() => setActionsMenuOpen((o) => !o)}
          className="touch-target flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-[var(--shadow-elevated)] hover:bg-[var(--color-primary-hover)] focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
          aria-label="Actions"
          aria-expanded={actionsMenuOpen}
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
        </button>
      </div>
      {(() => {
        const defaultFilters = lastSearch?.filters ?? { sort_by: 'recommendation_score', order: 'desc', min_rating: '', min_review_count: '', has_phone: false, budget_max: '' } as SearchFilters;
        const chips: ActiveFilterChip[] = [];
        if (searchChips.center_place?.trim() && searchChips.radius_km != null) {
          chips.push({ id: 'location', label: `${searchChips.center_place.trim()}, ${searchChips.radius_km} km`, icon: 'location' });
        }
        if (searchChips.specialty && searchChips.specialty !== 'All medical facilities') {
          chips.push({ id: 'specialty', label: `Specialty: ${searchChips.specialty}`, icon: 'specialty' });
        }
        if (defaultFilters.min_rating) {
          chips.push({ id: 'rating', label: `Rating ${defaultFilters.min_rating}+`, icon: 'rating' });
        }
        if (searchChips.place_query?.trim()) {
          const q = searchChips.place_query.trim();
          chips.push({ id: 'place', label: q.length > 20 ? `${q.slice(0, 20)}…` : q, icon: 'place' });
        }
        return (
          <ActiveFilterChips
            chips={chips}
            onRemove={(id) => {
              if (id === 'location') handleSearch({ ...searchChips, center_place: undefined, radius_km: undefined }, defaultFilters);
              else if (id === 'specialty') handleSearch({ ...searchChips, specialty: undefined }, defaultFilters);
              else if (id === 'rating') handleSearch(searchChips, { ...defaultFilters, min_rating: '' });
              else if (id === 'place') handleSearch({ ...searchChips, place_query: undefined }, defaultFilters);
            }}
            onClearAll={() => handleSearch(
              { city: undefined, country: 'India', region: searchChips.region || 'India', specialty: undefined, center_place: undefined, radius_km: undefined, place_query: undefined },
              defaultFilters
            )}
            onOpenFilter={() => filterDrawer?.openDrawer()}
          />
        );
      })()}
      <div className="flex-1 min-w-0 w-full max-w-screen-xl mx-auto px-[var(--edge-padding)] md:px-[var(--space-6)] py-[var(--space-4)] overflow-x-hidden">
        {leads.length > 0 && (
          <div className="py-[var(--space-4)] mb-[var(--space-2)]">
            <p className="text-sm font-medium text-slate-600">
              {leads.length} lead{leads.length !== 1 ? 's' : ''}
              {searchChips.specialty && (searchChips.city || searchChips.country) && (
                <span className="text-slate-500"> · {searchChips.specialty} in {searchChips.city || searchChips.country}</span>
              )}
            </p>
          </div>
        )}
        {error && <div className="mb-[var(--space-4)] rounded-[var(--radius-card)] bg-red-100 p-[var(--space-4)] text-sm text-red-700">{error}</div>}
        {saveMessage && <p className="mb-[var(--space-3)] text-sm text-green-600">{saveMessage}</p>}

        {loading ? (
          <div className="py-[var(--space-8)] flex justify-center items-start">
            <SearchProgressBar active={loading} />
          </div>
        ) : proximityView ? (
          <ProximityView
            anchor={proximityView.anchor}
            nearby={proximityView.nearby}
            radiusKm={proximityView.radiusKm}
            onClear={() => setProximityView(null)}
            onRadiusChange={handleProximityRadiusChange}
            loading={proximityLoading}
          />
        ) : (
          <>
            {/* Mobile: collapsible map drawer + lead cards */}
            <div className="lg:hidden">
              {showMap && effectiveMapCenter && (
                <>
                <div className="mb-[var(--space-3)] flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-navy)] flex items-center gap-1.5">
                      {locationDetectedAt != null && Date.now() - locationDetectedAt < 4000 && (
                        <MapPin className="h-4 w-4 shrink-0 text-[var(--color-primary)] animate-pulse" aria-hidden />
                      )}
                      Map view
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {basePoint && (searchChips.center_place?.trim() === 'Current location' || searchChips.center_lat != null) ? (basePoint.label || 'Your location') : (searchChips.center_place?.trim() || 'Search area')} · {effectiveRadiusKm} km · {leads.length} lead{leads.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                    <button
                      type="button"
                      onClick={() => setMapExpanded((e) => !e)}
                      className="shrink-0 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-[var(--space-3)] py-[var(--space-2)] text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 min-h-[44px] touch-target"
                    >
                      {mapExpanded ? 'Hide map' : 'Show map'}
                    </button>
                  </div>
                  <div className={`overflow-hidden transition-all duration-300 ease-out rounded-[var(--radius-card)] border border-slate-200/80 shadow-[var(--shadow-card)] isolate ${mapExpanded ? 'max-h-[40vh]' : 'max-h-0'}`}>
                    <MapSplitView
                      leads={leads}
                      centerLat={effectiveMapCenter.lat}
                      centerLng={effectiveMapCenter.lng}
                      radiusKm={effectiveRadiusKm}
                      height="40vh"
                      onLocateMe={handleLocateMe}
                      onLeadFocus={(lead) => setMapSelectedLead(lead)}
                      onSearchThisArea={handleSearchThisArea}
                    />
                  </div>
                </>
              )}
              <LeadCardGrid
                leads={leads}
                sortBy={sortBy}
                order={order}
                marketLabel={marketLabel}
                selectedIds={selectedIds}
                onSelectLead={handleSelectLead}
                onFindNearby={handleFindNearby}
                onSave={handleSaveOneLead}
                savedPlaceIds={savedPlaceIds}
                onLocateOnMap={(lat, lng) => setMapCenter({ lat, lng })}
              />
            </div>
            {/* Desktop: side-by-side grid (leads left, sticky map right) */}
            <div
              className={`hidden lg:grid gap-4 ${showMap ? 'lg:grid-cols-[1fr_minmax(320px,40%)]' : 'lg:grid-cols-1'}`}
            >
              <div className="min-h-0 overflow-y-auto">
                <LeadCardGrid
                  leads={leads}
                  sortBy={sortBy}
                  order={order}
                  marketLabel={marketLabel}
                  selectedIds={selectedIds}
                  onSelectLead={handleSelectLead}
                  onFindNearby={handleFindNearby}
                  onSave={handleSaveOneLead}
                  savedPlaceIds={savedPlaceIds}
                  onLocateOnMap={(lat, lng) => setMapCenter({ lat, lng })}
                />
              </div>
              {showMap && effectiveMapCenter && (
                <div className="sticky top-[7.5rem] isolate" style={{ height: 'calc(100vh - 8rem)' }}>
                  <MapSplitView
                    leads={leads}
                    centerLat={effectiveMapCenter.lat}
                    centerLng={effectiveMapCenter.lng}
                    radiusKm={effectiveRadiusKm}
                    height="100%"
                    onLocateMe={handleLocateMe}
                    onLeadFocus={(lead) => setMapSelectedLead(lead)}
                    onSearchThisArea={handleSearchThisArea}
                  />
                </div>
              )}
            </div>
          </>
        )}

        {!loading && leads.length === 0 && !basePoint && (
          <div className="rounded-[var(--radius-card)] border border-slate-200/80 bg-white shadow-[var(--shadow-card)] p-[var(--space-8)]">
            <NoLocationPrompt
              onUseCurrentLocation={() => filterDrawer?.openDrawer()}
              onTypeAddress={() => filterDrawer?.openDrawer()}
            />
          </div>
        )}
        {!loading && leads.length === 0 && basePoint && (
          <div className="text-center py-[var(--space-8)] px-[var(--space-6)] rounded-[var(--radius-card)] border border-slate-200/80 bg-white shadow-[var(--shadow-card)]">
            <h3 className="text-lg font-semibold text-[var(--color-navy)]">No leads found</h3>
            <p className="mt-[var(--space-3)] text-slate-500">Adjust your search or filters above to find leads in this area.</p>
          </div>
        )}

        {showInsights && <AiPoweredInsights report={marketReport} onClose={() => setShowInsights(false)} qualificationScore={qualificationScore} />}
        <FilterPanel
          open={filterDrawerOpen}
          onClose={() => setFilterDrawerOpen(false)}
          onSubmit={handleSearch}
          loading={loading}
          initialChips={searchChips}
          initialFilters={lastSearch?.filters ?? undefined}
        />
        <CampaignDrawer open={campaignDrawerOpen} onClose={() => setCampaignDrawerOpen(false)} leads={leads} />
        <LeadDetailsDrawer
          open={detailsDrawerOpen}
          onClose={() => setDetailsDrawerOpen(false)}
          leads={selectedLeads}
          onSave={handleSaveDetails}
          requireSavedFirst={requireSavedFirst}
          onSaveSelectedFirst={selectedLeads.length > 0 ? handleSaveSelectedFirst : undefined}
        />
        {mapSelectedLead && (
          <MapLeadPanel
            lead={mapSelectedLead}
            onClose={() => setMapSelectedLead(null)}
            onSave={handleSaveOneLead}
            isSaved={savedPlaceIds.has(mapSelectedLead.place_id)}
            specialty={searchChips.specialty ?? undefined}
            onShowOnMap={handleShowOnMap}
          />
        )}
      </div>
    </div>
  );
}