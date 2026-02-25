import { useState, useEffect } from 'react'
import { WifiOff, X } from 'lucide-react'

export function OfflineIndicator() {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => {
      setOnline(false)
      setDismissed(false)
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (online || dismissed) return null

  return (
    <div
      className="sticky top-16 z-[1040] flex items-center justify-between gap-3 px-4 py-2 bg-amber-100 border-b border-amber-200 text-amber-900 text-sm"
      role="status"
      aria-live="polite"
    >
      <span className="flex items-center gap-2 font-medium">
        <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
        You're offline — search results may be limited
      </span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="touch-target flex items-center justify-center rounded p-1 text-amber-700 hover:bg-amber-200 focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 min-h-[44px] min-w-[44px] md:min-h-[36px] md:min-w-[36px]"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
