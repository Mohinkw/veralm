-- Migration 011: API Key Security, Tiered Quotas, 30-Day Inactivity & Unlimited Wallet Top-Ups
-- Follows VeraLM AGENTS.md RLS & Least-Privilege Guardrails

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS api_credit_balance_cents INTEGER NOT NULL DEFAULT 0 CHECK (api_credit_balance_cents >= 0);

ALTER TABLE public.api_keys
  ADD COLUMN IF NOT EXISTS scopes TEXT[] NOT NULL DEFAULT ARRAY['ground:read', 'chat:write', 'mcp:read'],
  ADD COLUMN IF NOT EXISTS allowed_ips TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_used_ip INET,
  ADD COLUMN IF NOT EXISTS disabled_reason TEXT,
  ADD COLUMN IF NOT EXISTS quota_reset_at TIMESTAMPTZ NOT NULL DEFAULT (date_trunc('month', NOW()) + INTERVAL '1 month'),
  ADD COLUMN IF NOT EXISTS hourly_window_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('hour', NOW()),
  ADD COLUMN IF NOT EXISTS hourly_requests_used INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.api_keys
  ALTER COLUMN monthly_quota SET DEFAULT 500;

CREATE TABLE IF NOT EXISTS public.api_credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  balance_after_cents INTEGER NOT NULL,
  tx_type TEXT NOT NULL CHECK (tx_type IN ('topup', 'api_usage', 'refund')),
  description TEXT,
  stripe_session_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_credit_tx_user_created
  ON public.api_credit_transactions(user_id, created_at DESC);

-- Mandatory Row-Level Security (AGENTS.md)
ALTER TABLE public.api_credit_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own credit transactions" ON public.api_credit_transactions;
CREATE POLICY "Users can view own credit transactions"
  ON public.api_credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

REVOKE ALL ON public.api_credit_transactions FROM anon, public;
GRANT SELECT ON public.api_credit_transactions TO authenticated;
