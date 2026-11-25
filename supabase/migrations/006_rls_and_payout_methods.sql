-- ============================================================
-- 006: Complete Row-Level Security (RLS) & creator_payout_methods
-- Ensures all public tables have explicit RLS policies and no
-- PII, financial, payout, or audit columns leak to anon/public.
-- ============================================================

-- 1. Ensure Pro subscription columns exist on public.users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS pro_expires_at TIMESTAMPTZ;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.users FROM anon;

DROP POLICY IF EXISTS "Users see own user record" ON public.users;
CREATE POLICY "Users see own user record"
  ON public.users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- 2. Create creator_payout_methods table (matching Drizzle schema) + RLS
DO $$
BEGIN
  CREATE TYPE public.payout_method_type AS ENUM (
    'stripe_connect',
    'payoneer',
    'wise',
    'paypal',
    'bank_wire',
    'crypto'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.creator_payout_methods (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id          UUID NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
  method_type         public.payout_method_type NOT NULL,
  label               TEXT NOT NULL,
  account_identifier  TEXT NOT NULL,
  currency            TEXT NOT NULL DEFAULT 'USD',
  details_json        JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default          BOOLEAN NOT NULL DEFAULT FALSE,
  is_verified         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payout_methods_creator
  ON public.creator_payout_methods(creator_id);

ALTER TABLE public.creator_payout_methods ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.creator_payout_methods FROM anon;

DROP POLICY IF EXISTS "Creators manage own payout methods" ON public.creator_payout_methods;
CREATE POLICY "Creators manage own payout methods"
  ON public.creator_payout_methods FOR ALL
  TO authenticated
  USING (
    creator_id IN (
      SELECT id FROM public.creator_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    creator_id IN (
      SELECT id FROM public.creator_profiles WHERE user_id = auth.uid()
    )
  );

-- 3. Categories: public read-only for active categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public sees active categories" ON public.categories;
CREATE POLICY "Public sees active categories"
  ON public.categories FOR SELECT
  USING (is_active = TRUE);

-- 4. Article quality scores: creators can read scores for their own articles; anon denied
ALTER TABLE public.article_quality_scores ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.article_quality_scores FROM anon;

DROP POLICY IF EXISTS "Creators see own article quality scores" ON public.article_quality_scores;
CREATE POLICY "Creators see own article quality scores"
  ON public.article_quality_scores FOR SELECT
  TO authenticated
  USING (
    article_id IN (
      SELECT a.id
      FROM public.articles a
      JOIN public.creator_profiles cp ON cp.id = a.creator_id
      WHERE cp.user_id = auth.uid()
    )
  );

-- 5. Column-level protection on creator_profiles (protect financial & tax PII)
REVOKE SELECT (stripe_account_id, payment_email, tax_country, tax_id, suspension_reason)
  ON public.creator_profiles FROM anon, public;

-- 6. Default-deny RLS on internal, financial, search-log, and audit tables
-- (Server-side API routes use service_role / direct PG connection which bypasses RLS)
ALTER TABLE public.platform_revenue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_revenue FROM anon, authenticated;

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.audit_log FROM anon, authenticated;

ALTER TABLE public.search_queries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.search_queries FROM anon, authenticated;

ALTER TABLE public.article_usage_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.article_usage_events FROM anon, authenticated;

ALTER TABLE public.query_cache ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.query_cache FROM anon, authenticated;

ALTER TABLE public.search_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.search_rate_limits FROM anon, authenticated;
