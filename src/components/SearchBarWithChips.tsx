import { useState } from 'react';
import { Search } from 'lucide-react';
import { INDIA_CITIES, CITY_OTHER, CITY_ALL } from '../constants/cities';
import { HEALTHCARE_SPECIALTIES, SPECIALTY_OTHER, SPECIALTY_ALL } from '../constants/specialties';

export interface SearchFilters {
  sort_by: string;
  order: string;
  min_rating: string;
  min_review_count: string;
  has_phone: boolean;
  budget_max: string;
}

export interface SearchChips {
  /** When empty/undefined, search uses country only (e.g. all clinics in India). */
  city?: string;
  /** When empty/undefined, search is specialty-agnostic (all medical facilities). */
  specialty?: string;
  region: string;
  /** Country for country-level search when city is omitted (e.g. "India"). */
  country?: string;
  /** Optional: search by clinic/business name */
  place_query?: string;
  /** Optional: natural-language search (e.g. "all hospitals in Bangalore within 10 km of Whitefield") */
  nl_query?: string;
  /** Optional: radius search center (geocoded by backend if no coords) */
  center_place?: string;
  /** Optional: radius center coordinates (use when center is from GPS; backend uses these instead of geocoding center_place) */
  center_lat?: number;
  center_lng?: number;
  /** Optional: radius in km (1-50) when center_place or center_lat/lng is set */
  radius_km?: number;
}

const defaultFilters: SearchFilters = {
  sort_by: 'recommendation_score',
  order: 'desc',
  min_rating: '',
  min_review_count: '',
  has_phone: false,
  budget_max: '',
};

interface SearchBarProps {
  onSubmit: (chips: SearchChips, filters: SearchFilters) => void;
  loading: boolean;
  initialChips?: Partial<SearchChips>;
  initialFilters?: Partial<SearchFilters>;
  /** Optional form id for external submit button (e.g. in FilterPanel) */
  formId?: string;
  /** When true, hide radius slider and center place row (used when FilterPanel provides them) */
  hideRadiusAndCenter?: boolean;
  /** When true, visually disable city/region/address (e.g. when GPS location mode is active) */
  disableLocationFilters?: boolean;
}

