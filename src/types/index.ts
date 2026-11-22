export type UserRole = 'creator' | 'admin' | 'superadmin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  last_sign_in: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface CreatorProfile {
  id: string;
  user_id: string;
  display_name: string;
  slug: string;
  bio: string | null;
  country: string | null;
  website_url: string | null;
  profile_image_url: string | null;
  social_links: Record<string, string>;
  primary_categories: string[];
  qualifications: string | null;
  years_of_experience: number | null;
  identity_verified: boolean;
  verification_method: string | null;
  verified_at: string | null;
  reputation_score: number;
  reputation_tier: 'new' | 'contributor' | 'established' | 'expert' | 'suspended';
  total_articles_approved: number;
  total_query_contributions: number;
  total_lifetime_earnings: number;
  stripe_account_id: string | null;
  payment_email: string | null;
  minimum_payout: number;
  tax_country: string | null;
  tax_id: string | null;
  is_active: boolean;
  suspension_reason: string | null;
  suspended_at: string | null;
  onboarding_completed: boolean;
  agreed_to_terms_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ArticleStatus = 
  | 'draft'
  | 'pending_review'
  | 'under_ai_review'
  | 'requires_revision'
  | 'approved'
  | 'rejected'
  | 'suspended'
  | 'archived'
  | 'withdrawn';

export type ArticleLicenseStatus = 'pending' | 'active' | 'expired' | 'withdrawn';
export type FreshnessStatus = 'current' | 'aging' | 'outdated' | 'flagged' | 'superseded';

export interface Article {
  id: string;
  creator_id: string;
  category_id: string | null;
  title: string;
  slug: string;
  content: string;
  content_format: 'markdown' | 'html' | 'richtext';
  excerpt: string | null;
  word_count: number | null;
  tags: string[];
  author_notes: string | null;
  target_audience: string | null;
  references_json: ArticleReference[];
  images_json: ArticleImage[];
  source_links: ArticleSourceLink[];
  original_created_at: string | null;
  submitted_at: string;
  approved_at: string | null;
  last_reviewed_at: string | null;
  expires_at: string | null;
  status: ArticleStatus;
  rejection_reason: string | null;
  revision_instructions: string | null;
  reviewed_by: string | null;
  composite_quality_score: number | null;
  originality_score: number | null;
  ai_probability_score: number | null;
  licensing_status: ArticleLicenseStatus;
  license_type: string;
  licensing_agreement_id: string | null;
  version_number: number;
  freshness_status: FreshnessStatus;
  freshness_checked_at: string | null;
  freshness_notes: string | null;
  total_query_contributions: number;
  total_earnings_attributed: number;
  search_vector: unknown; // tsvector
  created_at: string;
  updated_at: string;
}

export interface ArticleReference {
  title: string;
  url: string;
  publisher: string;
  accessed_date: string;
  is_primary: boolean;
}

export interface ArticleImage {
  storage_key: string;
  caption: string;
  rights_cleared: boolean;
  source_url: string | null;
}

export interface ArticleSourceLink {
  title: string;
  url: string;
}

export interface ArticleVersion {
  id: string;
  article_id: string;
  version_number: number;
  title: string;
  content: string;
  change_summary: string | null;
  changed_by: string | null;
  created_at: string;
}

export interface ArticleEmbedding {
  id: string;
  article_id: string;
  chunk_index: number;
  chunk_text: string;
  chunk_heading: string | null;
  is_intro_chunk: boolean;
  embedding: number[];
  embedding_model: string;
  embedding_version: number;
  token_count: number | null;
  created_at: string;
}

