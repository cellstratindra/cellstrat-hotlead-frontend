import { MapPin, X } from 'lucide-react'

export interface ActiveFilterChip {
  id: string
  label: string
  /** Optional icon key for display */
  icon?: 'location' | 'specialty' | 'rating' | 'place'
}

export interface ActiveFilterChipsProps {
  chips: ActiveFilterChip[]
  onRemove: (id: string) => void
  onClearAll: () => void
  onOpenFilter: () => void
}

export function ActiveFilterChips({ chips, onRemove, onClearAll, onOpenFilter }: ActiveFilterChipsProps) {
  if (chips.length === 0) return null

  return (
    <div className="relative z-10 flex items-center gap-2 overflow-x-auto py-2 px-[var(--edge-padding)] md:px-[var(--space-4)] border-b border-slate-100 bg-slate-50/50 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
      <div className="flex items-center gap-2 min-w-0 shrink-0">
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => onOpenFilter()}
            className="flex items-center gap-1.5 rounded-full border border-[var(--color-primary)]/50 bg-white/80 px-3 py-1.5 text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-colors shrink-0 touch-target min-h-[48px] md:min-h-[36px]"
          >
            {chip.icon === 'location' && <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />}
            <span className="truncate max-w-[140px]">{chip.label}</span>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation()
                onRemove(chip.id)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onRemove(chip.id)
                }
              }}
              className="flex items-center justify-center rounded-full p-0.5 hover:bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
              aria-label={`Remove ${chip.label}`}
            >
              <X className="h-3.5 w-3.5" />
            </span>
          </button>
        ))}
      </div>
      {chips.length >= 2 && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs font-medium text-slate-600 hover:text-slate-800 hover:underline shrink-0 py-1.5 touch-target min-h-[48px] md:min-h-[36px] flex items-center"
        >
          Clear all
        </button>
      )}
    </div>
  )
}
