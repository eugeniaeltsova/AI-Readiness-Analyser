-- RPC function called by retrieval_service.py via:
--   supabase.rpc('match_rag_documents', {...})
--
-- Returns chunks ordered by cosine similarity, optionally pre-filtered
-- by the industry_tags stored on the parent source_document.

CREATE OR REPLACE FUNCTION match_rag_documents(
    query_embedding  VECTOR(1536),
    match_count      INT    DEFAULT 5,
    industry_filter  TEXT[] DEFAULT NULL
)
RETURNS TABLE (
    id                 UUID,
    content            TEXT,
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
