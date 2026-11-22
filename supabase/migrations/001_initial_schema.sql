-- ============================================================
-- AISAS Platform - Initial Schema
-- ============================================================
-- This migration creates all core tables for the AISAS platform

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email       TEXT UNIQUE NOT NULL,
    role        TEXT NOT NULL DEFAULT 'creator'
                  CHECK (role IN ('creator', 'admin', 'superadmin')),
    is_active   BOOLEAN DEFAULT TRUE,
    last_sign_in TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE categories (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT UNIQUE NOT NULL,
    slug        TEXT UNIQUE NOT NULL,
    description TEXT,
    parent_id   UUID REFERENCES categories(id),
    icon        TEXT,
    sort_order  INTEGER DEFAULT 0,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial categories
INSERT INTO categories (name, slug) VALUES
  ('Technology', 'technology'),
  ('Personal Finance', 'personal-finance'),
  ('Health & Wellness', 'health-wellness'),
  ('Travel', 'travel'),
  ('Food & Cooking', 'food-cooking'),
  ('Business', 'business'),
  ('Science', 'science'),
  ('Education', 'education');

-- ============================================================
-- CREATOR PROFILES
-- ============================================================
CREATE TABLE creator_profiles (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    display_name            TEXT NOT NULL,
    slug                    TEXT UNIQUE NOT NULL,
    bio                     TEXT,
    country                 TEXT,
    website_url             TEXT,
    profile_image_url       TEXT,
    social_links            JSONB DEFAULT '{}',

    -- Expertise
    primary_categories      TEXT[] DEFAULT '{}',
    qualifications          TEXT,
    years_of_experience     INTEGER,

    -- Verification
    identity_verified       BOOLEAN DEFAULT FALSE,
    verification_method     TEXT,
    verified_at             TIMESTAMPTZ,

    -- Reputation (computed nightly)
    reputation_score        DECIMAL(5,2) DEFAULT 0.00,
    reputation_tier         TEXT DEFAULT 'new'
                              CHECK (reputation_tier IN (
                                'new', 'contributor', 'established', 'expert', 'suspended'
                              )),
    total_articles_approved INTEGER DEFAULT 0,
    total_query_contributions INTEGER DEFAULT 0,
    total_lifetime_earnings DECIMAL(10,4) DEFAULT 0,

    -- Payment
    stripe_account_id       TEXT,
    payment_email           TEXT,
    minimum_payout          DECIMAL(10,2) DEFAULT 50.00,
    tax_country             TEXT,
    tax_id                  TEXT,

    -- Account flags
    is_active               BOOLEAN DEFAULT TRUE,
    suspension_reason       TEXT,
    suspended_at            TIMESTAMPTZ,
    onboarding_completed    BOOLEAN DEFAULT FALSE,
    agreed_to_terms_at      TIMESTAMPTZ,

    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_creator_slug ON creator_profiles(slug);
CREATE INDEX idx_creator_reputation ON creator_profiles(reputation_score DESC);

-- ============================================================
-- LICENSING AGREEMENTS
-- ============================================================
CREATE TABLE licensing_agreements (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id          UUID NOT NULL REFERENCES creator_profiles(id),
    agreement_version   TEXT NOT NULL,
    agreed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    agreement_text_hash TEXT NOT NULL,
    ip_address          INET,
    user_agent          TEXT,
    is_current          BOOLEAN DEFAULT TRUE,
    revoked_at          TIMESTAMPTZ
);

-- ============================================================
-- ARTICLES
-- ============================================================
CREATE TABLE articles (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id              UUID NOT NULL REFERENCES creator_profiles(id),
    category_id             UUID REFERENCES categories(id),

    -- Content
    title                   TEXT NOT NULL,
    slug                    TEXT UNIQUE NOT NULL,
    content                 TEXT NOT NULL,
    content_format          TEXT DEFAULT 'markdown'
                              CHECK (content_format IN ('markdown', 'html', 'richtext')),
    excerpt                 TEXT,
    word_count              INTEGER,

    -- Metadata
    tags                    TEXT[] DEFAULT '{}',
    author_notes            TEXT,
    target_audience         TEXT,
    references_json         JSONB DEFAULT '[]',
    images_json             JSONB DEFAULT '[]',
    source_links            JSONB DEFAULT '[]',

    -- Dates
    original_created_at     TIMESTAMPTZ,
    submitted_at            TIMESTAMPTZ DEFAULT NOW(),
    approved_at             TIMESTAMPTZ,
    last_reviewed_at        TIMESTAMPTZ,
    expires_at              TIMESTAMPTZ,

    -- Status workflow
    status                  TEXT NOT NULL DEFAULT 'pending_review'
                              CHECK (status IN (
                                'draft',
                                'pending_review',
                                'under_ai_review',
                                'requires_revision',
                                'approved',
                                'rejected',
                                'suspended',
                                'archived',
                                'withdrawn'
                              )),
    rejection_reason        TEXT,
    revision_instructions   TEXT,
    reviewed_by             UUID REFERENCES users(id),

    -- Quality scores (summary)
    composite_quality_score DECIMAL(5,2),
    originality_score       DECIMAL(5,2),
    ai_probability_score    DECIMAL(5,2),

    -- Licensing
    licensing_status        TEXT DEFAULT 'pending'
                              CHECK (licensing_status IN (
                                'pending', 'active', 'expired', 'withdrawn'
                              )),
    license_type            TEXT DEFAULT 'exclusive_ai_search',
    licensing_agreement_id  UUID REFERENCES licensing_agreements(id),

    -- Versioning
    version_number          INTEGER DEFAULT 1,

    -- Freshness monitoring
    freshness_status        TEXT DEFAULT 'current'
                              CHECK (freshness_status IN (
                                'current', 'aging', 'outdated', 'flagged', 'superseded'
                              )),
    freshness_checked_at    TIMESTAMPTZ,
    freshness_notes         TEXT,

    -- Performance
    total_query_contributions   INTEGER DEFAULT 0,
    total_earnings_attributed   DECIMAL(10,4) DEFAULT 0,

    -- Full-text search
    search_vector           TSVECTOR,

    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Full-text search trigger
CREATE OR REPLACE FUNCTION articles_fts_update() RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.excerpt, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_articles_fts
BEFORE INSERT OR UPDATE OF title, tags, excerpt, content
ON articles FOR EACH ROW EXECUTE FUNCTION articles_fts_update();

-- Indexes
CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_articles_creator ON articles(creator_id);
CREATE INDEX idx_articles_category ON articles(category_id);
CREATE INDEX idx_articles_approved ON articles(approved_at DESC)
  WHERE status = 'approved';
CREATE INDEX idx_articles_fts ON articles USING GIN(search_vector);
CREATE INDEX idx_articles_tags ON articles USING GIN(tags);

-- ============================================================
-- ARTICLE VERSIONS
-- ============================================================
CREATE TABLE article_versions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id      UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    version_number  INTEGER NOT NULL,
    title           TEXT NOT NULL,
    content         TEXT NOT NULL,
    change_summary  TEXT,
    changed_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(article_id, version_number)
);

-- ============================================================
-- ARTICLE EMBEDDINGS (vector index)
-- ============================================================
CREATE TABLE article_embeddings (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id          UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    chunk_index         INTEGER NOT NULL,
    chunk_text          TEXT NOT NULL,
    chunk_heading       TEXT,
    is_intro_chunk      BOOLEAN DEFAULT FALSE,
    embedding           VECTOR(1536),
    embedding_model     TEXT DEFAULT 'text-embedding-3-small',
    embedding_version   INTEGER DEFAULT 1,
    token_count         INTEGER,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(article_id, chunk_index)
);

-- HNSW vector index
CREATE INDEX idx_embeddings_hnsw ON article_embeddings
  USING hnsw(embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ============================================================
-- ARTICLE QUALITY SCORES
-- ============================================================
CREATE TABLE article_quality_scores (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id              UUID UNIQUE NOT NULL REFERENCES articles(id) ON DELETE CASCADE,

    originality_score       DECIMAL(5,2),
    plagiarism_score        DECIMAL(5,2),
    plagiarism_report       JSONB,
    ai_probability_score    DECIMAL(5,2),
    ai_detection_report     JSONB,
    factual_accuracy_score  DECIMAL(5,2),
    usefulness_score        DECIMAL(5,2),
    depth_score             DECIMAL(5,2),
    clarity_score           DECIMAL(5,2),
    reference_quality_score DECIMAL(5,2),
    author_credibility_score DECIMAL(5,2),
    freshness_score         DECIMAL(5,2),

    composite_score         DECIMAL(5,2),

    llm_evaluation          JSONB,
    llm_model_used          TEXT,

    human_reviewed          BOOLEAN DEFAULT FALSE,
    reviewer_id             UUID REFERENCES users(id),
    reviewer_notes          TEXT,
    human_score_override    DECIMAL(5,2),
    reviewed_at             TIMESTAMPTZ,

    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SEARCH QUERIES
-- ============================================================
CREATE TABLE search_queries (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id          TEXT NOT NULL,
    user_id             UUID REFERENCES users(id),
    query_text          TEXT NOT NULL,
    query_embedding     VECTOR(1536),
    category_filter     UUID REFERENCES categories(id),
    date_filter_from    TIMESTAMPTZ,

    response_text       TEXT,
    response_tokens     INTEGER,
    prompt_tokens       INTEGER,
    latency_ms          INTEGER,
    model_used          TEXT,
    was_cached          BOOLEAN DEFAULT FALSE,

    articles_cited      UUID[] DEFAULT '{}',

    revenue_period      TEXT,
    ad_impression_count INTEGER DEFAULT 0,
    subscription_query  BOOLEAN DEFAULT FALSE,

    user_rating         SMALLINT CHECK (user_rating IN (1, -1)),
    has_follow_up       BOOLEAN DEFAULT FALSE,

    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_queries_session ON search_queries(session_id);
CREATE INDEX idx_queries_period ON search_queries(revenue_period);
CREATE INDEX idx_queries_created ON search_queries(created_at DESC);

-- ============================================================
-- ARTICLE USAGE EVENTS
-- ============================================================
CREATE TABLE article_usage_events (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    query_id            UUID NOT NULL REFERENCES search_queries(id),
    article_id          UUID NOT NULL REFERENCES articles(id),
    creator_id          UUID NOT NULL REFERENCES creator_profiles(id),

    retrieval_rank      INTEGER NOT NULL,
    cosine_similarity   DECIMAL(6,4),
    bm25_score          DECIMAL(10,4),
    hybrid_score        DECIMAL(6,4),

    contribution_score  DECIMAL(6,4) DEFAULT 0,
    contribution_weight DECIMAL(6,4) DEFAULT 0,
    was_primary_source  BOOLEAN DEFAULT FALSE,
    was_cited           BOOLEAN DEFAULT FALSE,
    chunks_used         INTEGER DEFAULT 0,

    revenue_period      TEXT,
    attributed_revenue  DECIMAL(10,6) DEFAULT 0,

    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_usage_article ON article_usage_events(article_id);
CREATE INDEX idx_usage_creator ON article_usage_events(creator_id);
CREATE INDEX idx_usage_period ON article_usage_events(revenue_period);
CREATE INDEX idx_usage_query ON article_usage_events(query_id);

-- ============================================================
-- PLATFORM REVENUE
-- ============================================================
CREATE TABLE platform_revenue (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    revenue_period          TEXT UNIQUE NOT NULL,

    ad_revenue              DECIMAL(12,4) DEFAULT 0,
    subscription_revenue    DECIMAL(12,4) DEFAULT 0,
    enterprise_revenue      DECIMAL(12,4) DEFAULT 0,
    other_revenue           DECIMAL(12,4) DEFAULT 0,
    gross_revenue           DECIMAL(12,4) DEFAULT 0,

    infrastructure_cost     DECIMAL(12,4) DEFAULT 0,
    ai_inference_cost       DECIMAL(12,4) DEFAULT 0,
    payment_processing_cost DECIMAL(12,4) DEFAULT 0,
    plagiarism_api_cost     DECIMAL(12,4) DEFAULT 0,
    other_costs             DECIMAL(12,4) DEFAULT 0,

    creator_pool            DECIMAL(12,4) DEFAULT 0,
    creator_pool_pct        DECIMAL(5,2) DEFAULT 60.00,

    status      TEXT DEFAULT 'open'
                  CHECK (status IN ('open', 'calculating', 'closed', 'audited')),
    closed_at   TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CREATOR EARNINGS
-- ============================================================
CREATE TABLE creator_earnings (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id                  UUID NOT NULL REFERENCES creator_profiles(id),
    revenue_period              TEXT NOT NULL,
    platform_revenue_id         UUID REFERENCES platform_revenue(id),

    total_query_contributions   INTEGER DEFAULT 0,
    total_contribution_weight   DECIMAL(10,6) DEFAULT 0,
    contribution_share_pct      DECIMAL(8,4),

    creator_gross_earnings      DECIMAL(12,4) DEFAULT 0,
    payment_processing_fee      DECIMAL(12,4) DEFAULT 0,
    tax_withholding             DECIMAL(12,4) DEFAULT 0,
    creator_net_earnings        DECIMAL(12,4) DEFAULT 0,

    status          TEXT DEFAULT 'calculating'
                      CHECK (status IN (
                        'calculating', 'confirmed', 'pending_payout',
                        'paid', 'disputed', 'on_hold', 'below_threshold'
                      )),
    confirmed_at    TIMESTAMPTZ,
    paid_at         TIMESTAMPTZ,
    stripe_payout_id TEXT,
    stripe_transfer_id TEXT,

    article_count               INTEGER,
    calculation_version         INTEGER DEFAULT 1,
    notes                       TEXT,

    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(creator_id, revenue_period)
);

-- ============================================================
-- AUDIT LOG
-- ============================================================
CREATE TABLE audit_log (
    id              BIGSERIAL PRIMARY KEY,
    actor_id        UUID REFERENCES users(id),
    actor_role      TEXT,
    action          TEXT NOT NULL,
    entity_type     TEXT NOT NULL,
    entity_id       UUID,
    before_state    JSONB,
    after_state     JSONB,
    metadata        JSONB,
    ip_address      INET,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);

-- ============================================================
-- QUERY CACHE
-- ============================================================
CREATE TABLE query_cache (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    query_hash          TEXT UNIQUE NOT NULL,
    query_embedding     VECTOR(1536),
    cached_response     TEXT NOT NULL,
    articles_cited      UUID[] DEFAULT '{}',
    model_used          TEXT,
    hit_count           INTEGER DEFAULT 1,
    expires_at          TIMESTAMPTZ NOT NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cache_hash ON query_cache(query_hash);
CREATE INDEX idx_cache_expires ON query_cache(expires_at);
CREATE INDEX idx_cache_embedding ON query_cache
  USING hnsw(query_embedding vector_cosine_ops);

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_embeddings ENABLE ROW LEVEL SECURITY;

-- Creators can only see their own articles
CREATE POLICY "Creators see own articles"
  ON articles FOR SELECT
  USING (creator_id = (
    SELECT id FROM creator_profiles WHERE user_id = auth.uid()
  ));

-- Public can see only approved article metadata (not full content)
CREATE POLICY "Public sees approved article metadata"
  ON articles FOR SELECT
  USING (status = 'approved');

-- Embeddings: internal service only (use service_role key)
CREATE POLICY "No public embedding access"
  ON article_embeddings FOR ALL
  USING (FALSE);

-- Creator profiles - users can see their own, admins can see all
CREATE POLICY "Users see own profile"
  ON creator_profiles FOR SELECT
  USING (user_id = auth.uid());

-- Creator earnings - users can see their own
CREATE POLICY "Users see own earnings"
  ON creator_earnings FOR SELECT
  USING (creator_id = (
    SELECT id FROM creator_profiles WHERE user_id = auth.uid()
  ));

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Generate slug from title
CREATE OR REPLACE FUNCTION generate_slug(title_text TEXT) RETURNS TEXT AS $$
DECLARE
    slug_base TEXT;
    slug_final TEXT;
    counter INTEGER := 0;
BEGIN
    slug_base := lower(regexp_replace(title_text, '[^a-zA-Z0-9]+', '-', 'g'));
    slug_base := trim(both '-' from slug_base);
    slug_final := slug_base;
    
    WHILE EXISTS (SELECT 1 FROM articles WHERE slug = slug_final) LOOP
        counter := counter + 1;
        slug_final := slug_base || '-' || counter;
    END LOOP;
    
    RETURN slug_final;
END;
$$ LANGUAGE plpgsql;

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_creator_profiles_updated_at BEFORE UPDATE ON creator_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_articles_updated_at BEFORE UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_article_quality_scores_updated_at BEFORE UPDATE ON article_quality_scores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_revenue_updated_at BEFORE UPDATE ON platform_revenue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_creator_earnings_updated_at BEFORE UPDATE ON creator_earnings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();