export interface ArticleQualityScores {
  id: string;
  article_id: string;
  originality_score: number | null;
  plagiarism_score: number | null;
  plagiarism_report: Record<string, unknown> | null;
  ai_probability_score: number | null;
  ai_detection_report: Record<string, unknown> | null;
  factual_accuracy_score: number | null;
  usefulness_score: number | null;
  depth_score: number | null;
  clarity_score: number | null;
  reference_quality_score: number | null;
  author_credibility_score: number | null;
  freshness_score: number | null;
  composite_score: number | null;
  llm_evaluation: Record<string, unknown> | null;
  llm_model_used: string | null;
  human_reviewed: boolean;
  reviewer_id: string | null;
  reviewer_notes: string | null;
  human_score_override: number | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SearchQuery {
  id: string;
  session_id: string;
  user_id: string | null;
  query_text: string;
  query_embedding: number[] | null;
  category_filter: string | null;
  date_filter_from: string | null;
  response_text: string | null;
  response_tokens: number | null;
  prompt_tokens: number | null;
  latency_ms: number | null;
  model_used: string | null;
  was_cached: boolean;
  articles_cited: string[];
  revenue_period: string | null;
  ad_impression_count: number;
  subscription_query: boolean;
  user_rating: 1 | -1 | null;
  has_follow_up: boolean;
  created_at: string;
}

export interface ArticleUsageEvent {
  id: string;
  query_id: string;
  article_id: string;
  creator_id: string;
  retrieval_rank: number;
  cosine_similarity: number;
  bm25_score: number;
  hybrid_score: number;
  contribution_score: number;
  contribution_weight: number;
  was_primary_source: boolean;
  was_cited: boolean;
  chunks_used: number;
  revenue_period: string | null;
  attributed_revenue: number;
  created_at: string;
}

export interface PlatformRevenue {
  id: string;
  revenue_period: string;
  ad_revenue: number;
  subscription_revenue: number;
  enterprise_revenue: number;
  other_revenue: number;
  gross_revenue: number;
  infrastructure_cost: number;
  ai_inference_cost: number;
  payment_processing_cost: number;
  plagiarism_api_cost: number;
  other_costs: number;
  creator_pool: number;
  creator_pool_pct: number;
  status: 'open' | 'calculating' | 'closed' | 'audited';
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatorEarnings {
  id: string;
  creator_id: string;
  revenue_period: string;
  platform_revenue_id: string | null;
  total_query_contributions: number;
  total_contribution_weight: number;
  contribution_share_pct: number | null;
  creator_gross_earnings: number;
  payment_processing_fee: number;
  tax_withholding: number;
  creator_net_earnings: number;
  status: 'calculating' | 'confirmed' | 'pending_payout' | 'paid' | 'disputed' | 'on_hold' | 'below_threshold';
  confirmed_at: string | null;
  paid_at: string | null;
  stripe_payout_id: string | null;
  stripe_transfer_id: string | null;
  article_count: number | null;
  calculation_version: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: number;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface QueryCache {
  id: string;
  query_hash: string;
  query_embedding: number[];
  cached_response: string;
  articles_cited: string[];
  model_used: string;
  hit_count: number;
  expires_at: string;
  created_at: string;
}

// API Request/Response Types
export interface SubmitArticleRequest {
  title: string;
  content: string;
  content_format: 'markdown' | 'html' | 'richtext';
  excerpt?: string;
  category_id: string;
  tags?: string[];
  author_notes?: string;
  target_audience?: string;
  references?: ArticleReference[];
  images?: Omit<ArticleImage, 'storage_key'>[];
  source_links?: ArticleSourceLink[];
  original_created_at?: string;
}

export interface SearchRequest {
  query: string;
  category_id?: string;
  date_from?: string;
  session_id: string;
}

export interface SearchResponse {
  answer: string;
  citations: Citation[];
  articles_used: ArticleCitation[];
  latency_ms: number;
  was_cached: boolean;
  query_id: string;
}

export interface Citation {
  article_id: string;
  article_title: string;
  author_name: string;
  approved_at: string;
  freshness_status: FreshnessStatus;
  excerpt: string;
}

export interface ArticleCitation {
  article_id: string;
  title: string;
  author_slug: string;
  author_name: string;
  approved_at: string;
  freshness_status: FreshnessStatus;
}

export interface LicensingAgreement {
  id: string;
  creator_id: string;
  agreement_version: string;
  agreed_at: string;
  agreement_text_hash: string;
  ip_address: string | null;
  user_agent: string | null;
  is_current: boolean;
  revoked_at: string | null;
}