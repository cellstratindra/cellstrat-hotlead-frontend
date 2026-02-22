import { useState } from 'react';
import { Search } from 'lucide-react';
import { INDIA_CITIES, CITY_OTHER } from '../constants/cities';
import { HEALTHCARE_SPECIALTIES, SPECIALTY_OTHER } from '../constants/specialties';

export interface SearchFilters {
  sort_by: string;
  order: string;
  min_rating: string;
  min_review_count: string;
  has_phone: boolean;
  budget_max: string;
}

export interface SearchChips {
  city: string;
  specialty: string;
  region: string;
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
  /** Optional form id for external submit button (e.g. in FilterDrawer) */
  formId?: string;
}

export function SearchBarWithChips({ onSubmit, loading, initialChips = {}, initialFilters = {}, formId }: SearchBarProps) {
  const [search, setSearch] = useState<SearchChips>(() => {
    const city = initialChips.city || 'Bangalore';
    const specialty = initialChips.specialty || 'General practice';
    const region = initialChips.region || 'India';
    return {
      city: INDIA_CITIES.includes(city as (typeof INDIA_CITIES)[number]) ? city : CITY_OTHER,
      specialty: HEALTHCARE_SPECIALTIES.includes(specialty as (typeof HEALTHCARE_SPECIALTIES)[number]) ? specialty : SPECIALTY_OTHER,
      region: !region || region === 'India' ? 'India' : 'Other',
    };
  });
  const [customCity, setCustomCity] = useState(() =>
    initialChips.city && !INDIA_CITIES.includes(initialChips.city as (typeof INDIA_CITIES)[number]) ? initialChips.city : ''
  );
  const [customSpecialty, setCustomSpecialty] = useState(() =>
    initialChips.specialty && !HEALTHCARE_SPECIALTIES.includes(initialChips.specialty as (typeof HEALTHCARE_SPECIALTIES)[number]) ? initialChips.specialty : ''
  );
  const [customRegion, setCustomRegion] = useState(() =>
    initialChips.region && initialChips.region !== 'India' ? initialChips.region : ''
  );
  const [query, setQuery] = useState('');

  const filters = { ...defaultFilters, ...initialFilters };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cityValue = search.city === CITY_OTHER ? customCity.trim() : search.city;
    const specialtyValue = search.specialty === SPECIALTY_OTHER ? customSpecialty.trim() : search.specialty;
    const regionValue = search.region === 'Other' ? customRegion.trim() : search.region;
    const specialtyWithKeywords = query.trim() ? `${specialtyValue} ${query.trim()}`.trim() : specialtyValue;
    const submissionChips: SearchChips = {
      city: cityValue || search.city,
      specialty: specialtyWithKeywords || specialtyValue,
      region: regionValue || search.region,
    };
    onSubmit(submissionChips, filters);
  }

  const inputStyle = "w-full rounded-[8px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:outline-none relative z-0";
  const selectWrapperStyle = "relative z-10";

  return (
    <form id={formId} onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
      <div className={`md:col-span-1 ${selectWrapperStyle}`}>
        <label htmlFor="search-city" className="sr-only">City</label>
        <select
          id="search-city"
          value={INDIA_CITIES.includes(search.city as typeof INDIA_CITIES[number]) ? search.city : CITY_OTHER}
          onChange={e => setSearch(s => ({ ...s, city: e.target.value }))}
          className={inputStyle}
        >
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
          value={HEALTHCARE_SPECIALTIES.includes(search.specialty as typeof HEALTHCARE_SPECIALTIES[number]) ? search.specialty : SPECIALTY_OTHER}
          onChange={e => setSearch(s => ({ ...s, specialty: e.target.value }))}
          className={inputStyle}
        >
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
      <div className={`md:col-span-1 ${selectWrapperStyle}`}>
        <label htmlFor="search-region" className="sr-only">Region</label>
        <select
          id="search-region"
          value={search.region}
          onChange={e => setSearch(s => ({ ...s, region: e.target.value }))}
          className={inputStyle}
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
      <div className="md:col-span-1">
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-[8px] bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition-colors"
        >
          <Search size={16} />
          {loading ? 'Searching…' : 'Search'}
        </button>
      </div>
    </form>
  );
}
