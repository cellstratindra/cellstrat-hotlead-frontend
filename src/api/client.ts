import type {
  CampaignDraftResponse,
  FeatureOccurrence,
  HotLead,
  MarketInsightsResponse,
  ProductFeature,
  ReviewChatResponse,
  ReviewChatScope,
  ReviewInsightsResponse,
  ReviewSummaryResponse,
  SearchResponse,
} from '../types/leads'

/** Use VITE_API_URL from env: local dev = http://localhost:8000, production = deployed backend URL. */
export const API_BASE =
  import.meta.env.VITE_API_URL ?? 'https://hotlead-backend-926771612705.us-central1.run.app'

/** Race fetch with a timeout so requests don't hang forever. On abort, throws a clear timeout error. */
function fetchWithTimeout(url: string, options: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
  const { timeoutMs = 12000, ...fetchOptions } = options
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  return fetch(url, { ...fetchOptions, signal: controller.signal })
    .then((res) => res)
    .catch((err: unknown) => {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Request timed out. Please try again.')
      }
      throw err
    })
    .finally(() => clearTimeout(timeout))
}

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
          rating: r?.rating != null ? Number(r.rating) : undefined,
          time: r?.time != null ? Number(r.time) : undefined,
          relative_time_description: r?.relative_time_description != null ? String(r.relative_time_description) : undefined,
        }))
      : [],
    enrichment_summary: raw?.enrichment_summary != null ? String(raw.enrichment_summary) : null,
    outreach_suggestion: raw?.outreach_suggestion != null ? String(raw.outreach_suggestion) : null,
    top_complaints: Array.isArray(raw?.top_complaints) ? (raw.top_complaints as string[]) : undefined,
    top_strengths: Array.isArray(raw?.top_strengths) ? (raw.top_strengths as string[]) : undefined,
    recommendation_score: raw?.recommendation_score != null ? Number(raw.recommendation_score) : null,
    tier: raw?.tier != null ? String(raw.tier) : null,
    estimated_budget_tier: raw?.estimated_budget_tier != null ? String(raw.estimated_budget_tier) : null,
    reach_band: raw?.reach_band != null ? String(raw.reach_band) : null,
    estimated_monthly_patients: raw?.estimated_monthly_patients != null ? Number(raw.estimated_monthly_patients) : null,
    reviews_summary: raw?.reviews_summary != null ? String(raw.reviews_summary) : null,
    rank_in_market: raw?.rank_in_market != null ? Number(raw.rank_in_market) : null,
    total_in_market: raw?.total_in_market != null ? Number(raw.total_in_market) : null,
    percentile_in_market: raw?.percentile_in_market != null ? Number(raw.percentile_in_market) : null,
    reason_to_contact: raw?.reason_to_contact != null ? String(raw.reason_to_contact) : null,
    suggested_action: raw?.suggested_action != null ? String(raw.suggested_action) : null,
    contact_rank: raw?.contact_rank != null ? Number(raw.contact_rank) : null,
    relevance_score: raw?.relevance_score != null ? Number(raw.relevance_score) : null,
    match_band: raw?.match_band != null ? String(raw.match_band) : null,
    id: raw?.id != null ? Number(raw.id) : null,
    contact_email: raw?.contact_email != null ? String(raw.contact_email) : null,
    director_name: raw?.director_name != null ? String(raw.director_name) : null,
    latitude: raw?.latitude != null ? Number(raw.latitude) : null,
    longitude: raw?.longitude != null ? Number(raw.longitude) : null,
    address: raw?.address != null ? String(raw.address) : null,
    place_types: Array.isArray(raw?.place_types) ? (raw.place_types as string[]) : undefined,
    static_map_url: raw?.static_map_url != null ? String(raw.static_map_url) : null,
    website_url: raw?.website_url != null ? String(raw.website_url) : null,
    owner_source: raw?.owner_source != null ? String(raw.owner_source) : null,
    owner_confidence: raw?.owner_confidence != null ? Number(raw.owner_confidence) : null,
  }
}

