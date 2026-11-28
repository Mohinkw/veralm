-- ============================================================
-- 008: Security Hardening & Missing Schema Columns
-- IMPORTANT: Review and approve before applying to production DB.
-- 1) Revokes PostgREST SELECT on gated article bodies & creator PII
--    so anon/public roles cannot dump full articles or tax/payout PII.
-- 2) Adds missing users.stripe_customer_id column expected by webhooks.
-- ============================================================

-- 1. Protect gated articles & internal moderation columns from direct PostgREST dumps
REVOKE SELECT (
  content,
  author_notes,
  rejection_reason,
  revision_instructions,
  reviewed_by
) ON public.articles FROM anon, authenticated;

-- 2. Re-enforce column-level PII protection on creator_profiles
REVOKE SELECT (
  stripe_account_id,
  payment_email,
  tax_country,
  tax_id,
  suspension_reason
) ON public.creator_profiles FROM anon, public, authenticated;

-- 3. Add missing stripe_customer_id column on public.users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- 4. Ensure RLS & non-null constraints on article_ratings
ALTER TABLE public.article_ratings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.article_ratings FROM anon, authenticated;
