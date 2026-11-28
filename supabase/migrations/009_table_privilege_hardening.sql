-- ============================================================
-- 009: Enforce Column-Level SELECT Protections on Public Tables
-- PostgreSQL ignores column-level REVOKE SELECT(...) when table-wide
-- GRANT SELECT already exists for anon/authenticated.
-- Revoke table-wide SELECT first, then grant ONLY non-sensitive columns.
-- ============================================================

REVOKE ALL ON public.articles FROM PUBLIC, anon, authenticated;
GRANT SELECT (
  id,
  creator_id,
  category_id,
  title,
  slug,
  content_format,
  excerpt,
  word_count,
  tags,
  target_audience,
  references_json,
  images_json,
  source_links,
  original_created_at,
  submitted_at,
  approved_at,
  last_reviewed_at,
  expires_at,
  status,
  composite_quality_score,
  originality_score,
  ai_probability_score,
  licensing_status,
  license_type,
  version_number,
  freshness_status,
  freshness_checked_at,
  freshness_notes,
  total_query_contributions,
  created_at,
  updated_at,
  withdrawal_effective_at
) ON public.articles TO anon, authenticated;

REVOKE ALL ON public.creator_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT (
  id,
  user_id,
  display_name,
  slug,
  bio,
  country,
  website_url,
  profile_image_url,
  social_links,
  primary_categories,
  qualifications,
  years_of_experience,
  identity_verified,
  reputation_score,
  reputation_tier,
  total_articles_approved,
  total_query_contributions,
  is_active,
  onboarding_completed,
  agreed_to_terms_at,
  created_at,
  updated_at
) ON public.creator_profiles TO anon, authenticated;
