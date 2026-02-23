import { useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { SearchBarWithChips, type SearchChips, type SearchFilters } from './SearchBarWithChips'

interface FilterDrawerProps {
  open: boolean
  onClose: () => void
  onSubmit: (chips: SearchChips, filters: SearchFilters) => void
  loading: boolean
  initialChips?: Partial<SearchChips>
  initialFilters?: Partial<SearchFilters>
}

export function FilterDrawer({
  open,
  onClose,
  onSubmit,
  loading,
  initialChips,
  initialFilters,
}: FilterDrawerProps) {
  useEffect(() => {
    if (open) {
      const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
      window.addEventListener('keydown', handler)
      return () => window.removeEventListener('keydown', handler)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
        aria-hidden
        onClick={onClose}
      />
      <div
        className="fixed left-0 right-0 bottom-0 z-50 md:hidden bg-white rounded-t-[var(--radius-lg)] shadow-[var(--shadow-dropdown)] max-h-[85vh] flex flex-col"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="filter-drawer-title"
      >
        <div className="flex items-center justify-between px-[var(--edge-padding)] py-[var(--space-4)] border-b border-slate-200">
          <h2 id="filter-drawer-title" className="text-lg font-semibold text-[var(--color-navy)]">
            Search &amp; filters
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="touch-target flex items-center justify-center rounded-full text-slate-500 hover:text-slate-800 focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
            style={{ minHeight: 'var(--touch-min)', minWidth: 'var(--touch-min)' }}
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-[var(--edge-padding)] py-[var(--space-4)]">
          <SearchBarWithChips
            formId="filter-drawer-form"
            key={`drawer-${initialChips?.city ?? ''}-${initialChips?.specialty ?? ''}-${initialChips?.region ?? ''}`}
            onSubmit={(chips, filters) => {
              onSubmit(chips, filters)
              onClose()
            }}
            loading={loading}
            initialChips={initialChips}
            initialFilters={initialFilters}
          />
        </div>
        <div className="p-[var(--edge-padding)] border-t border-slate-200">
          <button
            type="submit"
            form="filter-drawer-form"
            disabled={loading}
            className="touch-target w-full flex items-center justify-center gap-[var(--space-2)] rounded-[var(--radius-button)] bg-[var(--color-primary)] px-[var(--space-4)] py-[var(--space-3)] text-sm font-semibold text-white shadow-[var(--shadow-button)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition-colors"
            style={{ minHeight: 'var(--touch-min)' }}
          >
            <Search size={20} />
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>
      </div>
    </>
  )
}
