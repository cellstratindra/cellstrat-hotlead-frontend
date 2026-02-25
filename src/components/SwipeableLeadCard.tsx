import { memo, useRef, useState, useEffect } from 'react'
import { Check, X } from 'lucide-react'
import { SavedLeadCard } from './SavedLeadCard'
import type { SavedLead } from '../api/client'

const SWIPE_THRESHOLD = 80
const HINT_KEY = 'cellleads_pro_swipe_hint_seen'
const LEGACY_HINT_KEY = 'hotleads_swipe_hint_seen'

interface SwipeableLeadCardProps {
  lead: SavedLead
  isYou: boolean
  /** Resolved display name of the assignee (or null if unassigned) */
  assignedToLabel: string | null
  selected: boolean
  onToggle: (leadId: number, checked: boolean) => void
  onSwipeRight: (leadId: number) => void
  onSwipeLeft: (leadId: number) => void
  /** When true, show a one-time "Swipe right to qualify" hint (e.g. first card in list) */
  showSwipeHint?: boolean
}

function SwipeableLeadCardInner({
  lead,
  isYou,
  assignedToLabel,
  selected,
  onToggle,
  onSwipeRight,
  onSwipeLeft,
  showSwipeHint = false,
}: SwipeableLeadCardProps) {
  const [offset, setOffset] = useState(0)
  const [action, setAction] = useState<'right' | 'left' | null>(null)
  const [hintVisible, setHintVisible] = useState(false)
  const startX = useRef(0)

  useEffect(() => {
    if (!showSwipeHint || typeof sessionStorage === 'undefined') return
    let seen = sessionStorage.getItem(HINT_KEY)
    if (!seen && sessionStorage.getItem(LEGACY_HINT_KEY)) {
      seen = sessionStorage.getItem(LEGACY_HINT_KEY)
      try {
        if (seen) {
          sessionStorage.setItem(HINT_KEY, seen)
          sessionStorage.removeItem(LEGACY_HINT_KEY)
        }
      } catch { /* ignore */ }
    }
    if (!seen) setHintVisible(true)
  }, [showSwipeHint])

  const dismissHint = () => {
    setHintVisible(false)
    try { sessionStorage.setItem(HINT_KEY, '1') } catch { /* ignore */ }
  }

  function handleTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX
    setAction(null)
  }

  function handleTouchMove(e: React.TouchEvent) {
    const dx = e.touches[0].clientX - startX.current
    setOffset(dx)
    if (dx > SWIPE_THRESHOLD) setAction('right')
    else if (dx < -SWIPE_THRESHOLD) setAction('left')
    else setAction(null)
  }

  function handleTouchEnd() {
    if (action === 'right') {
      onSwipeRight(lead.id)
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10)
    } else if (action === 'left') {
      onSwipeLeft(lead.id)
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10)
    }
    setOffset(0)
    setAction(null)
  }

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-card)]">
      {/* Background actions (visible when swiping) */}
      <div className="absolute inset-0 flex">
        <div
          className="flex-1 flex items-center justify-center bg-emerald-500/90 text-white"
          aria-hidden
        >
          <Check className="h-8 w-8" />
          <span className="ml-[var(--space-2)] text-sm font-medium">Qualified</span>
        </div>
        <div
          className="flex-1 flex items-center justify-center bg-red-500/90 text-white"
          aria-hidden
        >
          <X className="h-8 w-8" />
          <span className="ml-[var(--space-2)] text-sm font-medium">Reject</span>
        </div>
      </div>
      <div
        className="relative touch-pan-y"
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={(e) => { if (hintVisible) dismissHint(); handleTouchStart(e) }}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="relative">
          {hintVisible && (
            <div
              className="absolute top-0 right-0 z-10 rounded-[var(--radius-sm)] bg-[var(--color-primary)]/90 text-white px-[var(--space-2)] py-[var(--space-1)] text-xs font-medium shadow-[var(--shadow-soft)] flex items-center gap-[var(--space-1)]"
              role="status"
              aria-live="polite"
            >
              <span>Swipe right → qualify, left → new</span>
              <button
                type="button"
                onClick={dismissHint}
                className="rounded p-[var(--space-1)] hover:bg-white/20 focus:ring-2 focus:ring-white focus:ring-offset-1 focus:ring-offset-[var(--color-primary)]"
                aria-label="Dismiss hint"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          <SavedLeadCard lead={lead} isYou={isYou} assignedToLabel={assignedToLabel} selected={selected} onToggle={onToggle} />
        </div>
      </div>
    </div>
  )
}

export const SwipeableLeadCard = memo(SwipeableLeadCardInner)
