import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { DistanceResult } from '../api/client'

const LOCATION_DETECTED_BLINK_MS = 4000

const BASE_POINT_STORAGE_KEY = 'cellleads_pro_base_point'
const LEGACY_BASE_POINT_KEY = 'hotlead_base_point'

export interface BasePoint {
  lat: number
  lng: number
  label: string
}

export interface DistanceMap {
  [placeId: string]: { distance_text: string; duration_text: string; duration_seconds: number }
}

interface GeoState {
  basePoint: BasePoint | null
  distanceMap: DistanceMap
  /** Timestamp when location was just detected (GPS); used to show blink icon for a few seconds. */
  locationDetectedAt: number | null
  /** When 'gps', search uses current location; city/region filters are visually disabled. When 'manual', user uses city/address. */
  locationMode: 'gps' | 'manual' | null
}

interface GeoContextValue extends GeoState {
  setBasePoint: (point: BasePoint | null) => void
  setDistanceMap: (map: DistanceMap) => void
  clearBasePoint: () => void
  markLocationJustDetected: () => void
  setLocationMode: (mode: 'gps' | 'manual' | null) => void
}

const GeoContext = createContext<GeoContextValue | null>(null)

function loadStoredBasePoint(): BasePoint | null {
  try {
    if (typeof localStorage === 'undefined') return null
    let raw = localStorage.getItem(BASE_POINT_STORAGE_KEY)
    if (!raw && localStorage.getItem(LEGACY_BASE_POINT_KEY)) {
      raw = localStorage.getItem(LEGACY_BASE_POINT_KEY)
      if (raw) {
        localStorage.setItem(BASE_POINT_STORAGE_KEY, raw)
        localStorage.removeItem(LEGACY_BASE_POINT_KEY)
      }
    }
    if (!raw) return null
    const data = JSON.parse(raw) as { lat?: number; lng?: number; label?: string }
    if (typeof data?.lat !== 'number' || typeof data?.lng !== 'number') return null
    return { lat: data.lat, lng: data.lng, label: typeof data.label === 'string' ? data.label : 'Saved' }
  } catch {
    return null
  }
}

export function GeoProvider({ children }: { children: React.ReactNode }) {
  const [basePoint, setBasePointState] = useState<BasePoint | null>(loadStoredBasePoint)
  const [distanceMap, setDistanceMap] = useState<DistanceMap>({})
  const [locationDetectedAt, setLocationDetectedAt] = useState<number | null>(null)
  const [locationMode, setLocationModeState] = useState<'gps' | 'manual' | null>(() => {
    const p = loadStoredBasePoint()
    return p?.label?.trim() === 'Current location' ? 'gps' : null
  })

  useEffect(() => {
    if (locationDetectedAt == null) return
    const t = setTimeout(() => setLocationDetectedAt(null), LOCATION_DETECTED_BLINK_MS)
    return () => clearTimeout(t)
  }, [locationDetectedAt])

  const setBasePoint = useCallback((point: BasePoint | null) => {
    setBasePointState(point)
    if (point?.label?.trim() === 'Current location') {
      setLocationModeState('gps')
    } else if (!point) {
      setLocationModeState(null)
    }
    try {
      if (point) {
        localStorage.setItem(BASE_POINT_STORAGE_KEY, JSON.stringify(point))
      } else {
        localStorage.removeItem(BASE_POINT_STORAGE_KEY)
      }
    } catch {
      // ignore
    }
  }, [])

  const clearBasePoint = useCallback(() => {
    setBasePointState(null)
    setDistanceMap({})
    setLocationDetectedAt(null)
    setLocationModeState(null)
    try {
      localStorage.removeItem(BASE_POINT_STORAGE_KEY)
    } catch {
      // ignore
    }
  }, [])

  const setDistanceMapCallback = useCallback((map: DistanceMap) => {
    setDistanceMap(map)
  }, [])

  const setLocationMode = useCallback((mode: 'gps' | 'manual' | null) => {
    setLocationModeState(mode)
  }, [])

  const markLocationJustDetected = useCallback(() => {
    setLocationDetectedAt(Date.now())
  }, [])

  const value = useMemo<GeoContextValue>(
    () => ({
      basePoint,
      distanceMap,
      locationDetectedAt,
      locationMode,
      setBasePoint,
      setDistanceMap: setDistanceMapCallback,
      clearBasePoint,
      markLocationJustDetected,
      setLocationMode,
    }),
    [basePoint, distanceMap, locationDetectedAt, locationMode, setBasePoint, setDistanceMapCallback, clearBasePoint, markLocationJustDetected, setLocationMode]
  )

  return <GeoContext.Provider value={value}>{children}</GeoContext.Provider>
}

export function useGeo(): GeoContextValue {
  const ctx = useContext(GeoContext)
  if (!ctx) throw new Error('useGeo must be used within GeoProvider')
  return ctx
}

export function useGeoOptional(): GeoContextValue | null {
  return useContext(GeoContext)
}

/** Build DistanceMap from API results */
export function resultsToDistanceMap(results: DistanceResult[]): DistanceMap {
  const map: DistanceMap = {}
  for (const r of results) {
    map[r.place_id] = {
      distance_text: r.distance_text,
      duration_text: r.duration_text,
      duration_seconds: r.duration_seconds,
    }
  }
  return map
}
