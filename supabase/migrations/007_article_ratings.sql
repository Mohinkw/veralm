-- ============================================================
-- 007: User Article Ratings (1 - 10 scale) with mandatory RLS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.article_ratings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id  UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  rater_key   TEXT NOT NULL,
  user_id     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  rating      INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 10),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT article_ratings_unique UNIQUE (article_id, rater_key)
);

CREATE INDEX IF NOT EXISTS idx_article_ratings_article
  ON public.article_ratings(article_id);

ALTER TABLE public.article_ratings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.article_ratings FROM anon, authenticated;
