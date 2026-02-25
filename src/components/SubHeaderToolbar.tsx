import { X, MoreVertical, Save, BarChart3, UserPlus, MapPin, ChevronRight, Sparkles, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ExportCsvButton } from './ExportCsvButton';
import { SearchRibbon } from './SearchRibbon';
import { useGeo } from '../contexts/GeoContext';
import type { HotLead } from '../types/leads';
import type { SearchChips, SearchFilters } from './SearchBarWithChips';

export type SortKey = 'recommendation_score' | 'rating' | 'review_count' | 'name' | 'tier' | 'distance';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'recommendation_score', label: 'Recommended' },
  { value: 'rating', label: 'Rating' },
  { value: 'review_count', label: 'Reviews' },
  { value: 'name', label: 'Name' },
  { value: 'tier', label: 'Tier' },
  { value: 'distance', label: 'Distance' },
];

export interface SubHeaderToolbarProps {
  /** Sort key and order (controlled from parent so LeadCardGrid can use same values) */
  sortBy: SortKey;
  order: 'asc' | 'desc';
  onSortChange: (sortBy: SortKey, order: 'asc' | 'desc') => void;
  /** Show Distance in sort options when base point is set */
  showDistanceSort?: boolean;
  /** Called when user clicks "Set base point" (no base point set) */
  onSetBasePoint?: () => void;
  /** Current radius in km (shown in pill when base point is set) */
  radiusKm?: number;
  onOpenFilter: () => void;
  onCampaign: () => void;
  onEnrich: () => void;
  onSave: () => void;
  onGetInsights: () => void;
  onAddDetails: () => void;
  /** Export is in kebab menu */
  leads: HotLead[];
  saving: boolean;
  enriching: boolean;
  insightsLoading: boolean;
  hasSelection: boolean;
  selectedCount: number;
  disabled: boolean;
  actionsMenuOpen: boolean;
  onActionsMenuToggle: () => void;
  onActionsMenuClose: () => void;
  actionsMenuRef: React.RefObject<HTMLDivElement | null>;
  /** Search ribbon (desktop): submit handler and state */
  onRibbonSearch?: (chips: SearchChips, filters: SearchFilters) => void;
  searchLoading?: boolean;
  searchChips?: Partial<SearchChips>;
  searchFilters?: Partial<SearchFilters>;
}