export async function fetchRecommendations(leads: HotLead[]): Promise<HotLead[]> {
  if (leads.length === 0) return []
  const res = await fetch(`${API_BASE}/api/leads/recommendations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leads }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    const detail = err?.detail
    const message = typeof detail === 'string' ? detail : res.statusText
    throw new Error(message || `Recommendations failed: ${res.status}`)
  }
  const data = (await res.json()) as { leads?: unknown[] }
  return Array.isArray(data?.leads) ? data.leads.map((l) => normalizeLead(l as Record<string, unknown>)) : []
}

export async function fetchHighlights(leads: HotLead[]): Promise<HotLead[]> {
  if (leads.length === 0) return []
  const res = await fetch(`${API_BASE}/api/leads/highlights`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leads }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    const detail = err?.detail
    const message = typeof detail === 'string' ? detail : res.statusText
    throw new Error(message || `Highlights failed: ${res.status}`)
  }
  const data = (await res.json()) as { leads?: unknown[] }
  return Array.isArray(data?.leads) ? data.leads.map((l) => normalizeLead(l as Record<string, unknown>)) : []
}

export async function fetchReviewSummary(
  lead: HotLead,
  question?: string | null
): Promise<ReviewSummaryResponse> {
  const res = await fetch(`${API_BASE}/api/leads/review-summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lead, question: question ?? undefined }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    const detail = err?.detail
    const message = typeof detail === 'string' ? detail : res.statusText
    throw new Error(message || `Review summary failed: ${res.status}`)
  }
  const data = (await res.json()) as ReviewSummaryResponse
  return {
    reviews_summary: data?.reviews_summary ?? '',
    negative_keywords: data?.negative_keywords ?? [],
    question_summary: data?.question_summary ?? null,
  }
}

const CAMPAIGN_DRAFT_TIMEOUT_MS = 60000

export async function fetchCampaignDraft(lead: HotLead): Promise<CampaignDraftResponse> {
  const res = await fetchWithTimeout(`${API_BASE}/api/leads/campaign-draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lead }),
    timeoutMs: CAMPAIGN_DRAFT_TIMEOUT_MS,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    const detail = err?.detail
    const message = typeof detail === 'string' ? detail : res.statusText
    throw new Error(message || `Campaign draft failed: ${res.status}`)
  }
  const data = (await res.json()) as CampaignDraftResponse
  return {
    email_draft: data?.email_draft ?? '',
    hook: data?.hook ?? '',
    linkedin_bullets: Array.isArray(data?.linkedin_bullets) ? data.linkedin_bullets : [],
  }
}

export async function fetchReviewInsights(lead: HotLead): Promise<ReviewInsightsResponse> {
  const res = await fetch(`${API_BASE}/api/leads/review-insights`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lead }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    const detail = err?.detail
    const message = typeof detail === 'string' ? detail : res.statusText
    throw new Error(message || `Review insights failed: ${res.status}`)
  }
  const data = (await res.json()) as ReviewInsightsResponse
  return data
}

export async function fetchReviewChat(
  lead: HotLead,
  question: string,
  scope: ReviewChatScope = 'all'
): Promise<ReviewChatResponse> {
  const res = await fetch(`${API_BASE}/api/leads/review-chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lead, question: question.trim(), scope }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    const detail = err?.detail
    const message = typeof detail === 'string' ? detail : res.statusText
    throw new Error(message || `Review chat failed: ${res.status}`)
  }
  const data = (await res.json()) as ReviewChatResponse
  return {
    answer: data?.answer ?? '',
    scope_used: data?.scope_used ?? null,
    review_count_used: data?.review_count_used ?? null,
  }
}

const ENRICH_TIMEOUT_MS = 45000

export async function enrichLeads(leads: HotLead[]): Promise<HotLead[]> {
  if (leads.length === 0) return []
  const res = await fetchWithTimeout(`${API_BASE}/api/leads/enrich`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leads }),
    timeoutMs: ENRICH_TIMEOUT_MS,
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

const INSIGHTS_TIMEOUT_MS = 45000

export async function fetchMarketInsights(leads: HotLead[]): Promise<MarketInsightsResponse> {
  if (leads.length === 0) {
    return { market_themes: [], prioritized_place_ids: [], market_pulse: '' }
  }
  const res = await fetchWithTimeout(`${API_BASE}/api/leads/market-insights`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leads }),
    timeoutMs: INSIGHTS_TIMEOUT_MS,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    const detail = err?.detail
    const message = typeof detail === 'string' ? detail : res.statusText
    throw new Error(message || `Market insights failed: ${res.status}`)
  }
  const data = (await res.json()) as MarketInsightsResponse
  return {
    market_themes: Array.isArray(data?.market_themes) ? data.market_themes : [],
    prioritized_place_ids: Array.isArray(data?.prioritized_place_ids) ? data.prioritized_place_ids : [],
    market_pulse: typeof data?.market_pulse === 'string' ? data.market_pulse : '',
  }
}

