import React from 'react';
import type { HotLead } from '../types/leads';
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface LeadCardProps {
    lead: HotLead;
}

const LeadCard: React.FC<LeadCardProps> = ({ lead }) => {
    return (
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-100 text-blue-700 font-bold text-lg rounded-md p-3">{lead.recommendation_score || 'N/A'}</div>
                    <div>
                        <h4 className="font-bold text-slate-800">{lead.name}</h4>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SortableLeadCard: React.FC<LeadCardProps> = ({ lead }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: lead.place_id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <LeadCard lead={lead} />
        </div>
    );
};

interface PipelineColumnProps {
    title: string;
    leads: HotLead[];
}

const PipelineColumn: React.FC<PipelineColumnProps> = ({ title, leads }) => {
    return (
        <div className="bg-slate-100 rounded-xl p-4 flex-1">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">{title}</h3>
            <SortableContext items={leads.map(l => l.place_id)} strategy={verticalListSortingStrategy}>
                {leads.map(lead => <SortableLeadCard key={lead.place_id} lead={lead} />)}
            </SortableContext>
        </div>
    );
};

interface LeadPipelineViewTrackerProps {
    leads: HotLead[];
}

export const LeadPipelineViewTracker: React.FC<LeadPipelineViewTrackerProps> = ({ leads = [] }) => {
    const [leadState, setLeadState] = React.useState({ 
        new: leads.slice(0, 1),
        kanan: leads.slice(1, 2),
        inProgress: leads.slice(2, 3)
    });

    React.useEffect(() => {
        setLeadState({
            new: leads.slice(0, 1),
            kanan: leads.slice(1, 2),
            inProgress: leads.slice(2, 3)
        });
    }, [leads]);

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (!over) return;
        console.log(`Dragged ${active.id} over ${over.id}`);
    }

    return (
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Lead Pipeline View Tracker</h2>
                <div className="flex gap-6">
                    <PipelineColumn title="New" leads={leadState.new} />
                    <PipelineColumn title="Kanan View" leads={leadState.kanan} />
                    <PipelineColumn title="In Progress" leads={leadState.inProgress} />
                </div>
            </div>
        </DndContext>
    );
};