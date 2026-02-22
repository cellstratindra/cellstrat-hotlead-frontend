import { useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import { SavedLeadCard } from './SavedLeadCard'
import type { SavedLead } from '../api/client'

const SWIPE_THRESHOLD = 80

interface SwipeableLeadCardProps {
  lead: SavedLead
  isYou: boolean
  selected: boolean
  onToggle: (checked: boolean) => void
  onSwipeRight: () => void
  onSwipeLeft: () => void
}

export function SwipeableLeadCard({
  lead,
  isYou,
  selected,
  onToggle,
  onSwipeRight,
  onSwipeLeft,
}: SwipeableLeadCardProps) {
  const [offset, setOffset] = useState(0)
  const [action, setAction] = useState<'right' | 'left' | null>(null)
  const startX = useRef(0)

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
      onSwipeRight()
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10)
    } else if (action === 'left') {
      onSwipeLeft()
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10)
    }
    setOffset(0)
    setAction(null)
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Background actions (visible when swiping) */}
      <div className="absolute inset-0 flex">
        <div
          className="flex-1 flex items-center justify-center bg-emerald-500/90 text-white"
          aria-hidden
        >
          <Check className="h-8 w-8" />
          <span className="ml-2 text-sm font-medium">Qualified</span>
        </div>
        <div
          className="flex-1 flex items-center justify-center bg-red-500/90 text-white"
          aria-hidden
        >
          <X className="h-8 w-8" />
          <span className="ml-2 text-sm font-medium">Reject</span>
        </div>
      </div>
      <div
        className="relative touch-pan-y"
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <SavedLeadCard lead={lead} isYou={isYou} selected={selected} onToggle={onToggle} />
      </div>
    </div>
  )
}
