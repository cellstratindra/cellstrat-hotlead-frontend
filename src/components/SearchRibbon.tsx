import { useState } from 'react';
import { Search, MapPin } from 'lucide-react';
import { INDIA_CITIES, CITY_OTHER, CITY_ALL } from '../constants/cities';
import { HEALTHCARE_SPECIALTIES, SPECIALTY_OTHER, SPECIALTY_ALL } from '../constants/specialties';
import { useGeo } from '../contexts/GeoContext';
import type { SearchChips, SearchFilters } from './SearchBarWithChips';

const defaultFilters: SearchFilters = {
  sort_by: 'recommendation_score',
  order: 'desc',
  min_rating: '',
  min_review_count: '',
  has_phone: false,
  budget_max: '',
};

export interface SearchRibbonProps {
  onSubmit: (chips: SearchChips, filters: SearchFilters) => void;
  loading: boolean;
  initialChips?: Partial<SearchChips>;
  initialFilters?: Partial<SearchFilters>;
}

const RIBBON_INPUT =
  'h-[40px] text-sm text-slate-900 placeholder:text-slate-500 bg-white border-0 border-r border-slate-200 px-3 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:outline-none min-w-0';

export function SearchRibbon({
  onSubmit,
  loading,
  initialChips = {},
  initialFilters = {},
}: SearchRibbonProps) {
  const geo = useGeo();
  const basePoint = geo?.basePoint ?? null;
  const locationMode = geo?.locationMode ?? null;

  const [city, setCity] = useState(() => {
    const c = initialChips.city ?? CITY_ALL;
    return !c || c === CITY_ALL ? CITY_ALL : (INDIA_CITIES.includes(c as (typeof INDIA_CITIES)[number]) ? c : CITY_OTHER);
  });
  const [customCity, setCustomCity] = useState(() =>
    initialChips.city && !INDIA_CITIES.includes(initialChips.city as (typeof INDIA_CITIES)[number])
      ? initialChips.city
      : ''
  );
  const [specialty, setSpecialty] = useState(() => {
    const s = initialChips.specialty ?? '';
    return s === '' ? SPECIALTY_ALL : HEALTHCARE_SPECIALTIES.includes(s as (typeof HEALTHCARE_SPECIALTIES)[number]) ? s : SPECIALTY_OTHER;
  });
  const [customSpecialty, setCustomSpecialty] = useState(() =>
    initialChips.specialty &&
    initialChips.specialty !== SPECIALTY_ALL &&
    !HEALTHCARE_SPECIALTIES.includes(initialChips.specialty as (typeof HEALTHCARE_SPECIALTIES)[number])
      ? initialChips.specialty
      : ''
  );
  const [region, setRegion] = useState(() => {
    const r = initialChips.region || 'India';
    return !r || r === 'India' ? 'India' : 'Other';
  });
  const [customRegion, setCustomRegion] = useState(() =>
    initialChips.region && initialChips.region !== 'India' ? initialChips.region : ''
  );
  const [searchQuery, setSearchQuery] = useState(() => initialChips.place_query ?? '');
  const [radiusKm, setRadiusKm] = useState(() => initialChips.radius_km ?? 5);

  const filters = { ...defaultFilters, ...initialFilters };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cityValue = city === CITY_OTHER ? customCity.trim() : (city === CITY_ALL ? '' : city);
    const specialtyValue =
      specialty === SPECIALTY_OTHER ? customSpecialty.trim() : specialty === SPECIALTY_ALL ? undefined : specialty;
    const regionValue = region === 'Other' ? customRegion.trim() : region;
    const useGpsCenter = basePoint && locationMode === 'gps';
    const chips: SearchChips = {
      city: cityValue || undefined,
      country: !cityValue ? (regionValue || 'India') : undefined,
      specialty: specialtyValue,
      region: regionValue || region,
      place_query: searchQuery.trim() || undefined,
      radius_km: useGpsCenter ? radiusKm : undefined,
      center_place: useGpsCenter ? basePoint?.label?.trim() : undefined,
      center_lat: useGpsCenter && basePoint ? basePoint.lat : undefined,
      center_lng: useGpsCenter && basePoint ? basePoint.lng : undefined,
    };
    onSubmit(chips, filters);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-0 flex-1 min-w-0 max-w-3xl bg-white border border-slate-200 rounded-lg shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] overflow-hidden"
    >
      <div className="flex items-center shrink-0 border-r border-slate-200">
        <label htmlFor="ribbon-city" className="sr-only">
          City
        </label>
        <select
          id="ribbon-city"
          value={city === CITY_ALL ? CITY_ALL : (INDIA_CITIES.includes(city as (typeof INDIA_CITIES)[number]) ? city : CITY_OTHER)}
          onChange={(e) => setCity(e.target.value)}
          className={`${RIBBON_INPUT} min-w-[100px] cursor-pointer ${locationMode === 'gps' ? 'opacity-50 cursor-not-allowed' : ''}`}
          aria-label="City"
          disabled={locationMode === 'gps'}
        >
          <option value={CITY_ALL}>All</option>
          {INDIA_CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
          <option value={CITY_OTHER}>Other</option>
        </select>
      </div>

      <div className="flex items-center shrink-0 border-r border-slate-200">
        <label htmlFor="ribbon-specialty" className="sr-only">
          Specialty
        </label>
        <select
          id="ribbon-specialty"
          value={
            specialty === SPECIALTY_ALL ? SPECIALTY_ALL : HEALTHCARE_SPECIALTIES.includes(specialty as (typeof HEALTHCARE_SPECIALTIES)[number]) ? specialty : SPECIALTY_OTHER
          }
          onChange={(e) => setSpecialty(e.target.value)}
          className={`${RIBBON_INPUT} min-w-[140px] cursor-pointer`}
          aria-label="Specialty"
        >
          <option value={SPECIALTY_ALL}>All medical facilities</option>
          {HEALTHCARE_SPECIALTIES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
          <option value={SPECIALTY_OTHER}>Other</option>
        </select>
      </div>

      <div className="flex items-center shrink-0 border-r border-slate-200">
        <label htmlFor="ribbon-region" className="sr-only">
          Region
        </label>
        <select
          id="ribbon-region"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className={`${RIBBON_INPUT} min-w-[80px] cursor-pointer ${locationMode === 'gps' ? 'opacity-50 cursor-not-allowed' : ''}`}
          aria-label="Region"
          disabled={locationMode === 'gps'}
        >
          <option value="India">India</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div className="flex items-center flex-1 min-w-0 border-r border-slate-200">
        <label htmlFor="ribbon-search" className="sr-only">
          Search clinics, locations, addresses
        </label>
        <input
          id="ribbon-search"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Clinic name, address, zip..."
          className={`${RIBBON_INPUT} w-full`}
          aria-label="Search clinics, locations, addresses"
        />
      </div>

      <div className="flex items-center gap-2 shrink-0 border-r border-slate-200 pl-3 pr-3 h-[40px] min-w-[100px]">
        {locationMode === 'gps' && (
          <span className="flex items-center gap-1 text-[var(--color-primary)]" title="Using current location">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden />
          </span>
        )}
        <input
          id="ribbon-radius"
          type="range"
          min={1}
          max={50}
          value={radiusKm}
          onChange={(e) => setRadiusKm(Number(e.target.value))}
          className="flex-1 min-w-0 h-2 accent-[var(--color-primary)]"
          aria-label="Radius in km"
        />
        <span className="text-sm font-medium text-slate-700 tabular-nums whitespace-nowrap">{radiusKm} km</span>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="h-[40px] px-4 shrink-0 flex items-center justify-center gap-2 rounded-r-lg bg-[var(--color-primary)] text-white text-sm font-semibold hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition-colors focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 focus:outline-none"
      >
        <Search size={16} aria-hidden />
        {loading ? 'Searching…' : 'Search'}
      </button>

      {city === CITY_OTHER && (
        <input
          type="text"
          value={customCity}
          onChange={(e) => setCustomCity(e.target.value)}
          placeholder="Enter city"
          className="sr-only"
          aria-hidden
        />
      )}
      {specialty === SPECIALTY_OTHER && (
        <input
          type="text"
          value={customSpecialty}
          onChange={(e) => setCustomSpecialty(e.target.value)}
          placeholder="Enter specialty"
          className="sr-only"
          aria-hidden
        />
      )}
      {region === 'Other' && (
        <input
          type="text"
          value={customRegion}
          onChange={(e) => setCustomRegion(e.target.value)}
          placeholder="Enter region"
          className="sr-only"
          aria-hidden
        />
      )}
    </form>
  );
}
