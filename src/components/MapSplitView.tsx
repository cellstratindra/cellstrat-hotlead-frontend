import { useEffect, useState } from 'react'
import { useMap } from 'react-leaflet'
import { Locate, Loader2, Search } from 'lucide-react'
import type { HotLead } from '../types/leads'

function SearchThisAreaButton({ onSearchThisArea }: { onSearchThisArea: (center: { lat: number; lng: number }, radiusKm: number) => void }) {
  const map = useMap()
  const handleClick = () => {
    const bounds = map.getBounds()
    const center = map.getCenter()
    const latSpanKm = (bounds.getNorth() - bounds.getSouth()) * 111
    const lngSpanKm = (bounds.getEast() - bounds.getWest()) * 111 * Math.cos((center.lat * Math.PI) / 180)
    const radiusKm = Math.max(1, Math.ceil(Math.max(latSpanKm, lngSpanKm) / 2))
    onSearchThisArea({ lat: center.lat, lng: center.lng }, radiusKm)
  }
  return (
    <div className="absolute top-2 left-2 z-[10]">
      <button
        type="button"
        onClick={handleClick}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-md hover:bg-slate-50 focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
        aria-label="Search this area"
      >
        <Search className="h-4 w-4" aria-hidden />
        Search this area
      </button>
    </div>
  )
}

interface MapSplitViewProps {
  leads: HotLead[]
  centerLat: number
  centerLng: number
  radiusKm: number
  onLeadFocus?: (lead: HotLead) => void
  focusedLeadId?: string | null
  className?: string
  /** Responsive height (e.g. '300px', '30vh', '100%'). Default '300px'. */
  height?: string
  /** When user taps Locate Me FAB, called with current position (lat, lng). */
  onLocateMe?: (lat: number, lng: number) => void
  /** When user clicks "Search this area", called with viewport center and radius in km. */
  onSearchThisArea?: (center: { lat: number; lng: number }, radiusKm: number) => void
}

export function MapSplitView({
  leads,
  centerLat,
  centerLng,
  radiusKm,
  onLeadFocus,
  className = '',
  height = '300px',
  onLocateMe,
  onSearchThisArea,
}: MapSplitViewProps) {
  const [Leaflet, setLeaflet] = useState<typeof import('react-leaflet') | null>(null)
  const [locateLoading, setLocateLoading] = useState(false)
  const [locateError, setLocateError] = useState<string | null>(null)

  const handleLocateMe = () => {
    if (!onLocateMe) return
    if (!navigator.geolocation) {
      setLocateError('Not supported')
      setTimeout(() => setLocateError(null), 3000)
      return
    }
    setLocateLoading(true)
    setLocateError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocateLoading(false)
        onLocateMe(pos.coords.latitude, pos.coords.longitude)
      },
      (err) => {
        setLocateLoading(false)
        const msg =
          err.code === err.PERMISSION_DENIED
            ? null
            : err.code === err.TIMEOUT
              ? 'Timed out'
              : 'Unavailable'
        if (msg) {
          setLocateError(msg)
          setTimeout(() => setLocateError(null), 4000)
        } else {
          setLocateError(null)
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }
  const withCoords = leads.filter(
    (l) => l.latitude != null && l.longitude != null
  ) as (HotLead & { latitude: number; longitude: number })[]
  const radiusM = radiusKm * 1000

  useEffect(() => {
    let cancelled = false
    void import('leaflet/dist/leaflet.css')
    import('react-leaflet').then((L) => {
      if (!cancelled) setLeaflet(L)
    })
    return () => { cancelled = true }
  }, [])

  if (!Leaflet) {
    return (
      <div className={`rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-500 ${className}`} style={{ height }}>
        Loading map…
      </div>
    )
  }

  const { MapContainer, TileLayer, Circle, Marker, Popup } = Leaflet
  return (
    <div className={`rounded-xl overflow-hidden border border-slate-200 relative z-0 pointer-events-auto ${className}`} style={{ height }}>
      <MapContainer center={[centerLat, centerLng]} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Circle center={[centerLat, centerLng]} radius={radiusM} pathOptions={{ color: '#2563eb', fillOpacity: 0.08 }} />
        {onSearchThisArea && <SearchThisAreaButton onSearchThisArea={onSearchThisArea} />}
        {withCoords.map((lead) => (
          <Marker
            key={lead.place_id}
            position={[lead.latitude, lead.longitude]}
            eventHandlers={onLeadFocus ? { click: () => onLeadFocus(lead) } : undefined}
          >
            <Popup>
              <div className="text-sm font-medium">{lead.name}</div>
              {lead.recommendation_score != null && (
                <div className="text-xs text-slate-500">Score: {Math.round(lead.recommendation_score)}</div>
              )}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {onLocateMe && (
        <div className="absolute bottom-4 right-4 z-10 flex flex-col items-end gap-1">
          {locateError && (
            <span className="rounded bg-red-100 px-2 py-1 text-xs text-red-700 shadow" role="alert">
              {locateError}. Enable location and try again.
            </span>
          )}
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={locateLoading}
            className={`flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-lg touch-target focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 ${locateError ? 'bg-red-50 ring-2 ring-red-300' : ''}`}
            aria-label="Use my location"
          >
            {locateLoading ? (
              <Loader2 className="h-6 w-6 text-slate-500 animate-spin" aria-hidden />
            ) : (
              <Locate className="h-6 w-6 text-slate-700" aria-hidden />
            )}
          </button>
        </div>
      )}
    </div>
  )
}
