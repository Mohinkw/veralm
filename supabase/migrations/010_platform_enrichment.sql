-- ============================================================
-- 010: Platform Enrichment Schema (Conversations, Share Links,
--      Developer API Keys, and Creator Verification Badges)
-- Enforces mandatory RLS on every new public table.
-- ============================================================

-- 1. Server-synced Chat Conversations
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  category_slug TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_updated
  ON public.conversations(user_id, updated_at DESC);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.conversations FROM anon;
DROP POLICY IF EXISTS "Users manage own conversations" ON public.conversations;
CREATE POLICY "Users manage own conversations"
  ON public.conversations
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  response_json JSONB,
  feedback INTEGER CHECK (feedback IN (-1, 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conv_messages_conv_created
  ON public.conversation_messages(conversation_id, created_at ASC);

ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.conversation_messages FROM anon;
DROP POLICY IF EXISTS "Users manage own conversation messages" ON public.conversation_messages;
CREATE POLICY "Users manage own conversation messages"
  ON public.conversation_messages
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 2. Public Shareable Verified Answer Links
CREATE TABLE IF NOT EXISTS public.shared_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  query_text TEXT NOT NULL,
  answer_text TEXT NOT NULL,
  citations_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  articles_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  views_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shared_answers_slug ON public.shared_answers(slug);

ALTER TABLE public.shared_answers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shared_answers FROM anon, authenticated;
GRANT SELECT ON public.shared_answers TO anon, authenticated;
DROP POLICY IF EXISTS "Public reads shared answers" ON public.shared_answers;
CREATE POLICY "Public reads shared answers"
  ON public.shared_answers
  FOR SELECT
  TO public
  USING (true);

-- 3. Developer Grounding API & MCP Server Keys
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT UNIQUE NOT NULL,
  tier TEXT NOT NULL DEFAULT 'free',
  monthly_quota INTEGER NOT NULL DEFAULT 1000,
  requests_used INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON public.api_keys(key_hash);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.api_keys FROM anon, authenticated;

-- 4. Creator Authority Credentials
ALTER TABLE public.creator_profiles
  ADD COLUMN IF NOT EXISTS verified_domain TEXT,
  ADD COLUMN IF NOT EXISTS verification_badges JSONB NOT NULL DEFAULT '{}'::jsonb;

GRANT SELECT (verified_domain, verification_badges)
  ON public.creator_profiles TO anon, authenticated;

-- 5. Query Cache RLS check (ensure RLS enabled & locked to server)
ALTER TABLE public.query_cache ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.query_cache FROM anon, authenticated;