export function SubHeaderToolbar({
  sortBy,
  order,
  onSortChange,
  showDistanceSort = false,
  onSetBasePoint: _onSetBasePoint,
  radiusKm = 5,
  onOpenFilter,
  onCampaign,
  onEnrich,
  onSave,
  onGetInsights,
  onAddDetails,
  leads,
  saving,
  enriching,
  insightsLoading,
  hasSelection,
  selectedCount,
  disabled,
  actionsMenuOpen,
  onActionsMenuToggle,
  onActionsMenuClose,
  actionsMenuRef,
  onRibbonSearch,
  searchLoading = false,
  searchChips = {},
  searchFilters = {},
}: SubHeaderToolbarProps) {
  const geo = useGeo();
  const basePoint = geo?.basePoint ?? null;
  const sortOptions = showDistanceSort
    ? SORT_OPTIONS
    : SORT_OPTIONS.filter((o) => o.value !== 'distance');

  return (
    <div
      className="sticky top-16 z-[var(--z-subheader)] min-h-[56px] py-2 flex items-center justify-between gap-[var(--space-3)] px-[var(--edge-padding)] md:px-[var(--space-4)] border-b border-slate-200/80 bg-white/80 backdrop-blur-xl"
      role="toolbar"
      aria-label="Filters and actions"
    >
      {/* Zone A left: Sort (desktop only) */}
      <div className="hidden md:flex items-center gap-2 shrink-0 order-1">
        <label className="text-sm text-slate-600">Sort</label>
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as SortKey, order)}
          className="rounded-[var(--radius-button)] border border-slate-200 bg-white px-2 py-1.5 text-sm shadow-[var(--shadow-soft)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] h-[40px] touch-target"
          aria-label="Sort by"
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={order}
          onChange={(e) => onSortChange(sortBy, e.target.value as 'asc' | 'desc')}
          className="rounded-[var(--radius-button)] border border-slate-200 bg-white px-2 py-1.5 text-sm shadow-[var(--shadow-soft)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] h-[40px] touch-target"
          aria-label="Order"
        >
          <option value="desc">Desc</option>
          <option value="asc">Asc</option>
        </select>
      </div>

      {/* Zone A center: Search ribbon (desktop) or search pill (when ribbon not used) */}
      <div className="order-2 flex-1 min-w-0 flex items-center gap-2">
        {onRibbonSearch ? (
          <>
            <SearchRibbon
              key={JSON.stringify({ c: searchChips.city, s: searchChips.specialty, r: searchChips.region })}
              onSubmit={onRibbonSearch}
              loading={searchLoading}
              initialChips={searchChips}
              initialFilters={searchFilters}
            />
            <button
              type="button"
              onClick={onOpenFilter}
              className="shrink-0 text-sm font-medium text-slate-600 hover:text-slate-900 focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 rounded-[var(--radius-button)] px-3 h-[40px] flex items-center"
              aria-label="More filters"
            >
              More filters
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onOpenFilter}
            className="flex-1 md:max-w-[640px] flex items-center gap-2 min-w-0 h-[40px] px-4 rounded-full bg-white/85 backdrop-blur-[16px] backdrop-saturate-[180%] border border-slate-200/70 shadow-[0_2px_12px_rgba(15,23,42,0.08)] text-left touch-target focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 focus:outline-none"
            aria-label="Open search and filters"
          >
            <MapPin className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
            <span className="min-w-0 flex-1 truncate text-sm text-slate-700 flex items-center gap-1">
              {basePoint ? (
                <>
                  <span title={basePoint.label || 'Your location'} className="truncate">{basePoint.label || 'Your location'}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      geo?.clearBasePoint();
                    }}
                    className="shrink-0 p-0.5 rounded-full hover:bg-slate-200 text-slate-500 hover:text-slate-700 touch-target min-h-[28px] min-w-[28px] flex items-center justify-center"
                    aria-label="Clear base point"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <span className="text-[var(--color-primary)] font-medium">Set your location →</span>
              )}
            </span>
            {basePoint && (
              <>
                <div className="w-px h-5 bg-slate-200 shrink-0" aria-hidden />
                <span className="text-sm font-bold text-[var(--color-primary)] whitespace-nowrap shrink-0 tabular-nums">
                  {radiusKm} km
                </span>
              </>
            )}
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          </button>
        )}
      </div>

      {/* Zone B: Action buttons (Campaign, Enrich, Save, Kebab) */}
      <div className="flex items-center gap-2 shrink-0 order-3">
        <button
          type="button"
          onClick={onCampaign}
          disabled={disabled}
          className="hidden sm:inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white rounded-[var(--radius-button)] bg-gradient-to-r from-violet-500 to-[var(--color-primary)] hover:from-violet-600 hover:to-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 min-h-[44px] touch-target"
        >
          Campaign
        </button>
        <button
          type="button"
          onClick={onEnrich}
          disabled={enriching || disabled}
          className="hidden sm:inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white rounded-[var(--radius-button)] bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 min-h-[44px] touch-target"
        >
          {enriching ? '…' : 'Enrich'}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || disabled}
          className="hidden sm:inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white rounded-[var(--radius-button)] bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 min-h-[44px] touch-target"
        >
          {saving ? '…' : 'Save'}
        </button>
        <div className="relative" ref={actionsMenuRef}>
          <button
            type="button"
            onClick={onActionsMenuToggle}
            className="touch-target flex items-center justify-center rounded-[var(--radius-button)] border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 min-h-[44px] min-w-[44px]"
            aria-expanded={actionsMenuOpen}
            aria-haspopup="true"
            aria-label="More actions"
          >
            <MoreVertical className="h-5 w-5" aria-hidden />
          </button>
          {actionsMenuOpen && (
            <div
              className="absolute right-0 top-full z-[var(--z-popover)] mt-1 w-56 rounded-[var(--radius-card)] border border-slate-200 bg-white py-1 shadow-[var(--shadow-dropdown)]"
              role="menu"
            >
              <ExportCsvButton
                leads={leads}
                iconOnly
                className="flex w-full items-center gap-2 rounded-none border-0 bg-transparent py-2 px-3 text-left text-sm text-slate-700 hover:bg-slate-100 focus:ring-0 min-h-[44px] touch-target"
              />
              <button
                type="button"
                onClick={() => { onEnrich(); onActionsMenuClose(); }}
                disabled={enriching || disabled}
                className="flex w-full items-center gap-2 py-2 px-3 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50 min-h-[44px] touch-target"
                role="menuitem"
              >
                <Sparkles className="h-4 w-4" aria-hidden />
                {enriching ? '…' : 'Enrich'}
              </button>
              <button
                type="button"
                onClick={() => { onCampaign(); onActionsMenuClose(); }}
                disabled={disabled}
                className="flex w-full items-center gap-2 py-2 px-3 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50 min-h-[44px] touch-target"
                role="menuitem"
              >
                <Mail className="h-4 w-4" aria-hidden />
                Campaign
              </button>
              <button
                type="button"
                onClick={() => { onGetInsights(); onActionsMenuClose(); }}
                disabled={insightsLoading || disabled}
                className="flex w-full items-center gap-2 py-2 px-3 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50 min-h-[44px] touch-target"
                role="menuitem"
              >
                <BarChart3 className="h-4 w-4" aria-hidden />
                {insightsLoading ? '…' : 'Get Insights'}
              </button>
              <button
                type="button"
                onClick={() => { onAddDetails(); onActionsMenuClose(); }}
                disabled={!hasSelection}
                className="flex w-full items-center gap-2 py-2 px-3 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50 min-h-[44px] touch-target"
                role="menuitem"
              >
                <UserPlus className="h-4 w-4" aria-hidden />
                Add details {selectedCount > 0 ? `(${selectedCount})` : ''}
              </button>
              <button
                type="button"
                onClick={() => { onSave(); onActionsMenuClose(); }}
                disabled={saving || disabled}
                className="flex w-full items-center gap-2 py-2 px-3 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50 min-h-[44px] touch-target"
                role="menuitem"
              >
                <Save className="h-4 w-4" aria-hidden />
                {saving ? '…' : 'Save all'}
              </button>
              <div className="my-1 border-t border-slate-100" role="none" />
              <Link
                to="/settings"
                onClick={onActionsMenuClose}
                className="flex w-full items-center gap-2 py-2 px-3 text-left text-sm text-slate-700 hover:bg-slate-100 min-h-[44px] touch-target"
                role="menuitem"
              >
                Settings
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
