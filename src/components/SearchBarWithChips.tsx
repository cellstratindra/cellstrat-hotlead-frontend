import { useState, useRef, useEffect } from 'react'
import { X, SlidersHorizontal } from 'lucide-react'
import { INDIA_CITIES, CITY_OTHER } from '../constants/cities'
import { HEALTHCARE_SPECIALTIES, SPECIALTY_OTHER } from '../constants/specialties'

export interface SearchFilters {
  sort_by: string
  order: string
  min_rating: string
  min_review_count: string
  has_phone: boolean
  budget_max: string
}

export interface SearchChips {
  city: string
  specialty: string
  region: string
}

const defaultFilters: SearchFilters = {
  sort_by: 'recommendation_score',
  order: 'desc',
  min_rating: '',
  min_review_count: '',
  has_phone: false,
  budget_max: '',
}

const RADIUS = 'rounded-lg' /* 8px */
const inputBase = `${RADIUS} border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]`
const LABEL_SPACING = 'mt-1' /* 4px from label to control */

function NumberStepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  placeholder = '—',
  widthClass = 'w-28',
}: {
  value: string
  onChange: (v: string) => void
  min: number
  max?: number
  step?: number
  placeholder?: string
  widthClass?: string
}) {
  const num = value === '' ? null : Number(value)
  const validNum = num != null && !Number.isNaN(num) ? num : null
  const set = (n: number) => onChange(String(n))
  return (
    <div className={`inline-flex items-center ${RADIUS} border border-slate-200 bg-white shadow-sm`}>
      <button
        type="button"
        onClick={() => set(validNum != null ? Math.max(min, validNum - step) : min)}
        className="flex h-9 w-9 shrink-0 items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        aria-label="Decrease"
      >
        −
      </button>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`h-9 ${widthClass} border-0 bg-transparent text-center text-sm tabular-nums focus:outline-none focus:ring-0`}
      />
      <button
        type="button"
        onClick={() =>
          set(
            validNum != null
              ? max != null
                ? Math.min(max, validNum + step)
                : validNum + step
              : min
          )
        }
        className="flex h-9 w-9 shrink-0 items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        aria-label="Increase"
      >
        +
      </button>
    </div>
  )
}

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'recommendation_score', label: 'Recommended' },
  { value: 'rating', label: 'Rating' },
  { value: 'review_count', label: 'Reviews' },
  { value: 'name', label: 'Name' },
]
const ORDER_OPTIONS: { value: string; label: string }[] = [
  { value: 'desc', label: 'Desc' },
  { value: 'asc', label: 'Asc' },
]

interface SearchBarWithChipsProps {
  onSubmit: (chips: SearchChips, filters: SearchFilters) => void
  loading: boolean
  initialChips?: Partial<SearchChips>
  initialFilters?: Partial<SearchFilters>
}

