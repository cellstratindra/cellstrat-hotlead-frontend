import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
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
import type { SavedLead } from '../api/client'
import { updateLeadStage } from '../api/client'

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

function DraggableLeadCard({ lead }: { lead: SavedLead }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `lead-${lead.id}`,
    data: { lead },
  })
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`rounded-lg border border-slate-200 bg-white p-3 shadow-sm cursor-grab hover:border-slate-300 ${isDragging ? 'opacity-50' : ''}`}
    >
      <LeadCardContent lead={lead} showLink />
    </div>
  )
}

function DroppableColumn({
  stage,
  leads,
}: {
  stage: string
  leads: SavedLead[]
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
          <DraggableLeadCard key={lead.id} lead={lead} />
        ))}
      </div>
    </div>
  )
}

interface PipelineBoardProps {
  leads: SavedLead[]
  onLeadsChange: (updated: SavedLead[]) => void
}

export function PipelineBoard({ leads, onLeadsChange }: PipelineBoardProps) {
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
