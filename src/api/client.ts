import type { HotLead, SearchResponse } from '../types/leads'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

/** Normalize a single lead from API so all fields are defined (backend sends snake_case). */
function normalizeLead(raw: Record<string, unknown>): HotLead {
  return {
    place_id: String(raw?.place_id ?? ''),
    name: String(raw?.name ?? ''),
    rating: Number(raw?.rating ?? 0),
    review_count: Number(raw?.review_count ?? 0),
    phone: String(raw?.phone ?? ''),
    reviews: Array.isArray(raw?.reviews)
      ? (raw.reviews as Record<string, unknown>[]).map((r) => ({
          text: String(r?.text ?? ''),
          flagged_keywords: Array.isArray(r?.flagged_keywords)
            ? (r.flagged_keywords as string[]).filter((k) => typeof k === 'string')
            : [],
        }))
      : [],
    enrichment_summary: raw?.enrichment_summary != null ? String(raw.enrichment_summary) : null,
    outreach_suggestion: raw?.outreach_suggestion != null ? String(raw.outreach_suggestion) : null,
  }
}

export async function enrichLeads(leads: HotLead[]): Promise<HotLead[]> {
  if (leads.length === 0) return []
  const res = await fetch(`${API_BASE}/api/leads/enrich`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leads }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    const detail = err?.detail
    const message = typeof detail === 'string' ? detail : res.statusText
    throw new Error(message || `Enrichment failed: ${res.status}`)
  }
  const data = (await res.json()) as { leads?: unknown[] }
  return Array.isArray(data?.leads) ? data.leads.map((l) => normalizeLead(l as Record<string, unknown>)) : []
}

export interface SavedLead {
  id: number
  place_id: string
  name: string
  rating: number
  review_count: number
  phone: string
  reviews: { text: string; flagged_keywords: string[] }[]
  enrichment_summary?: string | null
  outreach_suggestion?: string | null
  source_city?: string | null
  source_specialty?: string | null
  source_region?: string | null
  stage: string
  created_at?: string
  updated_at?: string
}

export interface LeadDetail extends SavedLead {
  notes: { id: number; content: string; created_at: string }[]
  stage_history: { stage: string; created_at: string }[]
}

function normalizeSavedLead(raw: Record<string, unknown>): SavedLead {
  const base = normalizeLead(raw)
  return {
    ...base,
    id: Number(raw?.id ?? 0),
    source_city: raw?.source_city != null ? String(raw.source_city) : null,
    source_specialty: raw?.source_specialty != null ? String(raw.source_specialty) : null,
    source_region: raw?.source_region != null ? String(raw.source_region) : null,
    stage: String(raw?.stage ?? 'new'),
    created_at: raw?.created_at != null ? String(raw.created_at) : undefined,
    updated_at: raw?.updated_at != null ? String(raw.updated_at) : undefined,
  }
}

export async function saveLeads(
  leads: HotLead[],
  sourceCity?: string,
  sourceSpecialty?: string,
  sourceRegion?: string
): Promise<number[]> {
  const res = await fetch(`${API_BASE}/api/leads/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      leads,
      source_city: sourceCity || null,
      source_specialty: sourceSpecialty || null,
      source_region: sourceRegion || null,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(typeof err?.detail === 'string' ? err.detail : 'Save failed')
  }
  const data = (await res.json()) as { saved_ids?: number[] }
  return Array.isArray(data?.saved_ids) ? data.saved_ids : []
}

export async function getLeads(params?: { stage?: string; source_city?: string; source_specialty?: string }): Promise<SavedLead[]> {
  const q = new URLSearchParams()
  if (params?.stage) q.set('stage', params.stage)
  if (params?.source_city) q.set('source_city', params.source_city)
  if (params?.source_specialty) q.set('source_specialty', params.source_specialty)
  const url = `${API_BASE}/api/leads${q.toString() ? `?${q}` : ''}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to load leads')
  const data = (await res.json()) as { leads?: unknown[] }
  return Array.isArray(data?.leads) ? data.leads.map((l) => normalizeSavedLead(l as Record<string, unknown>)) : []
}

export async function getLead(id: number): Promise<LeadDetail> {
  const res = await fetch(`${API_BASE}/api/leads/${id}`)
  if (!res.ok) {
    if (res.status === 404) throw new Error('Lead not found')
    throw new Error('Failed to load lead')
  }
  const raw = (await res.json()) as Record<string, unknown>
  const lead = normalizeSavedLead(raw)
  const notes = Array.isArray(raw?.notes) ? raw.notes as { id: number; content: string; created_at: string }[] : []
  const stage_history = Array.isArray(raw?.stage_history) ? raw.stage_history as { stage: string; created_at: string }[] : []
  return { ...lead, notes, stage_history }
}

export async function addNote(leadId: number, content: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/leads/${leadId}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })
  if (!res.ok) throw new Error('Failed to add note')
}

export async function updateLeadStage(leadId: number, stage: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/leads/${leadId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stage }),
  })
  if (!res.ok) throw new Error('Failed to update lead')
}

/** Trigger download of CRM export CSV with optional filters. */
export function exportForCrmUrl(params?: { stage?: string; source_city?: string; source_specialty?: string }): string {
  const q = new URLSearchParams()
  if (params?.stage) q.set('stage', params.stage)
  if (params?.source_city) q.set('source_city', params.source_city)
  if (params?.source_specialty) q.set('source_specialty', params.source_specialty)
  return `${API_BASE}/api/leads/export/crm${q.toString() ? `?${q}` : ''}`
}

export async function searchLeads(
  city: string,
  specialty: string,
  region?: string
): Promise<SearchResponse> {
  const res = await fetch(`${API_BASE}/api/leads/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ city, specialty, region: region || null }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    const detail = err?.detail
    const message =
      typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map((d: { msg?: string }) => d?.msg).filter(Boolean).join('; ') || res.statusText
          : res.statusText
    throw new Error(message || `Search failed: ${res.status}`)
  }
  const data = (await res.json()) as { leads?: unknown[] }
  const leads = Array.isArray(data?.leads) ? data.leads.map((l) => normalizeLead(l as Record<string, unknown>)) : []
  return { leads }
}