export interface SavedLead {
  id: number
  place_id: string
  name: string
  rating: number
  review_count: number
  phone: string
  reviews: { text: string; flagged_keywords: string[]; rating?: number | null; time?: number | null; relative_time_description?: string | null }[]
  latitude?: number | null
  longitude?: number | null
  address?: string | null
  place_types?: string[]
  enrichment_summary?: string | null
  outreach_suggestion?: string | null
  top_complaints?: string[]
  top_strengths?: string[]
  source_city?: string | null
  source_specialty?: string | null
  source_region?: string | null
  stage: string
  created_at?: string
  updated_at?: string
  estimated_monthly_patients?: number | null
  /** Lifecycle dashboard */
  lead_source?: string | null
  qualification_score?: number | null
  follow_up_count?: number
  last_contact_date?: string | null
  lost_reason?: string | null
  at_risk?: boolean
  contact_email?: string | null
  director_name?: string | null
  assigned_to?: string | null
}

export interface LeadUpdateParams {
  stage?: string
  lost_reason?: string | null
  qualification_score?: number | null
  lead_source?: string | null
  contact_email?: string | null
  director_name?: string | null
}

export interface FollowUp {
  id: number
  lead_id: number
  type: string
  summary: string | null
  created_at: string
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
    lead_source: raw?.lead_source != null ? String(raw.lead_source) : null,
    qualification_score: raw?.qualification_score != null ? Number(raw.qualification_score) : null,
    follow_up_count: raw?.follow_up_count != null ? Number(raw.follow_up_count) : 0,
    last_contact_date: raw?.last_contact_date != null ? String(raw.last_contact_date) : null,
    lost_reason: raw?.lost_reason != null ? String(raw.lost_reason) : null,
    at_risk: Boolean(raw?.at_risk),
    contact_email: raw?.contact_email != null ? String(raw.contact_email) : null,
    director_name: raw?.director_name != null ? String(raw.director_name) : null,
    assigned_to: raw?.assigned_to != null ? String(raw.assigned_to) : null,
    latitude: raw?.latitude != null ? Number(raw.latitude) : null,
    longitude: raw?.longitude != null ? Number(raw.longitude) : null,
    address: raw?.address != null ? String(raw.address) : null,
    place_types: Array.isArray(raw?.place_types) ? (raw.place_types as string[]) : undefined,
    static_map_url: raw?.static_map_url != null ? String(raw.static_map_url) : null,
  }
}

export interface AssignableUser {
  id: string
  email?: string
  name?: string
}

export async function saveLeads(
  leads: HotLead[],
  sourceCity?: string,
  sourceSpecialty?: string,
  sourceRegion?: string,
  userId?: string | null
): Promise<number[]> {
  const res = await fetch(`${API_BASE}/api/leads/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      leads,
      source_city: sourceCity || null,
      source_specialty: sourceSpecialty || null,
      source_region: sourceRegion || null,
      user_id: userId && userId.trim() ? userId.trim() : null,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(typeof err?.detail === 'string' ? err.detail : 'Save failed')
  }
  const data = (await res.json()) as { saved_ids?: number[] }
  return Array.isArray(data?.saved_ids) ? data.saved_ids : []
}

export async function getLeads(params?: {
  stage?: string
  source_city?: string
  source_specialty?: string
  scope?: 'my' | 'org'
  user_id?: string | null
}): Promise<SavedLead[]> {
  const q = new URLSearchParams()
  if (params?.stage) q.set('stage', params.stage)
  if (params?.source_city) q.set('source_city', params.source_city)
  if (params?.source_specialty) q.set('source_specialty', params.source_specialty)
  if (params?.scope) q.set('scope', params.scope)
  if (params?.user_id) q.set('user_id', params.user_id)
  const url = `${API_BASE}/api/leads${q.toString() ? `?${q}` : ''}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to load leads')
  const data = (await res.json()) as { leads?: unknown[] }
  return Array.isArray(data?.leads) ? data.leads.map((l) => normalizeSavedLead(l as Record<string, unknown>)) : []
}

export async function getAssignableUsers(): Promise<AssignableUser[]> {
  const res = await fetch(`${API_BASE}/api/leads/assignable-users`)
  if (!res.ok) throw new Error('Failed to load assignable users')
  const data = (await res.json()) as { users?: AssignableUser[] }
  return Array.isArray(data?.users) ? data.users : []
}

export async function assignLead(leadId: number, userId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/leads/${leadId}/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  })
  if (!res.ok) throw new Error('Failed to assign lead')
}

