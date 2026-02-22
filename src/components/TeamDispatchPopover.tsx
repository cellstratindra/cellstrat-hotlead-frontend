import { useRef, useEffect } from 'react'
import type { AssignableUser } from '../api/client'

interface TeamDispatchPopoverProps {
  open: boolean
  onClose: () => void
  anchorRef: React.RefObject<HTMLElement | null>
  leadId: number
  assignedTo: string | null
  users: AssignableUser[]
  currentUserId?: string | null
  onAssign: (userId: string) => Promise<void>
  onUnassign: () => Promise<void>
}

export function TeamDispatchPopover({
  open,
  onClose,
  anchorRef,
  leadId: _leadId,
  assignedTo,
  users,
  currentUserId: _currentUserId,
  onAssign,
  onUnassign,
}: TeamDispatchPopoverProps) {
  const popRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (
        popRef.current && !popRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, onClose, anchorRef])

  if (!open) return null

  const anchor = anchorRef.current
  if (!anchor) return null

  const rect = anchor.getBoundingClientRect()

  return (
    <div
      ref={popRef}
      className="fixed z-50 min-w-[200px] rounded-[8px] border border-slate-200 bg-white py-2 shadow-[var(--shadow-dropdown)]"
      style={{
        left: rect.left,
        top: rect.bottom + 4,
      }}
      role="dialog"
      aria-label="Team Dispatch"
    >
      <div className="px-3 py-1.5 text-xs font-medium text-slate-500 border-b border-slate-100">
        Assign lead
      </div>
      {assignedTo && (
        <button
          type="button"
          onClick={() => {
            onUnassign().then(onClose).catch(() => {})
          }}
          className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
        >
          <span className="text-amber-600">Unassign</span>
        </button>
      )}
      {users.map((u) => (
        <button
          key={u.id}
          type="button"
          onClick={() => {
            onAssign(u.id).then(onClose).catch(() => {})
          }}
          className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2563EB]/10 text-xs font-medium text-[#2563EB]">
            {(u.name || u.email || u.id).slice(0, 2).toUpperCase()}
          </span>
          <span className="truncate">{u.name || u.email || u.id}</span>
          {assignedTo === u.id && (
            <span className="ml-auto text-xs text-emerald-600">Assigned</span>
          )}
        </button>
      ))}
    </div>
  )
}
