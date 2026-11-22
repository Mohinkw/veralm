-- ============================================================
-- Hybrid Search RPC Function
-- ============================================================
-- This function performs hybrid search (vector + keyword) with RRF fusion

CREATE OR REPLACE FUNCTION hybrid_search(
    query_embedding vector(1536),
    query_text text,
    match_count int DEFAULT 6
)
RETURNS TABLE (
    article_id uuid,
    chunk_text text,
    chunk_index int,
    title text,
    author_name text,
    author_slug text,
    creator_id uuid,
    approved_at timestamptz,
    freshness_status text,
    composite_quality_score numeric,
    similarity numeric,
    bm25_score numeric,
    hybrid_score numeric,
    rank int
) AS $$
DECLARE
    semantic_results RECORD;
    keyword_results RECORD;
BEGIN
    -- Step 1: Semantic search (vector similarity)
    CREATE TEMP TABLE temp_semantic ON COMMIT DROP AS
    SELECT
        ae.article_id,
        ae.chunk_text,
        ae.chunk_index,
        a.title,
        cp.display_name as author_name,
        cp.slug as author_slug,
        a.creator_id,
        a.approved_at,
        a.freshness_status,
        a.composite_quality_score,
        1 - (ae.embedding <=> query_embedding) AS similarity,
        ROW_NUMBER() OVER (ORDER BY ae.embedding <=> query_embedding) AS rank
    FROM article_embeddings ae
    JOIN articles a ON ae.article_id = a.id
    JOIN creator_profiles cp ON a.creator_id = cp.id
    WHERE a.status = 'approved'
      AND a.licensing_status = 'active'
      AND a.freshness_status NOT IN ('outdated', 'withdrawn', 'superseded')
    ORDER BY ae.embedding <=> query_embedding
    LIMIT 20;

    -- Step 2: Keyword search (full-text search)
    CREATE TEMP TABLE temp_keyword ON COMMIT DROP AS
    SELECT
        ae.article_id,
        ae.chunk_text,
        ae.chunk_index,
        a.title,
        cp.display_name as author_name,
        cp.slug as author_slug,
        a.creator_id,
        a.approved_at,
        a.freshness_status,
        a.composite_quality_score,
        ts_rank(a.search_vector, plainto_tsquery('english', query_text)) AS bm25_score,
        ROW_NUMBER() OVER (
            ORDER BY ts_rank(a.search_vector, plainto_tsquery('english', query_text)) DESC
        ) AS rank
    FROM articles a
    JOIN article_embeddings ae ON ae.article_id = a.id AND ae.chunk_index = 0
    JOIN creator_profiles cp ON a.creator_id = cp.id
    WHERE a.status = 'approved'
      AND a.licensing_status = 'active'
      AND a.freshness_status NOT IN ('outdated', 'withdrawn', 'superseded')
      AND a.search_vector @@ plainto_tsquery('english', query_text)
    LIMIT 20;

    -- Step 3: Reciprocal Rank Fusion (RRF) merge
    RETURN QUERY
    SELECT
        COALESCE(s.article_id, k.article_id) AS article_id,
        COALESCE(s.chunk_text, k.chunk_text) AS chunk_text,
        COALESCE(s.chunk_index, k.chunk_index) AS chunk_index,
        COALESCE(s.title, k.title) AS title,
        COALESCE(s.author_name, k.author_name) AS author_name,
        COALESCE(s.author_slug, k.author_slug) AS author_slug,
        COALESCE(s.creator_id, k.creator_id) AS creator_id,
        COALESCE(s.approved_at, k.approved_at) AS approved_at,
        COALESCE(s.freshness_status, k.freshness_status) AS freshness_status,
        COALESCE(s.composite_quality_score, k.composite_quality_score) AS composite_quality_score,
        COALESCE(s.similarity, 0) AS similarity,
        COALESCE(k.bm25_score, 0) AS bm25_score,
        (1.0 / (60 + COALESCE(s.rank, 999)) + 1.0 / (60 + COALESCE(k.rank, 999))) AS hybrid_score,
        ROW_NUMBER() OVER (
            ORDER BY (1.0 / (60 + COALESCE(s.rank, 999)) + 1.0 / (60 + COALESCE(k.rank, 999))) DESC
        ) AS rank
    FROM temp_semantic s
    FULL OUTER JOIN temp_keyword k ON s.article_id = k.article_id
    ORDER BY hybrid_score DESC
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;