export async function unassignLead(leadId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/leads/${leadId}/unassign`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to unassign lead')
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

export interface OwnerResult {
  name: string
  role?: string | null
  confidence: number
  source_url?: string | null
}

export async function discoverOwner(leadId: number): Promise<OwnerResult | null> {
  const res = await fetch(`${API_BASE}/api/leads/${leadId}/discover-owner`, { method: 'POST' })
  if (!res.ok) throw new Error('Owner discovery failed')
  const data = (await res.json()) as OwnerResult | null
  return data
}

export async function getOwnerSearchUrl(leadId: number): Promise<{ url: string }> {
  const res = await fetch(`${API_BASE}/api/leads/${leadId}/owner-search-url`)
  if (!res.ok) throw new Error('Failed to get search URL')
  return res.json() as Promise<{ url: string }>
}

export async function addNote(leadId: number, content: string, userId?: string | null): Promise<void> {
  const res = await fetch(`${API_BASE}/api/leads/${leadId}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, user_id: userId ?? undefined }),
  })
  if (!res.ok) throw new Error('Failed to add note')
}

export async function updateLeadStage(leadId: number, stage: string): Promise<void> {
  await updateLead(leadId, { stage })
}

export interface BulkLeadUpdateParams {
  lead_ids: number[]
  contact_email?: string | null
  director_name?: string | null
  note?: string | null
}

export async function bulkUpdateLeads(params: BulkLeadUpdateParams): Promise<{ updated: number }> {
  const res = await fetch(`${API_BASE}/api/leads/bulk`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lead_ids: params.lead_ids,
      contact_email: params.contact_email ?? null,
      director_name: params.director_name ?? null,
      note: params.note ?? null,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(typeof err?.detail === 'string' ? err.detail : 'Bulk update failed')
  }
  const data = (await res.json()) as { updated?: number }
  return { updated: data?.updated ?? 0 }
}

export async function updateLead(leadId: number, params: LeadUpdateParams): Promise<void> {
  const body: Record<string, unknown> = {}
  if (params.stage !== undefined) body.stage = params.stage
  if (params.lost_reason !== undefined) body.lost_reason = params.lost_reason
  if (params.qualification_score !== undefined) body.qualification_score = params.qualification_score
  if (params.lead_source !== undefined) body.lead_source = params.lead_source
  if (params.contact_email !== undefined) body.contact_email = params.contact_email
  if (params.director_name !== undefined) body.director_name = params.director_name
  const res = await fetch(`${API_BASE}/api/leads/${leadId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    const msg = typeof err?.detail === 'string' ? err.detail : 'Failed to update lead'
    throw new Error(msg)
  }
}

export async function getFollowUps(leadId: number): Promise<FollowUp[]> {
  const res = await fetch(`${API_BASE}/api/leads/${leadId}/follow-ups`)
  if (!res.ok) throw new Error('Failed to load follow-ups')
  const data = (await res.json()) as { id: number; lead_id: number; type: string; summary: string | null; created_at: string }[]
  return Array.isArray(data) ? data : []
}

export async function addFollowUp(leadId: number, type: 'email' | 'call' | 'manual', summary?: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/leads/${leadId}/follow-ups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, summary: summary ?? null }),
  })
  if (!res.ok) throw new Error('Failed to add follow-up')
}

// --- Gmail integration ---

export interface GmailStatusResponse {
  connected: boolean
  email?: string | null
  picture?: string | null
  message?: string
}

function wrapNetworkError(err: unknown, context: string): never {
  const msg =
    err instanceof Error && (err.message === 'Failed to fetch' || err.name === 'TypeError')
      ? `Cannot reach backend at ${API_BASE}. Check VITE_API_URL and CORS for this origin.`
      : err instanceof Error
        ? err.message
        : 'Request failed'
  throw new Error(`${context}: ${msg}`)
}

export async function getGmailAuthUrl(userId: string): Promise<{ url: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/gmail/auth-url?user_id=${encodeURIComponent(userId)}`)
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }))
      throw new Error(typeof err?.detail === 'string' ? err.detail : 'Failed to get Gmail auth URL')
    }
    return res.json() as Promise<{ url: string }>
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Cannot reach backend')) throw e
    wrapNetworkError(e, 'Gmail auth URL')
  }
}

