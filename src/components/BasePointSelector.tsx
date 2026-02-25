import { useState, useCallback } from 'react'
import { MapPin, Navigation, Home, X } from 'lucide-react'
import { useGeo } from '../contexts/GeoContext'
import { geocodeAddress, reverseGeocode } from '../api/client'

export function BasePointSelector() {
  const { basePoint, setBasePoint, clearBasePoint, markLocationJustDetected, locationDetectedAt } = useGeo()
  const [customAddress, setCustomAddress] = useState('')
  const [geocodeLoading, setGeocodeLoading] = useState(false)
  const [geocodeError, setGeocodeError] = useState<string | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)

  const showBlink = locationDetectedAt != null && Date.now() - locationDetectedAt < 4000

  const handleCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeocodeError('Location not supported in this browser')
      return
    }
    setGeocodeError(null)
    setLocationLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setBasePoint({ lat, lng, label: 'Current location' })
        markLocationJustDetected()
        setLocationLoading(false)
        try {
          const { name } = await reverseGeocode(lat, lng)
          setBasePoint({ lat, lng, label: name })
          markLocationJustDetected()
        } catch {
          // keep "Current location" if reverse geocode fails
        }
      },
      (err) => {
        setLocationLoading(false)
        const message =
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied. Enable location in browser or device settings.'
            : err.code === err.POSITION_UNAVAILABLE
              ? 'Location unavailable. Check GPS or try again.'
              : err.code === err.TIMEOUT
                ? 'Location timed out. Ensure GPS/location is on and try again.'
                : 'Could not get location. Try again or enter an address.'
        setGeocodeError(message)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }, [setBasePoint])

  const handleUseSaved = useCallback(() => {
    try {
      let raw = localStorage.getItem('cellleads_pro_base_point')
      if (!raw) raw = localStorage.getItem('hotlead_base_point')
      if (!raw) return
      const data = JSON.parse(raw) as { lat?: number; lng?: number; label?: string }
      if (typeof data?.lat === 'number' && typeof data?.lng === 'number') {
        setBasePoint({
          lat: data.lat,
          lng: data.lng,
          label: (data.label as string) || 'Saved',
        })
      }
    } catch {
      // ignore
    }
  }, [setBasePoint])

  const handleCustomGeocode = useCallback(async () => {
    const addr = customAddress.trim()
    if (!addr) return
    setGeocodeError(null)
    setGeocodeLoading(true)
    try {
      const { lat, lng } = await geocodeAddress(addr)
      setBasePoint({ lat, lng, label: addr })
    } catch (e) {
      setGeocodeError(e instanceof Error ? e.message : 'Geocoding failed')
    } finally {
      setGeocodeLoading(false)
    }
  }, [customAddress, setBasePoint])

  return (
    <div className="flex flex-wrap items-center gap-[var(--space-2)]">
      <span className="text-sm text-slate-600 flex items-center gap-1">
        <MapPin className="h-4 w-4 text-slate-500" aria-hidden />
        Base point
      </span>
      {basePoint ? (
        <>
          <span className="flex items-center gap-1.5 text-xs text-slate-700 max-w-[200px]">
            {showBlink && (
              <MapPin className="h-4 w-4 shrink-0 text-[var(--color-primary)] animate-pulse" aria-hidden />
            )}
            <span className="truncate" title={basePoint.label || 'Your location'}>
              {basePoint.label || 'Your location'}
            </span>
          </span>
          <button
            type="button"
            onClick={clearBasePoint}
            className="flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
            aria-label="Clear base point"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={handleCurrentLocation}
            disabled={locationLoading}
            className="flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {locationLoading ? (
              <span className="animate-pulse">Getting…</span>
            ) : (
              <>
                <Navigation className="h-3.5 w-3.5" />
                Current
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleUseSaved}
            className="flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
          >
            <Home className="h-3.5 w-3.5" />
            Saved
          </button>
          <div className="flex items-center gap-1">
            <input
              type="text"
              placeholder="Address..."
              value={customAddress}
              onChange={(e) => setCustomAddress(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCustomGeocode()}
              className="rounded border border-slate-200 px-2 py-1 text-xs w-32"
            />
            <button
              type="button"
              onClick={handleCustomGeocode}
              disabled={geocodeLoading || !customAddress.trim()}
              className="rounded border border-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-1 text-xs text-[var(--color-primary)] disabled:opacity-50"
            >
              {geocodeLoading ? '…' : 'Go'}
            </button>
          </div>
          {geocodeError && <span className="text-xs text-red-600">{geocodeError}</span>}
        </>
      )}
    </div>
  )
}