export function SearchBarWithChips({
  onSubmit,
  loading,
  initialChips = {},
  initialFilters = {},
}: SearchBarWithChipsProps) {
  const [chips, setChips] = useState<SearchChips>({
    city: '',
    specialty: '',
    region: '',
    ...initialChips,
  })
  const [filters, setFilters] = useState<SearchFilters>({ ...defaultFilters, ...initialFilters })
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [citySelect, setCitySelect] = useState('')
  const [customCity, setCustomCity] = useState('')
  const [specialtySelect, setSpecialtySelect] = useState('')
  const [customSpecialty, setCustomSpecialty] = useState('')
  const [regionInput, setRegionInput] = useState(chips.region)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setFiltersOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const cityValue = citySelect === CITY_OTHER ? customCity.trim() : citySelect
  const specialtyValue = specialtySelect === SPECIALTY_OTHER ? customSpecialty.trim() : specialtySelect

  function addCity() {
    if (!cityValue) return
    setChips((c) => ({ ...c, city: cityValue }))
    setCitySelect('')
    setCustomCity('')
  }
  function addSpecialty() {
    if (!specialtyValue) return
    setChips((c) => ({ ...c, specialty: specialtyValue }))
    setSpecialtySelect('')
    setCustomSpecialty('')
  }
  function addRegion() {
    const v = regionInput.trim()
    if (!v) return
    setChips((c) => ({ ...c, region: v }))
    setRegionInput('')
  }

  function removeChip(key: keyof SearchChips) {
    setChips((c) => ({ ...c, [key]: '' }))
    if (key === 'region') setRegionInput('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!chips.city || !chips.specialty) return
    onSubmit(chips, filters)
  }

  const canSearch = !!chips.city && !!chips.specialty

  return (
    <section
      className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm"
      aria-label="Search clinics"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Unified search bar row */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2">
            {/* Chips */}
            {chips.city && (
              <span className="inline-flex items-center gap-1 rounded-md bg-[#2563EB]/10 px-2 py-1 text-xs font-medium text-[#2563EB]">
                City: {chips.city}
                <button
                  type="button"
                  onClick={() => removeChip('city')}
                  className="rounded p-0.5 hover:bg-[#2563EB]/20"
                  aria-label={`Remove city ${chips.city}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            )}
            {chips.specialty && (
              <span className="inline-flex items-center gap-1 rounded-md bg-[#2563EB]/10 px-2 py-1 text-xs font-medium text-[#2563EB]">
                Specialty: {chips.specialty}
                <button
                  type="button"
                  onClick={() => removeChip('specialty')}
                  className="rounded p-0.5 hover:bg-[#2563EB]/20"
                  aria-label={`Remove specialty ${chips.specialty}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            )}
            {chips.region && (
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-200/80 px-2 py-1 text-xs font-medium text-slate-700">
                Region: {chips.region}
                <button
                  type="button"
                  onClick={() => removeChip('region')}
                  className="rounded p-0.5 hover:bg-slate-300/80"
                  aria-label={`Remove region ${chips.region}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            )}
            {/* Add dropdowns when chip not set */}
            {!chips.city && (
              <span className="inline-flex items-center gap-1">
                <select
                  value={citySelect}
                  onChange={(e) => {
                    const v = e.target.value
                    setCitySelect(v)
                    if (v && v !== CITY_OTHER) {
                      setChips((c) => ({ ...c, city: v }))
                      setCitySelect('')
                      setCustomCity('')
                    }
                  }}
                  onBlur={() => { if (cityValue) addCity() }}
                  className="max-w-[140px] border-0 bg-transparent py-0.5 text-sm text-slate-600 focus:ring-0"
                  aria-label="Add city"
                >
                  <option value="">+ City</option>
                  {INDIA_CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value={CITY_OTHER}>Other…</option>
                </select>
                {citySelect === CITY_OTHER && (
                  <input
                    type="text"
                    placeholder="City name"
                    value={customCity}
                    onChange={(e) => setCustomCity(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCity())}
                    className="w-24 border-0 bg-transparent py-0.5 text-sm focus:ring-0"
                  />
                )}
              </span>
            )}
            {!chips.specialty && (
              <span className="inline-flex items-center gap-1">
                <select
                  value={specialtySelect}
                  onChange={(e) => {
                    const v = e.target.value
                    setSpecialtySelect(v)
                    if (v && v !== SPECIALTY_OTHER) {
                      setChips((c) => ({ ...c, specialty: v }))
                      setSpecialtySelect('')
                      setCustomSpecialty('')
                    }
                  }}
                  onBlur={() => { if (specialtyValue) addSpecialty() }}
                  className="max-w-[160px] border-0 bg-transparent py-0.5 text-sm text-slate-600 focus:ring-0"
                  aria-label="Add specialty"
                >
                  <option value="">+ Specialty</option>
                  {HEALTHCARE_SPECIALTIES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                  <option value={SPECIALTY_OTHER}>Other…</option>
                </select>
                {specialtySelect === SPECIALTY_OTHER && (
                  <input
                    type="text"
                    placeholder="Specialty"
                    value={customSpecialty}
                    onChange={(e) => setCustomSpecialty(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialty())}
                    className="w-28 border-0 bg-transparent py-0.5 text-sm focus:ring-0"
                  />
                )}
              </span>
            )}
            {!chips.region && (
              <span className="inline-flex items-center gap-1">
                <input
                  type="text"
                  placeholder="+ Region (e.g. India)"
                  value={regionInput}
                  onChange={(e) => setRegionInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRegion())}
                  className="w-32 border-0 bg-transparent py-0.5 text-sm text-slate-600 placeholder-slate-400 focus:ring-0"
                />
                {regionInput.trim() && (
                  <button type="button" onClick={addRegion} className="text-xs text-[#2563EB] hover:underline">
                    Add
                  </button>
                )}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative" ref={popoverRef}>
              <button
                type="button"
                onClick={() => setFiltersOpen((o) => !o)}
                className={`inline-flex items-center gap-1.5 ${RADIUS} border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50`}
                aria-expanded={filtersOpen}
                aria-haspopup="true"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
              </button>
              {filtersOpen && (
                <div
                  className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-lg border border-white/20 bg-white/90 p-4 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.08),0_10px_20px_-5px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.04)] backdrop-blur-xl"
                  role="dialog"
                  aria-label="Advanced filters"
                >
                  <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Advanced filters
                  </p>
                  <div className="space-y-4">
                    <div>
                      <span className="block text-xs font-medium text-slate-600">Sort by</span>
                      <div className={`inline-flex overflow-hidden ${RADIUS} border border-slate-200 bg-slate-50/80 p-0.5 ${LABEL_SPACING}`}>
                        {SORT_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setFilters((f) => ({ ...f, sort_by: opt.value }))}
                            className={`min-w-0 px-3 py-1.5 text-xs font-medium transition-colors ${
                              filters.sort_by === opt.value
                                ? 'rounded-md bg-[#2563EB] text-white shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="block text-xs font-medium text-slate-600">Order</span>
                      <div className={`inline-flex overflow-hidden ${RADIUS} border border-slate-200 bg-slate-50/80 p-0.5 ${LABEL_SPACING}`}>
                        {ORDER_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setFilters((f) => ({ ...f, order: opt.value }))}
                            className={`min-w-0 px-3 py-1.5 text-xs font-medium transition-colors ${
                              filters.order === opt.value
                                ? 'rounded-md bg-[#2563EB] text-white shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="block text-xs font-medium text-slate-600">Min rating</span>
                        <div className={LABEL_SPACING}>
                          <NumberStepper
                            value={filters.min_rating}
                            onChange={(v) => setFilters((f) => ({ ...f, min_rating: v }))}
                            min={0}
                            max={5}
                            step={0.5}
                            widthClass="w-20"
                          />
                        </div>
                      </div>
                      <div>
                        <span className="block text-xs font-medium text-slate-600">Min reviews</span>
                        <div className={LABEL_SPACING}>
                          <NumberStepper
                            value={filters.min_review_count}
                            onChange={(v) => setFilters((f) => ({ ...f, min_review_count: v }))}
                            min={0}
                            widthClass="w-20"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="filter-has-phone"
                        checked={filters.has_phone}
                        onChange={(e) => setFilters((f) => ({ ...f, has_phone: e.target.checked }))}
                        className={`h-4 w-4 ${RADIUS} border-slate-300 text-[#2563EB] focus:ring-[#2563EB]`}
                      />
                      <label htmlFor="filter-has-phone" className="text-sm text-slate-700">
                        Has phone
                      </label>
                    </div>
                    <div>
                      <span className="block text-xs font-medium text-slate-600">Campaign budget (₹)</span>
                      <div className={LABEL_SPACING}>
                        <input
                          type="number"
                          min={0}
                          value={filters.budget_max}
                          onChange={(e) => setFilters((f) => ({ ...f, budget_max: e.target.value }))}
                          className={`w-full ${inputBase}`}
                          placeholder="—"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || !canSearch}
              className={`${RADIUS} border border-[#2563EB] bg-[#2563EB] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1d4ed8] disabled:opacity-50`}
            >
              {loading ? 'Searching…' : 'Search'}
            </button>
          </div>
        </div>
      </form>
    </section>
  )
}