export async function getGmailStatus(userId: string): Promise<GmailStatusResponse> {
  if (!userId?.trim()) return { connected: false, message: 'No user' }
  try {
    const res = await fetch(`${API_BASE}/api/gmail/status?user_id=${encodeURIComponent(userId)}`)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { connected: false, message: typeof data?.detail === 'string' ? data.detail : 'Gmail status unavailable' }
    }
    return {
      connected: Boolean(data?.connected),
      email: data?.email ?? null,
      picture: data?.picture ?? null,
      message: data?.message ?? undefined,
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Cannot reach backend')) {
      return { connected: false, message: e.message }
    }
    return { connected: false, message: e instanceof Error ? e.message : 'Request failed' }
  }
}

export async function revokeGmail(userId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/gmail/revoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  })
  if (!res.ok) throw new Error('Failed to revoke Gmail')
}

export async function testGmailConnection(userId: string): Promise<{ success: boolean; message?: string }> {
  const res = await fetch(`${API_BASE}/api/gmail/test-connection`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(typeof err?.detail === 'string' ? err.detail : 'Test connection failed')
  }
  return res.json() as Promise<{ success: boolean; message?: string }>
}

export interface GmailSendParams {
  user_id: string
  to: string
  subject?: string
  body?: string
  cc?: string | null
  bcc?: string | null
  lead_id?: number | null
}

export async function sendGmail(params: GmailSendParams): Promise<{ success: boolean; message_id?: string }> {
  const res = await fetch(`${API_BASE}/api/gmail/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: params.user_id,
      to: params.to,
      subject: params.subject ?? '',
      body: params.body ?? '',
      cc: params.cc ?? null,
      bcc: params.bcc ?? null,
      lead_id: params.lead_id ?? null,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    const detail = err?.detail
    throw new Error(typeof detail === 'string' ? detail : 'Gmail send failed')
  }
  return res.json() as Promise<{ success: boolean; message_id?: string }>
}

export interface GmailDraftParams {
  user_id: string
  to: string
  subject?: string
  body?: string
  cc?: string | null
  bcc?: string | null
}

export async function createGmailDraft(params: GmailDraftParams): Promise<{ success: boolean; draft_id?: string }> {
  const res = await fetch(`${API_BASE}/api/gmail/draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: params.user_id,
      to: params.to,
      subject: params.subject ?? '',
      body: params.body ?? '',
      cc: params.cc ?? null,
      bcc: params.bcc ?? null,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    const detail = err?.detail
    throw new Error(typeof detail === 'string' ? detail : 'Gmail draft failed')
  }
  return res.json() as Promise<{ success: boolean; draft_id?: string }>
}

/** Trigger download of CRM export CSV with optional filters. */
export function exportForCrmUrl(params?: { stage?: string; source_city?: string; source_specialty?: string }): string {
  const q = new URLSearchParams()
  if (params?.stage) q.set('stage', params.stage)
  if (params?.source_city) q.set('source_city', params.source_city)
  if (params?.source_specialty) q.set('source_specialty', params.source_specialty)
  return `${API_BASE}/api/leads/export/crm${q.toString() ? `?${q}` : ''}`
}

export interface ScoreWeights {
  rating_weight: number
  review_count_weight: number
  phone_weight: number
  enrichment_weight: number
}

export interface SearchParams {
  /** When omitted or empty, backend uses country for broad search. */
  city?: string
  /** Country for country-level search when city is omitted (e.g. "India"). */
  country?: string
  /** When omitted or empty, backend searches all medical facilities (entity-level queries). */
  specialty?: string
  region?: string
  /** Optional: search by clinic/business name; bypasses underperformer filter */
  place_query?: string
  /** Optional: natural-language search; parsed by backend to structured params */
  nl_query?: string
  /** Optional: radius search center (geocoded by backend when center_lat/lng not provided) */
  center_place?: string
  /** Optional: radius center as coordinates (backend uses these when set, so "Current location" works without geocoding) */
  center_lat?: number
  center_lng?: number
  /** Optional: radius in km (1-50) */
  radius_km?: number
  sort_by?: string
  order?: string
  min_rating?: number
  min_review_count?: number
  has_phone?: boolean
  budget_max?: number
  score_weights?: ScoreWeights
}

