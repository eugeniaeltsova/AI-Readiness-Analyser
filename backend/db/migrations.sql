-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── use_cases ────────────────────────────────────────────────────────────────
-- Manually curated library — populated via seed.sql, not extracted automatically.

CREATE TABLE IF NOT EXISTS use_cases (
    id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title                     TEXT     NOT NULL,
    description               TEXT     NOT NULL,
    industry                  TEXT[]   NOT NULL DEFAULT '{}',
    category                  TEXT     NOT NULL,
    implementation_complexity TEXT     NOT NULL
                              CHECK (implementation_complexity IN ('low', 'medium', 'high')),
    time_to_value_months      INT      NOT NULL,
    cost_range_min            NUMERIC(12, 2) NOT NULL,
    cost_range_max            NUMERIC(12, 2) NOT NULL,
    roi_percent               NUMERIC(7,  2) NOT NULL,
    roi_timeframe_months      INT      NOT NULL,
    prerequisites             TEXT[]   NOT NULL DEFAULT '{}',
    tags                      TEXT[]   NOT NULL DEFAULT '{}',
    created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT cost_range_valid CHECK (cost_range_max >= cost_range_min)
);

-- ─── source_documents ─────────────────────────────────────────────────────────
-- Populated automatically by ingest.py when a file is uploaded and chunked.
-- file_hash enables duplicate detection; industry_tags enable RAG pre-filtering.

CREATE TABLE IF NOT EXISTS source_documents (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           TEXT        NOT NULL,
    filename        TEXT        NOT NULL,
    storage_url     TEXT,
    source_url      TEXT,
    file_type       TEXT        NOT NULL,
    file_size_bytes BIGINT,
    file_hash       TEXT        UNIQUE,
    page_count      INT,
    industry_tags   TEXT[]      NOT NULL DEFAULT '{}',
    metadata        JSONB       NOT NULL DEFAULT '{}',
    uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── rag_documents ────────────────────────────────────────────────────────────
-- Document chunks with pgvector embeddings (text-embedding-3-small, 1536 dims).

CREATE TABLE IF NOT EXISTS rag_documents (
    id                 UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    content            TEXT         NOT NULL,
    embedding          VECTOR(1536) NOT NULL,
    metadata           JSONB        NOT NULL DEFAULT '{}',
    source_document_id UUID         REFERENCES source_documents(id) ON DELETE SET NULL,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rag_documents_embedding_hnsw
    ON rag_documents
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS rag_documents_source_document_id_idx
    ON rag_documents (source_document_id);

-- ─── test_profiles ────────────────────────────────────────────────────────────
-- ai_maturity_stage follows McKinsey's four-stage AI adoption model.

CREATE TABLE IF NOT EXISTS test_profiles (
    id                   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name         TEXT        NOT NULL,
    industry             TEXT        NOT NULL,
    company_size         TEXT        NOT NULL
                         CHECK (company_size IN ('sme', 'mid_market', 'enterprise')),
    employee_count       INT,
    annual_revenue_range TEXT        NOT NULL,
    ai_maturity_stage    TEXT        NOT NULL
                         CHECK (ai_maturity_stage IN ('explore', 'experiment', 'expand', 'embed')),
    current_tools        TEXT[]      NOT NULL DEFAULT '{}',
    key_processes        TEXT[]      NOT NULL DEFAULT '{}',
    data_availability    TEXT,
    regulatory_context   TEXT[]      NOT NULL DEFAULT '{}',
    pain_points          TEXT[]      NOT NULL DEFAULT '{}',
    goals                TEXT[]      NOT NULL DEFAULT '{}',
    budget_range_min     NUMERIC(12, 2),
    budget_range_max     NUMERIC(12, 2),
    notes                TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT budget_range_valid CHECK (
        budget_range_max IS NULL OR budget_range_max >= budget_range_min
    )
);

-- ─── reports ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reports (
    id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id            UUID        NOT NULL REFERENCES test_profiles(id) ON DELETE CASCADE,
    status                TEXT        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message         TEXT,
    readiness_score       NUMERIC(5, 2)
                          CHECK (readiness_score BETWEEN 0 AND 100),
    executive_summary     TEXT,
    recommended_use_cases JSONB       NOT NULL DEFAULT '[]',
    full_report           JSONB       NOT NULL DEFAULT '{}',
    generated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reports_profile_id_idx ON reports (profile_id);
CREATE INDEX IF NOT EXISTS reports_status_idx     ON reports (status);
