import { useCallback, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { User } from 'lucide-react'
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { SavedLead, AssignableUser } from '../api/client'
import { updateLeadStage } from '../api/client'
import { TeamDispatchPopover } from './TeamDispatchPopover'

const STAGES = ['new', 'contacted', 'meeting_booked', 'qualified', 'nurtured']

function LeadCardContent({
  lead,
  showLink,
  className,
}: {
  lead: SavedLead
  showLink: boolean
  className?: string
}) {
  return (
    <div className={className}>
      <div className="font-medium text-slate-900 truncate">{lead.name}</div>
      <div className="text-xs text-slate-500 mt-0.5">
        {Number(lead.rating).toFixed(1)} · {lead.review_count} reviews
      </div>
      {showLink && (
        <Link
          to={`/leads/${lead.id}`}
          onClick={(e) => e.stopPropagation()}
          className="mt-2 inline-block text-xs text-blue-600 hover:underline"
        >
          View
        </Link>
      )}
    </div>
  )
}

function DraggableLeadCard({
  lead,
  assignableUsers,
  currentUserId,
  onAssign,
  onUnassign,
}: {
  lead: SavedLead
  assignableUsers: AssignableUser[]
  currentUserId: string | null
  onAssign: (leadId: number, userId: string) => Promise<void>
  onUnassign: (leadId: number) => Promise<void>
}) {
  const [dispatchOpen, setDispatchOpen] = useState(false)
  const assignAnchorRef = useRef<HTMLButtonElement>(null)
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `lead-${lead.id}`,
    data: { lead },
  })
  const assignedTo = lead.assigned_to ?? null
  const showAssign = assignableUsers.length > 0

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`rounded-lg border border-slate-200 bg-white p-3 shadow-sm cursor-grab hover:border-slate-300 ${isDragging ? 'opacity-50' : ''}`}
    >
      <LeadCardContent lead={lead} showLink />
      {showAssign && (
        <div className="mt-2 flex items-center gap-1.5">
          <button
            ref={assignAnchorRef}
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setDispatchOpen((o) => !o)
            }}
            className="flex items-center gap-1 rounded-[8px] border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs hover:bg-slate-100"
            aria-label="Assign lead"
          >
            {assignedTo ? (
              <span className="h-5 w-5 rounded-full bg-[#2563EB]/15 flex items-center justify-center text-[10px] font-medium text-[#2563EB]">
                {assignedTo.slice(0, 2).toUpperCase()}
              </span>
            ) : (
              <User className="h-3.5 w-3.5 text-slate-400" />
            )}
            <span className="text-slate-600">{assignedTo ? assignedTo.slice(0, 8) : 'Assign'}</span>
          </button>
          <TeamDispatchPopover
            open={dispatchOpen}
            onClose={() => setDispatchOpen(false)}
            anchorRef={assignAnchorRef}
            leadId={lead.id}
            assignedTo={assignedTo}
            users={assignableUsers}
            currentUserId={currentUserId}
            onAssign={(userId) => onAssign(lead.id, userId)}
            onUnassign={() => onUnassign(lead.id)}
          />
        </div>
      )}
    </div>
  )
}

function DroppableColumn({
  stage,
  leads,
  assignableUsers,
  currentUserId,
  onAssign,
  onUnassign,
}: {
  stage: string
  leads: SavedLead[]
  assignableUsers: AssignableUser[]
  currentUserId: string | null
  onAssign: (leadId: number, userId: string) => Promise<void>
  onUnassign: (leadId: number) => Promise<void>
}) {
  const { isOver, setNodeRef } = useDroppable({ id: `stage-${stage}` })

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-56 rounded-lg border-2 border-dashed p-3 min-h-[200px] ${
        isOver ? 'border-blue-400 bg-blue-50/50' : 'border-slate-200 bg-slate-50/50'
      }`}
    >
      <h3 className="text-sm font-semibold text-slate-700 mb-2 capitalize">
        {stage.replace(/_/g, ' ')}
      </h3>
      <div className="space-y-2">
        {leads.map((lead) => (
          <DraggableLeadCard
            key={lead.id}
            lead={lead}
            assignableUsers={assignableUsers}
            currentUserId={currentUserId}
            onAssign={onAssign}
            onUnassign={onUnassign}
          />
        ))}
      </div>
    </div>
  )
}

interface PipelineBoardProps {
  leads: SavedLead[]
  onLeadsChange: (updated: SavedLead[]) => void
  assignableUsers?: AssignableUser[]
  currentUserId?: string | null
  onAssign?: (leadId: number, userId: string) => Promise<void>
  onUnassign?: (leadId: number) => Promise<void>
}

export function PipelineBoard({
  leads,
  onLeadsChange,
  assignableUsers = [],
  currentUserId = null,
  onAssign = async () => {},
  onUnassign = async () => {},
}: PipelineBoardProps) {
  const [activeLead, setActiveLead] = useState<SavedLead | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current
    if (data?.lead) setActiveLead(data.lead as SavedLead)
  }, [])

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveLead(null)
      const { active, over } = event
      if (!over?.id || typeof over.id !== 'string' || !over.id.startsWith('stage-'))
        return
      const data = active.data.current
      if (!data?.lead) return
      const lead = data.lead as SavedLead
      const newStage = over.id.replace('stage-', '')
      if (newStage === lead.stage) return
      try {
        await updateLeadStage(lead.id, newStage)
        onLeadsChange(
          leads.map((l) => (l.id === lead.id ? { ...l, stage: newStage } : l))
        )
      } catch {
        // keep UI unchanged on failure
      }
    },
    [leads, onLeadsChange]
  )

  const leadsByStage = STAGES.reduce(
    (acc, stage) => {
      acc[stage] = leads.filter((l) => l.stage === stage)
      return acc
    },
    {} as Record<string, SavedLead[]>
  )

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => (
          <DroppableColumn
            key={stage}
            stage={stage}
            leads={leadsByStage[stage] ?? []}
            assignableUsers={assignableUsers}
            currentUserId={currentUserId}
            onAssign={onAssign}
            onUnassign={onUnassign}
          />
        ))}
      </div>

      <DragOverlay>
        {activeLead ? (
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg cursor-grabbing w-52">
            <LeadCardContent lead={activeLead} showLink={false} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