export async function explainScore(lead: HotLead): Promise<{ explanation: string }> {
  const res = await fetch(`${API_BASE}/api/leads/explain-score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lead }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(typeof err?.detail === 'string' ? err.detail : 'Explain score failed')
  }
  const data = (await res.json()) as { explanation?: string }
  return { explanation: data?.explanation ?? '' }
}

export interface DistanceDestination {
  place_id: string
  latitude: number
  longitude: number
}

export interface DistanceResult {
  place_id: string
  distance_text: string
  duration_text: string
  duration_seconds: number
}

export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number }> {
  const res = await fetch(
    `${API_BASE}/api/leads/geocode?${new URLSearchParams({ address: address.trim() })}`
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(typeof err?.detail === 'string' ? err.detail : 'Geocoding failed')
  }
  const data = (await res.json()) as { lat?: number; lng?: number }
  if (data?.lat == null || data?.lng == null) throw new Error('Invalid geocode response')
  return { lat: data.lat, lng: data.lng }
}

/** Reverse geocode (lat, lng) to a short place name for display when location is detected. */
export async function reverseGeocode(lat: number, lng: number): Promise<{ name: string }> {
  const res = await fetch(
    `${API_BASE}/api/leads/reverse-geocode?${new URLSearchParams({ lat: String(lat), lng: String(lng) })}`
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(typeof err?.detail === 'string' ? err.detail : 'Could not get location name')
  }
  const data = (await res.json()) as { name?: string }
  if (typeof data?.name !== 'string') throw new Error('Invalid reverse geocode response')
  return { name: data.name }
}

export async function fetchDistances(
  originLat: number,
  originLng: number,
  destinations: DistanceDestination[]
): Promise<DistanceResult[]> {
  if (destinations.length === 0) return []
  const res = await fetch(`${API_BASE}/api/leads/distances`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      origin_lat: originLat,
      origin_lng: originLng,
      destinations,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(typeof err?.detail === 'string' ? err.detail : 'Distance lookup failed')
  }
  const data = (await res.json()) as { results?: DistanceResult[] }
  return Array.isArray(data?.results) ? data.results : []
}

export interface NearbyResult {
  lead: HotLead
  similarity_score: number
  distance_text?: string | null
}

export interface NearbyResponse {
  anchor: HotLead
  nearby: NearbyResult[]
}

export async function fetchNearby(
  anchorPlaceId: string,
  latitude: number,
  longitude: number,
  radiusKm: number = 5,
  specialty?: string | null
): Promise<NearbyResponse> {
  const res = await fetch(`${API_BASE}/api/leads/nearby`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      anchor_place_id: anchorPlaceId,
      latitude,
      longitude,
      radius_km: radiusKm,
      specialty: specialty ?? null,
      anchor_types: [],
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(typeof err?.detail === 'string' ? err.detail : 'Nearby search failed')
  }
  const data = (await res.json()) as { anchor?: unknown; nearby?: unknown[] }
  const anchor = data?.anchor != null ? normalizeLead(data.anchor as Record<string, unknown>) : null
  const nearby = Array.isArray(data?.nearby)
    ? (data.nearby as { lead?: unknown; similarity_score?: number; distance_text?: string | null }[]).map((n) => ({
        lead: normalizeLead((n.lead ?? {}) as Record<string, unknown>),
        similarity_score: Number(n.similarity_score ?? 0),
        distance_text: n.distance_text ?? null,
      }))
    : []
  if (!anchor) throw new Error('Invalid nearby response')
  return { anchor, nearby }
}

export async function searchLeads(params: SearchParams): Promise<SearchResponse> {
  const body: Record<string, unknown> = {
    city: params.city?.trim() || null,
    country: params.country?.trim() || null,
    specialty: params.specialty?.trim() ? params.specialty.trim().toLowerCase() : null,
    region: params.region?.trim() ? params.region.trim().toLowerCase() : null,
    place_query: params.place_query?.trim() || null,
    nl_query: params.nl_query?.trim() || null,
    center_place: params.center_place?.trim() || null,
    center_lat: params.center_lat ?? null,
    center_lng: params.center_lng ?? null,
    radius_km: params.radius_km ?? null,
    sort_by: params.sort_by || null,
    order: params.order || null,
    min_rating: params.min_rating ?? null,
    min_review_count: params.min_review_count ?? null,
    has_phone: params.has_phone ?? null,
    budget_max: params.budget_max ?? null,
    score_weights: params.score_weights ?? null,
  }
  const res = await fetchWithTimeout(`${API_BASE}/api/leads/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    timeoutMs: 45000,
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

export interface CoverageResponse {
  cities: string[]
  city_counts: Record<string, number>
  total_clinics: number
}

export async function getCoverage(): Promise<CoverageResponse> {
  const res = await fetch(`${API_BASE}/api/leads/coverage`)
  if (!res.ok) throw new Error('Failed to load coverage')
  return res.json() as Promise<CoverageResponse>
}

export interface BenchmarkResponse {
  rank: number
  total_in_market: number
  percentile: number
}

export async function fetchBenchmark(
  city: string,
  specialty: string,
  placeId: string,
  region?: string
): Promise<BenchmarkResponse> {
  const params = new URLSearchParams({ city, specialty, place_id: placeId })
  if (region?.trim()) params.set('region', region.trim())
  const res = await fetch(`${API_BASE}/api/leads/benchmark?${params}`)
  if (!res.ok) {
    if (res.status === 404) throw new Error('Lead not found in this market')
    throw new Error('Failed to load benchmark')
  }
  return res.json() as Promise<BenchmarkResponse>
}

export interface StatsResponse {
  total_leads: number
  by_stage: Record<string, number>
  by_city: Record<string, number>
  by_specialty: Record<string, number>
}

export async function getStats(): Promise<StatsResponse> {
  const res = await fetch(`${API_BASE}/api/leads/stats`)
  if (!res.ok) throw new Error('Failed to load stats')
  return res.json() as Promise<StatsResponse>
}

export interface KpisResponse {
  demo_to_deal: { actual: number; target: number }
  no_show_rate_trend: { name: string; value: number }[]
  lead_response_time_hours: number
}

const KPIS_TIMEOUT_MS = 8000

export async function getKpis(): Promise<{
  demoToDeal: { actual: number; target: number }
  noShowRateTrend: { name: string; value: number }[]
  leadResponseTimeHours: number
}> {
  const res = await fetchWithTimeout(`${API_BASE}/api/analytics/kpis`, { timeoutMs: KPIS_TIMEOUT_MS })
  if (!res.ok) return Promise.reject(new Error('Failed to load KPIs'))
  const raw = (await res.json()) as KpisResponse
  return {
    demoToDeal: raw.demo_to_deal ?? { actual: 0, target: 10 },
    noShowRateTrend: Array.isArray(raw.no_show_rate_trend) ? raw.no_show_rate_trend : [],
    leadResponseTimeHours: Number(raw.lead_response_time_hours ?? 0),
  }
}

// --- CellAssist product feature backlog ---

export async function listProductFeatures(leadId?: number): Promise<{ features: ProductFeature[] }> {
  const url = leadId != null ? `${API_BASE}/api/leads/product-features?lead_id=${leadId}` : `${API_BASE}/api/leads/product-features`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to load product features')
  const data = (await res.json()) as { features?: unknown[] }
  return { features: Array.isArray(data?.features) ? data.features as ProductFeature[] : [] }
}

export async function createProductFeature(canonicalName: string, description?: string | null): Promise<ProductFeature> {
  const res = await fetch(`${API_BASE}/api/leads/product-features`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ canonical_name: canonicalName, description: description ?? null }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(typeof err?.detail === 'string' ? err.detail : 'Failed to create feature')
  }
  return res.json() as Promise<ProductFeature>
}

export async function updateProductFeature(
  featureId: number,
  updates: { canonical_name?: string; description?: string | null }
): Promise<ProductFeature> {
  const res = await fetch(`${API_BASE}/api/leads/product-features/${featureId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(typeof err?.detail === 'string' ? err.detail : 'Failed to update feature')
  }
  return res.json() as Promise<ProductFeature>
}

export async function mergeProductFeatures(fromFeatureId: number, intoFeatureId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/leads/product-features/merge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from_feature_id: fromFeatureId, into_feature_id: intoFeatureId }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(typeof err?.detail === 'string' ? err.detail : 'Failed to merge features')
  }
}

export async function getLeadsForFeature(featureId: number): Promise<{ lead_ids: number[] }> {
  const res = await fetch(`${API_BASE}/api/leads/product-features/${featureId}/leads`)
  if (!res.ok) throw new Error('Failed to load leads for feature')
  const data = (await res.json()) as { lead_ids?: number[] }
  return { lead_ids: Array.isArray(data?.lead_ids) ? data.lead_ids : [] }
}

export interface FeatureSourceItem {
  occurrence_id: number
  lead_id?: number | null
  source_label?: string | null
  lead_name?: string | null
}

export async function getSourcesForFeature(featureId: number): Promise<{ sources: FeatureSourceItem[] }> {
  const res = await fetch(`${API_BASE}/api/leads/product-features/${featureId}/sources`)
  if (!res.ok) throw new Error('Failed to load sources for feature')
  const data = (await res.json()) as { sources?: FeatureSourceItem[] }
  return { sources: Array.isArray(data?.sources) ? data.sources : [] }
}

export async function addSourceToFeature(
  featureId: number,
  body: { lead_id?: number | null; source_label?: string | null }
): Promise<{ sources: FeatureSourceItem[] }> {
  const res = await fetch(`${API_BASE}/api/leads/product-features/${featureId}/sources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lead_id: body.lead_id ?? null, source_label: body.source_label ?? null }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(typeof err?.detail === 'string' ? err.detail : 'Failed to add source')
  }
  return res.json() as Promise<{ sources: FeatureSourceItem[] }>
}

