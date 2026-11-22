-- Rate limits are shared across workers. The global cap also limits anonymous
-- clients that discard their cookies or supply forged proxy headers.
CREATE TABLE search_rate_limits (
  key text PRIMARY KEY,
  window_start timestamptz NOT NULL,
  requests integer NOT NULL
);
REVOKE ALL ON search_rate_limits FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION consume_search_limit(session_key text)
RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE global_count integer; session_count integer;
BEGIN
  PERFORM pg_advisory_xact_lock(734129);
  INSERT INTO search_rate_limits(key, window_start, requests)
  VALUES ('global', now(), 1), ('session:' || session_key, now(), 1)
  ON CONFLICT (key) DO UPDATE SET
    window_start = CASE WHEN search_rate_limits.window_start <= now() - interval '1 minute' THEN now() ELSE search_rate_limits.window_start END,
    requests = CASE WHEN search_rate_limits.window_start <= now() - interval '1 minute' THEN 1 ELSE search_rate_limits.requests + 1 END;
  SELECT requests INTO global_count FROM search_rate_limits WHERE key = 'global';
  SELECT requests INTO session_count FROM search_rate_limits WHERE key = 'session:' || session_key;
  DELETE FROM search_rate_limits WHERE key <> 'global' AND window_start < now() - interval '2 minutes';
  RETURN global_count <= 120 AND session_count <= 10;
END $$;
REVOKE ALL ON FUNCTION consume_search_limit(text) FROM PUBLIC, anon, authenticated;

-- Distinct articles, with a single representative chunk per article. Filters
-- apply before ranking and limiting, not after retrieval.
CREATE OR REPLACE FUNCTION hybrid_search_v2(
  query_embedding vector(1536), query_text text, match_count integer,
  filter_category_id uuid, filter_date_from timestamptz
) RETURNS TABLE (
  article_id uuid, chunk_text text, title text, article_slug text,
  author_name text, author_slug text, creator_id uuid, approved_at timestamptz,
  freshness_status text, similarity double precision, bm25_score real,
  hybrid_score numeric, rank bigint
) LANGUAGE sql STABLE AS $$
WITH eligible AS (
  SELECT a.id, a.title, a.slug, a.creator_id, a.approved_at, a.freshness_status,
    a.search_vector, cp.display_name, cp.slug AS author_slug
  FROM articles a JOIN creator_profiles cp ON cp.id = a.creator_id
  WHERE a.status = 'approved' AND a.licensing_status = 'active'
    AND a.freshness_status NOT IN ('outdated', 'withdrawn', 'superseded')
    AND (filter_category_id IS NULL OR a.category_id = filter_category_id)
    AND (filter_date_from IS NULL OR a.approved_at >= filter_date_from)
), best_chunks AS (
  SELECT DISTINCT ON (e.id) e.*, ae.chunk_text,
    1 - (ae.embedding <=> query_embedding) AS similarity
  FROM eligible e JOIN article_embeddings ae ON ae.article_id = e.id
  WHERE ae.embedding IS NOT NULL
  ORDER BY e.id, ae.embedding <=> query_embedding, ae.chunk_index
), ranked AS (
  SELECT *, row_number() OVER (ORDER BY similarity DESC, id) AS semantic_rank,
    ts_rank(search_vector, plainto_tsquery('english', query_text)) AS text_score
  FROM best_chunks
), keyword AS (
  SELECT id, row_number() OVER (ORDER BY text_score DESC, id) AS keyword_rank
  FROM ranked WHERE text_score > 0
), fused AS (
  SELECT r.*, (1.0 / (60 + r.semantic_rank) + COALESCE(1.0 / (60 + k.keyword_rank), 0)) AS score
  FROM ranked r LEFT JOIN keyword k ON k.id = r.id
  WHERE r.semantic_rank <= 20 OR k.keyword_rank <= 20
)
SELECT id, chunk_text, title, slug, display_name, author_slug, creator_id, approved_at,
  freshness_status, similarity, text_score, score,
  row_number() OVER (ORDER BY score DESC, id)
FROM fused ORDER BY score DESC, id LIMIT least(greatest(match_count, 1), 6)
$$;
REVOKE ALL ON FUNCTION hybrid_search_v2(vector, text, integer, uuid, timestamptz) FROM PUBLIC, anon, authenticated;
