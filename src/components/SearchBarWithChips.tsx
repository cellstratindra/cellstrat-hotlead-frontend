import { useState } from 'react';
import { Search } from 'lucide-react';
import { INDIA_CITIES } from '../constants/cities';
import { HEALTHCARE_SPECIALTIES } from '../constants/specialties';

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
}

export function SearchBarWithChips({ onSubmit, loading, initialChips = {}, initialFilters = {} }: SearchBarProps) {
  const [search, setSearch] = useState<SearchChips>({
    city: initialChips.city || 'Bangalore',
    specialty: initialChips.specialty || 'Healthcare',
    region: initialChips.region || 'India',
  });
  const [query, setQuery] = useState('India Kidney');

  const filters = { ...defaultFilters, ...initialFilters };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // The query can be integrated into the specialty or a new field if the API supports it.
    // For now, we pass it as part of the specialty.
    const submissionChips: SearchChips = {
      ...search,
      specialty: `${search.specialty} ${query}`.trim(),
    };
    onSubmit(submissionChips, filters);
  }

  const inputStyle = "w-full rounded-md border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500";

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
      <div className="md:col-span-1">
        <select 
          value={search.city}
          onChange={e => setSearch(s => ({ ...s, city: e.target.value }))}
          className={inputStyle}
        >
          {INDIA_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="md:col-span-1">
        <select 
          value={search.specialty}
          onChange={e => setSearch(s => ({ ...s, specialty: e.target.value }))} 
          className={inputStyle}
        >
          {HEALTHCARE_SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="md:col-span-1">
        <select 
          value={search.region}
          onChange={e => setSearch(s => ({ ...s, region: e.target.value }))} 
          className={inputStyle}
        >
          <option value="India">India</option>
          {/* Add other regions/countries if necessary */}
        </select>
      </div>
      <div className="md:col-span-1">
          <input 
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search keywords..."
            className={inputStyle}
          />
      </div>
      <div className="md:col-span-1">
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Search size={16} />
          {loading ? 'Searching…' : 'Search'}
        </button>
      </div>
    </form>
  );
}