export async function listFeatureOccurrences(leadId: number): Promise<{ occurrences: FeatureOccurrence[] }> {
  const res = await fetch(`${API_BASE}/api/leads/${leadId}/feature-occurrences`)
  if (!res.ok) throw new Error('Failed to load feature occurrences')
  const data = (await res.json()) as { occurrences?: unknown[] }
  return { occurrences: Array.isArray(data?.occurrences) ? data.occurrences as FeatureOccurrence[] : [] }
}

export async function addFeatureOccurrence(
  leadId: number,
  body: { feature_id?: number; canonical_name?: string; source_type?: 'review' | 'meeting' | 'manual' }
): Promise<FeatureOccurrence> {
  const res = await fetch(`${API_BASE}/api/leads/${leadId}/feature-occurrences`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      feature_id: body.feature_id ?? null,
      canonical_name: body.canonical_name ?? null,
      source_type: body.source_type ?? 'manual',
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(typeof err?.detail === 'string' ? err.detail : 'Failed to add feature occurrence')
  }
  return res.json() as Promise<FeatureOccurrence>
}

export interface MeetingWithExtracted {
  meeting: { id: number; lead_id: number; title?: string | null; transcript_or_summary: string; created_at?: string }
  extracted_features: { raw_phrase: string; canonical_name: string }[]
}

