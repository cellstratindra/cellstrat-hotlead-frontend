export interface ReviewWithFlags {
  text: string
  flagged_keywords: string[]
  rating?: number | null
  time?: number | null
  relative_time_description?: string | null
}

export interface HotLead {
  place_id: string
  name: string
  rating: number
  review_count: number
  phone: string
  reviews: ReviewWithFlags[]
  enrichment_summary?: string | null
  outreach_suggestion?: string | null
  top_complaints?: string[]
  top_strengths?: string[]
  recommendation_score?: number | null
  tier?: string | null
  estimated_budget_tier?: string | null
  reach_band?: string | null
  estimated_monthly_patients?: number | null
  reviews_summary?: string | null
  /** Competitor benchmark from search: rank in city/specialty market */
  rank_in_market?: number | null
  total_in_market?: number | null
  percentile_in_market?: number | null
  /** From recommendations API */
  reason_to_contact?: string | null
  suggested_action?: string | null
  contact_rank?: number | null
}

export interface SearchResponse {
  leads: HotLead[]
}

export interface ReviewInsightsResponse {
  negative_review_count: number
  total_shown: number
  complaints_about_doctors_count: number
  top_10_improvements: string[]
}

export interface ReviewSummaryResponse {
  reviews_summary: string
  negative_keywords?: string[]
  question_summary?: string | null
}

export type ReviewChatScope =
  | 'all'
  | 'top_20_negative'
  | 'top_50_negative'
  | 'top_20_positive'
  | 'top_50_positive'

export interface ReviewChatResponse {
  answer: string
  scope_used?: string | null
  review_count_used?: number | null
}

export interface MarketInsightsResponse {
  market_themes: string[]
  prioritized_place_ids: string[]
  market_pulse: string
}

/** CellAssist product feature backlog */
export interface ProductFeature {
  id: number
  canonical_name: string
  description?: string | null
  created_at?: string | null
  updated_at?: string | null
  occurrence_count?: number
}

export type FeatureSourceType = 'review' | 'meeting' | 'manual'

export interface FeatureOccurrence {
  id: number
  feature_id: number
  lead_id?: number | null
  source_type: string
  raw_phrase?: string | null
  meeting_id?: number | null
  source_label?: string | null
  created_at?: string | null
  feature_name?: string | null
}

/** Source for a feature in Product Backlog: either a saved lead (lead_id + lead_name) or manual name (source_label). */
export interface FeatureSource {
  occurrence_id: number
  lead_id?: number | null
  source_label?: string | null
  lead_name?: string | null
}

export interface Meeting {
  id: number
  lead_id: number
  title?: string | null
  transcript_or_summary: string
  created_at?: string | null
}