export function SearchBarWithChips({ onSubmit, loading, initialChips = {}, initialFilters = {}, formId, hideRadiusAndCenter = false, disableLocationFilters = false }: SearchBarProps) {
  const [search, setSearch] = useState<SearchChips>(() => {
    const city = initialChips.city ?? CITY_ALL;
    const specialty = initialChips.specialty ?? '';
    const region = initialChips.region || 'India';
    const cityState = !city || city === CITY_ALL ? CITY_ALL : (INDIA_CITIES.includes(city as (typeof INDIA_CITIES)[number]) ? city : CITY_OTHER);
    return {
      city: cityState,
      specialty: specialty === '' ? SPECIALTY_ALL : HEALTHCARE_SPECIALTIES.includes(specialty as (typeof HEALTHCARE_SPECIALTIES)[number]) ? specialty : SPECIALTY_OTHER,
      region: !region || region === 'India' ? 'India' : 'Other',
      country: initialChips.country || (region === 'India' ? 'India' : undefined),
    };
  });
  const [customCity, setCustomCity] = useState(() =>
    initialChips.city && !INDIA_CITIES.includes(initialChips.city as (typeof INDIA_CITIES)[number]) ? initialChips.city : ''
  );
  const [customSpecialty, setCustomSpecialty] = useState(() =>
    initialChips.specialty && initialChips.specialty !== SPECIALTY_ALL && !HEALTHCARE_SPECIALTIES.includes(initialChips.specialty as (typeof HEALTHCARE_SPECIALTIES)[number]) ? initialChips.specialty : ''
  );
  const [customRegion, setCustomRegion] = useState(() =>
    initialChips.region && initialChips.region !== 'India' ? initialChips.region : ''
  );
  const [query, setQuery] = useState('');
  const [placeQuery, setPlaceQuery] = useState(() => initialChips.place_query ?? '');
  const [searchMode, setSearchMode] = useState<'filters' | 'natural_language'>(() =>
    initialChips.nl_query ? 'natural_language' : 'filters'
  );
  const [nlQueryText, setNlQueryText] = useState(() => initialChips.nl_query ?? '');
  const [radiusKm, setRadiusKm] = useState(() => initialChips.radius_km ?? 5);
  const [centerPlace, setCenterPlace] = useState(() => initialChips.center_place ?? '');

  /** Sample queries that work with the AI parser (city + specialty, optional region/radius/center). */
  const SAMPLE_QUERIES = [
    'Cancer specialty in Bangalore India',
    'All hospitals in Bangalore',
    'Dentists in Mumbai',
    'Clinics in Bangalore within 10 km of Whitefield',
    'General practice in Pune India',
    'Cardiologists in Delhi',
  ];

  function runSampleQuery(sample: string) {
    const cityValue = search.city === CITY_OTHER ? customCity.trim() : (search.city === CITY_ALL ? '' : search.city);
    const specialtyValue = search.specialty === SPECIALTY_OTHER ? customSpecialty.trim() : (search.specialty === SPECIALTY_ALL ? undefined : search.specialty);
    const regionValue = search.region === 'Other' ? customRegion.trim() : search.region;
    const submissionChips: SearchChips = {
      city: cityValue || undefined,
      country: !cityValue ? (regionValue || 'India') : undefined,
      specialty: specialtyValue ?? (search.specialty === SPECIALTY_ALL ? undefined : search.specialty),
      region: regionValue || search.region,
      nl_query: sample.trim(),
    };
    onSubmit(submissionChips, filters);
  }

  const filters = { ...defaultFilters, ...initialFilters };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cityValue = search.city === CITY_OTHER ? customCity.trim() : (search.city === CITY_ALL ? '' : search.city);
    const specialtyValue = search.specialty === SPECIALTY_OTHER ? customSpecialty.trim() : (search.specialty === SPECIALTY_ALL ? undefined : search.specialty);
    const regionValue = search.region === 'Other' ? customRegion.trim() : search.region;
    const specialtyWithKeywords = query.trim() && specialtyValue ? `${specialtyValue} ${query.trim()}`.trim() : specialtyValue;
    const submissionChips: SearchChips = {
      city: cityValue || undefined,
      country: !cityValue ? (regionValue || 'India') : undefined,
      specialty: specialtyWithKeywords ?? (search.specialty === SPECIALTY_ALL ? undefined : search.specialty),
      region: regionValue || search.region,
      place_query: searchMode === 'filters' ? (placeQuery.trim() || undefined) : undefined,
      nl_query: searchMode === 'natural_language' && nlQueryText.trim() ? nlQueryText.trim() : undefined,
      center_place: centerPlace.trim() || undefined,
      radius_km: centerPlace.trim() ? radiusKm : undefined,
    };
    onSubmit(submissionChips, filters);
  }

  const inputStyle =
    "w-full h-[var(--input-height,40px)] rounded-[var(--radius-button)] border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-[var(--shadow-soft)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:outline-none relative z-0";
  const selectWrapperStyle = "relative z-10";

  function runLocationFirst() {
    const cityValue = search.city === CITY_OTHER ? customCity.trim() : (search.city === CITY_ALL ? '' : search.city);
    const regionValue = search.region === 'Other' ? customRegion.trim() : search.region;
    const submissionChips: SearchChips = {
      city: cityValue || undefined,
      country: !cityValue ? (regionValue || 'India') : undefined,
      specialty: undefined,
      region: regionValue || search.region,
      place_query: placeQuery.trim() || undefined,
      center_place: centerPlace.trim() || undefined,
      radius_km: centerPlace.trim() ? radiusKm : undefined,
    };
    onSubmit(submissionChips, filters);
  }

  const isLocationFirst = !search.specialty || search.specialty === SPECIALTY_ALL;

  return (
    <div>
      <div className="flex gap-[var(--space-2)] mb-[var(--space-4)]">
        <button
          type="button"
          onClick={() => setSearchMode('filters')}
          className={`px-[var(--space-3)] py-[var(--space-2)] rounded-[var(--radius-button)] text-sm font-medium transition-colors ${searchMode === 'filters' ? 'bg-[var(--color-primary)] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          aria-pressed={searchMode === 'filters'}
        >
          Filters
        </button>
        <button
          type="button"
          onClick={() => setSearchMode('natural_language')}
          className={`px-[var(--space-3)] py-[var(--space-2)] rounded-[var(--radius-button)] text-sm font-medium transition-colors ${searchMode === 'natural_language' ? 'bg-[var(--color-primary)] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          aria-pressed={searchMode === 'natural_language'}
        >
          Chat with AI
        </button>
      </div>
    <form id={formId} onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
      {searchMode === 'natural_language' ? (
        <>
          <div className="md:col-span-5 flex flex-col gap-[var(--space-2)]">
            <label htmlFor="search-nl-query" className="sr-only">Chat with AI search</label>
            <input
              id="search-nl-query"
              type="text"
              value={nlQueryText}
              onChange={e => setNlQueryText(e.target.value)}
              placeholder="e.g. Cancer specialty in Bangalore India, or clinics within 10 km of Whitefield"
              className={`${inputStyle} placeholder:text-slate-400`}
              aria-label="Chat with AI search"
            />
            <div className="flex flex-nowrap overflow-x-auto gap-[var(--space-2)] pb-1 -mx-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent" style={{ scrollbarWidth: 'thin' }}>
              <span className="shrink-0 text-xs text-slate-500 self-center">Try:</span>
              {SAMPLE_QUERIES.map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => runSampleQuery(sample)}
                  disabled={loading}
                  className="shrink-0 inline-flex items-center px-[var(--space-3)] py-2 min-h-[44px] rounded-full text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-1 disabled:opacity-50 whitespace-nowrap touch-target"
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>
          <div className="md:col-span-1">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-[40px] flex items-center justify-center gap-[var(--space-2)] rounded-[var(--radius-button)] bg-[var(--color-primary)] px-[var(--space-4)] text-sm font-semibold text-white shadow-[var(--shadow-button)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition-colors focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
            >
              <Search size={16} />
              {loading ? 'Searching…' : 'Search'}
            </button>
          </div>
        </>
      ) : (
        <>
      {/* Location-first / All medical facilities one-click chip (hidden in FilterPanel to save space) */}
      {!hideRadiusAndCenter && (
      <div className="md:col-span-6 flex flex-wrap items-center gap-2 mb-2">
        <span className="text-xs text-slate-500">Search:</span>
        <button
          type="button"
          onClick={runLocationFirst}
          disabled={loading}
          className={`touch-target inline-flex items-center min-h-[44px] rounded-full px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
            isLocationFirst
              ? 'bg-[var(--color-primary)] text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
          aria-pressed={isLocationFirst}
        >
          All medical facilities
        </button>
        <span className="text-xs text-slate-500">or choose a specialty below</span>
      </div>
      )}
      <div className={`md:col-span-1 ${selectWrapperStyle} ${disableLocationFilters ? 'opacity-50 pointer-events-none' : ''}`}>
        <label htmlFor="search-city" className="sr-only">City</label>
        <select
          id="search-city"
          value={search.city === CITY_ALL ? CITY_ALL : (INDIA_CITIES.includes(search.city as typeof INDIA_CITIES[number]) ? search.city : CITY_OTHER)}
          onChange={e => setSearch(s => ({ ...s, city: e.target.value }))}
          className={inputStyle}
          disabled={disableLocationFilters}
        >
          <option value={CITY_ALL}>All</option>
          {INDIA_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          <option value={CITY_OTHER}>Other</option>
        </select>
        {search.city === CITY_OTHER && (
          <input
            type="text"
            value={customCity}
            onChange={e => setCustomCity(e.target.value)}
            placeholder="Enter city name"
            className={`${inputStyle} mt-2 shadow-[var(--shadow-dropdown)]`}
            aria-label="Custom city"
          />
        )}
      </div>
      <div className={`md:col-span-1 ${selectWrapperStyle}`}>
        <label htmlFor="search-specialty" className="sr-only">Specialty</label>
        <select
          id="search-specialty"
          value={search.specialty === SPECIALTY_ALL ? SPECIALTY_ALL : HEALTHCARE_SPECIALTIES.includes(search.specialty as typeof HEALTHCARE_SPECIALTIES[number]) ? search.specialty : SPECIALTY_OTHER}
          onChange={e => setSearch(s => ({ ...s, specialty: e.target.value }))}
          className={inputStyle}
        >
          <option value={SPECIALTY_ALL}>All medical facilities</option>
          {HEALTHCARE_SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
          <option value={SPECIALTY_OTHER}>Other</option>
        </select>
        {search.specialty === SPECIALTY_OTHER && (
          <input
            type="text"
            value={customSpecialty}
            onChange={e => setCustomSpecialty(e.target.value)}
            placeholder="Enter specialty (e.g. General practice)"
            className={`${inputStyle} mt-2 shadow-[var(--shadow-dropdown)]`}
            aria-label="Custom specialty"
          />
        )}
      </div>
      <div className={`md:col-span-1 ${selectWrapperStyle} ${disableLocationFilters ? 'opacity-50 pointer-events-none' : ''}`}>
        <label htmlFor="search-region" className="sr-only">Region</label>
        <select
          id="search-region"
          value={search.region}
          onChange={e => setSearch(s => ({ ...s, region: e.target.value }))}
          className={inputStyle}
          disabled={disableLocationFilters}
        >
          <option value="India">India</option>
          <option value="Other">Other</option>
        </select>
        {search.region === 'Other' && (
          <input
            type="text"
            value={customRegion}
            onChange={e => setCustomRegion(e.target.value)}
            placeholder="Enter region/country"
            className={`${inputStyle} mt-2 shadow-[var(--shadow-dropdown)]`}
            aria-label="Custom region"
          />
        )}
      </div>
      <div className={`md:col-span-1 ${selectWrapperStyle}`}>
        <label htmlFor="search-keywords" className="sr-only">Keywords</label>
        <input
          id="search-keywords"
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="e.g. India Kidney"
          className={`${inputStyle} placeholder:text-slate-400`}
        />
      </div>
      <div className={`md:col-span-1 ${selectWrapperStyle} ${disableLocationFilters ? 'opacity-50 pointer-events-none' : ''}`}>
        <label htmlFor="search-place-query" className="sr-only">Clinic or business name (optional)</label>
        <input
          id="search-place-query"
          type="text"
          value={placeQuery}
          onChange={e => setPlaceQuery(e.target.value)}
          placeholder="e.g. Dr Spine Whitefield Bangalore"
          className={`${inputStyle} placeholder:text-slate-400`}
          aria-label="Clinic or business name (optional)"
          disabled={disableLocationFilters}
        />
      </div>
      {!hideRadiusAndCenter && (
        <>
      <div className="md:col-span-2 flex flex-wrap items-center gap-2">
        <label htmlFor="search-radius" className="text-sm text-slate-600">Within</label>
        <input
          id="search-radius"
          type="range"
          min={1}
          max={50}
          value={radiusKm}
          onChange={e => setRadiusKm(Number(e.target.value))}
          className="w-24 accent-[var(--color-primary)]"
          aria-label="Radius in km"
        />
        <span className="text-sm font-medium text-slate-700">{radiusKm} km</span>
        <label htmlFor="search-center-place" className="text-sm text-slate-600 ml-2">of</label>
        <input
          id="search-center-place"
          type="text"
          value={centerPlace}
          onChange={e => setCenterPlace(e.target.value)}
          placeholder="e.g. Indiranagar"
          className={`${inputStyle} flex-1 min-w-[120px]`}
          aria-label="Center location for radius search"
        />
      </div>
      <div className="md:col-span-1">
        <button
          type="submit"
          disabled={loading}
          className="w-full h-[40px] flex items-center justify-center gap-[var(--space-2)] rounded-[var(--radius-button)] bg-[var(--color-primary)] px-[var(--space-4)] text-sm font-semibold text-white shadow-[var(--shadow-button)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition-colors focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
        >
          <Search size={16} />
          {loading ? 'Searching…' : 'Search'}
        </button>
      </div>
        </>
      )}
        </>
      )}
    </form>
    </div>
  );
}