export async function listMeetings(leadId: number): Promise<{ meetings: { id: number; lead_id: number; title?: string | null; transcript_or_summary: string; created_at?: string }[] }> {
  const res = await fetch(`${API_BASE}/api/leads/${leadId}/meetings`)
  if (!res.ok) throw new Error('Failed to load meetings')
  const data = (await res.json()) as { meetings?: unknown[] }
  return { meetings: Array.isArray(data?.meetings) ? data.meetings as { id: number; lead_id: number; title?: string | null; transcript_or_summary: string; created_at?: string }[] : [] }
}

export async function createMeeting(
  leadId: number,
  body: { title?: string | null; transcript_or_summary: string }
): Promise<MeetingWithExtracted> {
  const res = await fetch(`${API_BASE}/api/leads/${leadId}/meetings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: body.title ?? null, transcript_or_summary: body.transcript_or_summary }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(typeof err?.detail === 'string' ? err.detail : 'Failed to add meeting')
  }
  return res.json() as Promise<MeetingWithExtracted>
}

export async function syncFeaturesFromReviews(leadIds: number[]): Promise<{ synced: number; occurrences_created: number }> {
  const res = await fetch(`${API_BASE}/api/leads/sync-features-from-reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lead_ids: leadIds }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(typeof err?.detail === 'string' ? err.detail : 'Sync failed')
  }
  return res.json() as Promise<{ synced: number; occurrences_created: number }>
}
