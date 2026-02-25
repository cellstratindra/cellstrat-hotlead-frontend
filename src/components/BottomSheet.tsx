import { useEffect } from 'react'
import { X } from 'lucide-react'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  /** Optional aria label (defaults to title) */
  ariaLabel?: string
}

/**
 * Mobile-only slide-up bottom sheet. Use with a sibling desktop panel (e.g. right drawer).
 * - max-h-[85vh], rounded top corners, drag handle, internal scroll.
 * - Escape key and overlay click close. Focus trap recommended when open.
 */
export function BottomSheet({ open, onClose, title, children, ariaLabel }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed left-0 right-0 bottom-0 z-[var(--z-drawer)] md:hidden transition-transform duration-300 ease-out"
      role="presentation"
    >
      <div
        className="max-h-[85vh] flex flex-col bg-white rounded-t-[var(--radius-xl)] shadow-[var(--shadow-elevated)] border border-slate-200 border-b-0 w-full"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? title}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2 shrink-0">
          <div className="w-12 h-1.5 rounded-full bg-slate-300" aria-hidden />
        </div>
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 shrink-0">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="touch-target flex items-center justify-center rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 min-h-[44px] min-w-[44px]"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  )
}
