import type { ReactNode } from 'react'
import { API_BASE } from '../api/client'

interface MapPreviewProps {
  /** Static map image URL from backend (may be relative e.g. /api/leads/static-map?lat=...) */
  staticMapUrl: string | null
  /** For fallback when no map */
  name?: string
  /** Place ID for Google Maps deep link */
  placeId?: string | null
  /** Lat/lng for deep link when place_id not available */
  latitude?: number | null
  longitude?: number | null
  className?: string
  /** Desktop: 300x150, mobile: full width */
  fullWidthOnMobile?: boolean
}

function buildMapsUrl(placeId: string | null, lat: number | null, lng: number | null): string {
  if (placeId) {
    return `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(placeId)}`
  }
  if (lat != null && lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`
  }
  return 'https://www.google.com/maps'
}

export function MapPreview({
  staticMapUrl,
  name,
  placeId = null,
  latitude = null,
  longitude = null,
  className = '',
  fullWidthOnMobile = true,
}: MapPreviewProps) {
  const hasLocation = staticMapUrl || (latitude != null && longitude != null)
  const mapsUrl = buildMapsUrl(placeId ?? null, latitude, longitude)
  const imgSrc = staticMapUrl?.startsWith('/')
    ? `${API_BASE.replace(/\/$/, '')}${staticMapUrl}`
    : staticMapUrl

  if (!hasLocation) {
    return (
      <div
        className={`rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center text-slate-500 text-sm ${fullWidthOnMobile ? 'w-full' : 'w-[300px]'} h-[150px] ${className}`}
        aria-label="Location unavailable"
      >
        Location unavailable
      </div>
    )
  }

  const content: ReactNode = imgSrc ? (
    <img
      src={imgSrc}
      alt={`Map location for ${name ?? 'clinic'}`}
      loading="lazy"
      className="w-full h-full object-cover"
      width={600}
      height={300}
    />
  ) : (
    <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-500 text-sm">
      Map unavailable
    </div>
  )

  return (
    <a
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`block rounded-xl overflow-hidden border border-slate-200 shadow-[var(--shadow-soft)] ${fullWidthOnMobile ? 'w-full' : 'w-[300px]'} h-[150px] ${className}`}
      style={{ minHeight: 150 }}
      aria-label={`Open ${name ?? 'clinic'} in Google Maps`}
    >
      {content}
    </a>
  )
}
