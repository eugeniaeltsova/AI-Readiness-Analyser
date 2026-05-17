-- Replaces match_rag_documents (migration_002) to also return the embedding
-- vector. retrieval_service.py uses these vectors for MMR re-ranking without
-- making additional embedding API calls.
--
-- Run this after migration_002_match_function.sql.
DROP FUNCTION IF EXISTS match_rag_documents(vector, integer, text[]);

CREATE OR REPLACE FUNCTION match_rag_documents(
    query_embedding  VECTOR(1536),
    match_count      INT    DEFAULT 20,
    industry_filter  TEXT[] DEFAULT NULL
)
RETURNS TABLE (
    id                 UUID,
    content            TEXT,
    embedding          VECTOR(1536),
    metadata           JSONB,
    source_document_id UUID,
    similarity         FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.id,
        r.content,
        r.embedding,
        r.metadata,
        r.source_document_id,
        1 - (r.embedding <=> query_embedding) AS similarity
    FROM rag_documents r
    LEFT JOIN source_documents s ON s.id = r.source_document_id
    WHERE
        industry_filter IS NULL
        OR s.industry_tags && industry_filter
    ORDER BY r.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
