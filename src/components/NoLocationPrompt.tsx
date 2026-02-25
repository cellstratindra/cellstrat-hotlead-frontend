import { MapPin, Navigation } from 'lucide-react'

export interface NoLocationPromptProps {
  onUseCurrentLocation: () => void
  onTypeAddress: () => void
}

export function NoLocationPrompt({ onUseCurrentLocation, onTypeAddress }: NoLocationPromptProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center max-w-md mx-auto">
      <div className="rounded-full bg-slate-100 p-6 mb-6 ring-4 ring-slate-100/80">
        <MapPin className="h-12 w-12 text-[var(--color-primary)]" aria-hidden />
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">
        Set your search location to find nearby leads
      </h2>
      <p className="text-sm text-slate-600 mb-8">
        CellLeads finds prospects within your chosen radius. Start by entering a location or using GPS.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 w-full">
        <button
          type="button"
          onClick={onUseCurrentLocation}
          className="touch-target flex items-center justify-center gap-2 rounded-[var(--radius-button)] bg-[var(--color-primary)] text-white px-5 py-3 text-sm font-semibold shadow-[var(--shadow-button)] hover:bg-[var(--color-primary-hover)] transition-colors min-h-[48px] focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
        >
          <Navigation className="h-5 w-5" aria-hidden />
          Use my current location
        </button>
        <button
          type="button"
          onClick={onTypeAddress}
          className="touch-target flex items-center justify-center gap-2 rounded-[var(--radius-button)] border-2 border-slate-200 bg-white text-slate-700 px-5 py-3 text-sm font-medium hover:bg-slate-50 transition-colors min-h-[48px] focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
        >
          <MapPin className="h-5 w-5" aria-hidden />
          Type an address
        </button>
      </div>
    </div>
  )
}
