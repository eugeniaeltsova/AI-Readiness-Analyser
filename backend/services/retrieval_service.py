import json
import logging
import os

import numpy as np

from dotenv import load_dotenv
from supabase import create_client, Client

from services.embedding_service import embed_text

load_dotenv()

logger = logging.getLogger(__name__)

_supabase: Client = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_KEY"],
)

_CANDIDATE_POOL = 20  # candidates fetched from pgvector before MMR


# ── cosine similarity ─────────────────────────────────────────────────────────

def _cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))


def _parse_embedding(raw: str | list) -> list[float]:
    """PostgREST may return VECTOR as a JSON string or a list."""
    if isinstance(raw, list):
        return raw
    return json.loads(raw)


# ── MMR ───────────────────────────────────────────────────────────────────────

def _mmr(
    candidates: list[dict],
    top_k: int,
    lambda_param: float,
) -> list[dict]:
    """Maximal Marginal Relevance re-ranking.

    score = λ * similarity(chunk, query)
          - (1 - λ) * max_similarity(chunk, already_selected)

    Balances relevance (similarity to query) with diversity (dissimilarity
    to already-selected chunks). λ = 1.0 reduces to pure similarity ranking.
    """
    if not candidates:
        return []

    selected: list[dict] = []
    remaining = list(candidates)

    while len(selected) < top_k and remaining:
        if not selected:
            best = max(remaining, key=lambda c: c["similarity"])
        else:
            # numpy arrays already pre-computed per candidate — no repeated conversion
            selected_vecs = [s["_np_embedding"] for s in selected]

            def mmr_score(c: dict) -> float:
                max_inter = max(_cosine_sim(c["_np_embedding"], v) for v in selected_vecs)
                return lambda_param * c["similarity"] - (1 - lambda_param) * max_inter

            best = max(remaining, key=mmr_score)

        selected.append(best)
        remaining.remove(best)

    # Strip internal fields before returning
    for chunk in selected:
        chunk.pop("_np_embedding", None)

    return selected


# ── public API ────────────────────────────────────────────────────────────────

def fetch_structured_use_cases(
    industry: str,
    category: str | None = None,
) -> list[dict]:
    """Return up to 10 use cases matching industry, ordered by roi_percent DESC.

    industry is matched against the TEXT[] column using the @> (contains)
    operator, so a use case tagged ['retail', 'finance'] is returned for either.
    """
    try:
        query = (
            _supabase.table("use_cases")
            .select("*")
            .filter("industry", "cs", f"{{{industry}}}")
            .order("roi_percent", desc=True)
            .limit(10)
        )
        if category:
            query = query.eq("category", category)

        response = query.execute()
        logger.debug(
            "fetch_structured_use_cases returned %d rows (industry=%s, category=%s)",
            len(response.data), industry, category,
        )
        return response.data
    except Exception as e:
        logger.error(
            "fetch_structured_use_cases failed (industry=%s, category=%s): %s",
            industry, category, e,
        )
        raise


def fetch_semantic_chunks(
    query: str,
    industry_tags: list[str],
    top_k: int = 5,
    lambda_param: float = 0.7,
) -> list[dict]:
    """Retrieve semantically similar RAG chunks with MMR re-ranking.

    Flow:
      1. Embed the query.
      2. pgvector cosine search filtered by industry_tags → up to 20 candidates.
         If the filtered search returns nothing, retry without industry_filter
         so retrieval never silently returns empty results.
      3. MMR re-ranking of the candidates → top_k results.

    Each returned dict contains: id, content, metadata, source_document_id,
    similarity. The internal embedding field is stripped before returning.
    """
    try:
        embedding = embed_text(query)

        def _fetch(filter_tags: list[str] | None) -> list[dict]:
            params: dict = {
                "query_embedding": embedding,
                "match_count": _CANDIDATE_POOL,
            }
            if filter_tags:
                params["industry_filter"] = filter_tags
            return _supabase.rpc("match_rag_documents", params).execute().data

        candidates = _fetch(industry_tags if industry_tags else None)

        if not candidates and industry_tags:
            logger.warning(
                "No chunks found with industry_filter=%s — falling back to unfiltered search",
                industry_tags,
            )
            candidates = _fetch(None)

        if not candidates:
            logger.warning("fetch_semantic_chunks: no candidates returned for query %r", query[:60])
            return []

        # Parse and convert to numpy once per candidate — reused across all MMR iterations
        for c in candidates:
            c["_np_embedding"] = np.array(_parse_embedding(c["embedding"]), dtype=np.float32)
            c.pop("embedding", None)

        results = _mmr(candidates, top_k=top_k, lambda_param=lambda_param)

        logger.debug(
            "fetch_semantic_chunks: %d candidates → %d selected (λ=%.2f, tags=%s)",
            len(candidates), len(results), lambda_param, industry_tags,
        )
        return results

    except Exception as e:
        logger.error(
            "fetch_semantic_chunks failed (query=%r, tags=%s): %s",
            query[:60], industry_tags, e,
        )
        raise
