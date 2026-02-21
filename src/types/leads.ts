export interface ReviewWithFlags {
  text: string
  flagged_keywords: string[]
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
}

export interface SearchResponse {
  leads: HotLead[]
}
