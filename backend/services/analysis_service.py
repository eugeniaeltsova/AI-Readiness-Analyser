import json
import logging
import os

from dotenv import load_dotenv
from openai import AzureOpenAI, APIError

from services.retrieval_service import fetch_structured_use_cases, fetch_semantic_chunks

load_dotenv()

logger = logging.getLogger(__name__)

_client = AzureOpenAI(
    api_key=os.environ["AZURE_OPENAI_API_KEY"],
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
    api_version=os.environ.get("AZURE_OPENAI_API_VERSION", "2024-10-21"),
)
_DEPLOYMENT = os.environ["AZURE_OPENAI_DEPLOYMENT"]

# ── prompts ───────────────────────────────────────────────────────────────────

STAGE_1_SYSTEM = """\
You are an expert AI strategy consultant specialising in enterprise AI readiness assessments.

Analyse the business profile provided and return a JSON object with exactly these keys:

{
  "key_processes": [
    "specific business process ripe for AI automation or augmentation"
  ],
  "data_assets": [
    "data the company likely holds based on their industry, tools, and operations"
  ],
  "ai_readiness_signals": {
    "positive": ["factor that supports AI adoption"],
    "negative": ["gap or barrier to AI adoption"]
  },
  "industry_context": "2-3 sentences on current AI adoption trends in their industry",
  "recommended_search_queries": [
    "targeted query for retrieving relevant AI case studies or benchmarks"
  ]
}

Rules:
- Return only valid JSON — no markdown fences, no text outside the JSON object.
- key_processes: 3-6 items, specific and actionable (not generic).
- data_assets: 4-8 items.
- ai_readiness_signals: 2-5 positives, 2-4 negatives.
- recommended_search_queries: exactly 3-5 queries, each specific enough to surface
  relevant case studies (e.g. "AI demand forecasting ROI retail grocery" not "AI retail").
- Base your analysis ONLY on the provided profile data. Do not use external knowledge about named companies.
"""

STAGE_1_USER_TEMPLATE = """\
Business Profile
────────────────
Company:          {company_name}
Industry:         {industry}
Size:             {company_size}{employee_count}
Revenue range:    {annual_revenue_range}
AI maturity:      {ai_maturity_stage}  (McKinsey scale: explore → experiment → expand → embed)
Current tools:    {current_tools}
Key processes:    {key_processes}
Data situation:   {data_availability}
Regulatory:       {regulatory_context}
Pain points:      {pain_points}
Goals:            {goals}
Budget range:     {budget_range}
Notes:            {notes}
"""

STAGE_2_SYSTEM = """\
You are a senior AI strategy consultant generating a board-ready AI readiness report.

You have access to:
1. A structured business profile analysis (Stage 1 output).
2. A curated library of AI use cases with cost and ROI data.
3. Supporting evidence excerpts from industry research documents.

Generate a comprehensive AI readiness report as a JSON object with exactly these keys:

{
  "readiness_score": {
    "overall": <integer 0–100>,
    "dimensions": {
      "data_readiness":           <integer 0–100>,
      "process_repeatability":    <integer 0–100>,
      "roi_potential":            <integer 0–100>,
      "technical_feasibility":    <integer 0–100>,
      "organizational_readiness": <integer 0–100>
    }
  },
  "executive_summary": "2–3 paragraph narrative summarising AI readiness and opportunity",
  "recommended_use_cases": [
    {
      "use_case_id": "<UUID from use_cases library, or null if no match>",
      "title": "string",
      "rationale": "why this use case fits this specific business",
      "estimated_cost_range": "e.g. '$80,000–$250,000'",
      "estimated_roi": "e.g. '165% over 18 months'",
      "implementation_complexity": "low | medium | high",
      "time_to_value_months": <integer>
    }
  ],
  "implementation_roadmap": [
    {
      "phase": <integer 1–3>,
      "title": "string",
      "duration": "e.g. 'Months 1–3'",
      "initiatives": ["specific initiative string"]
    }
  ],
  "key_risks": [
    {
      "risk": "string",
      "mitigation": "string"
    }
  ]
}

Rules:
- Return only valid JSON — no markdown fences, no text outside the JSON object.
- readiness_score.overall: weighted average of the five dimensions.
- recommended_use_cases: {max_use_cases} items maximum, fewer if fewer relevant use cases exist for this business.
- implementation_roadmap: exactly 3 phases, logically sequenced (foundation → scale → optimise).
- key_risks: exactly 3 risks, specific to this business (not generic AI risks).
- Be concrete and specific — reference the company's actual tools, processes, and constraints.
- recommended_use_cases: ONLY recommend use cases present in the MATCHED USE CASES 
  FROM LIBRARY section. Every item MUST have a real use_case_id from that list. 
  Never invent use cases or set use_case_id to null. If fewer matches exist than 
  the maximum, return a shorter list — a grounded recommendation is always better 
  than an invented one. If no matches exist at all, return an empty array and 
  explain the coverage gap in the executive_summary.
"""

STAGE_2_USER_TEMPLATE = """\
─── STAGE 1 ANALYSIS ───────────────────────────────────────────────────────────
{stage1_json}

─── MATCHED USE CASES FROM LIBRARY ────────────────────────────────────────────
{use_cases_text}

─── RESEARCH CONTEXT (RAG CHUNKS) ─────────────────────────────────────────────
{rag_chunks_text}

─── ORIGINAL BUSINESS PROFILE ─────────────────────────────────────────────────
{profile_summary}
"""


# ── formatting helpers ────────────────────────────────────────────────────────

def _fmt_list(value: list | None, fallback: str = "not specified") -> str:
    if not value:
        return fallback
    return ", ".join(str(v) for v in value)


def _fmt_use_cases(use_cases: list[dict]) -> str:
    if not use_cases:
        return "No matching use cases found in library."
    lines = []
    for i, uc in enumerate(use_cases, 1):
        lines.append(
            f"{i}. {uc['title']} (id: {uc['id']})\n"
            f"   Industry: {_fmt_list(uc.get('industry'))}\n"
            f"   Category: {uc.get('category')} | Complexity: {uc.get('implementation_complexity')}"
            f" | Time to value: {uc.get('time_to_value_months')} months\n"
            f"   Cost: ${uc.get('cost_range_min'):,.0f}–${uc.get('cost_range_max'):,.0f}"
            f" | ROI: {uc.get('roi_percent')}% over {uc.get('roi_timeframe_months')} months\n"
            + (f"   Cost source: {uc['cost_source']}\n" if uc.get('cost_source') else "")
            + (f"   ROI source: {uc['roi_source']}\n" if uc.get('roi_source') else "")
            + f"   Description: {uc.get('description', '')}\n"
            f"   Prerequisites: {_fmt_list(uc.get('prerequisites'))}"
        )
    return "\n\n".join(lines)


def _fmt_rag_chunks(chunks: list[dict]) -> str:
    if not chunks:
        return "No research context retrieved."
    lines = []
    for chunk in chunks:
        meta = chunk.get("metadata", {})
        heading = meta.get("section_heading") or "—"
        page = meta.get("page_number", "?")
        lines.append(
            f"[Section: {heading} | Page {page} | Similarity: {chunk.get('similarity', 0):.3f}]\n"
            f"{chunk['content']}"
        )
    return "\n\n".join(lines)


def _fmt_profile_summary(profile: dict) -> str:
    employee_count = (
        f" | {profile['employee_count']} employees" if profile.get("employee_count") else ""
    )
    budget = (
        f"${profile['budget_range_min']:,.0f}–${profile['budget_range_max']:,.0f}"
        if profile.get("budget_range_min") and profile.get("budget_range_max")
        else "not specified"
    )
    return (
        f"Company: {profile.get('company_name')} | Industry: {profile.get('industry')} | "
        f"Size: {profile.get('company_size')}{employee_count} | Revenue: {profile.get('annual_revenue_range')} | "
        f"AI maturity: {profile.get('ai_maturity_stage')} | Budget: {budget}"
    )


# ── LLM calls ─────────────────────────────────────────────────────────────────

def _call_llm(system: str, user: str, stage_label: str) -> dict:
    logger.info("Calling GPT-4o — %s", stage_label)
    try:
        response = _client.chat.completions.create(
            model=_DEPLOYMENT,
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": user},
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
        )
        raw = response.choices[0].message.content
        return json.loads(raw)
    except APIError as e:
        logger.error("%s LLM call failed: %s", stage_label, e)
        raise
    except json.JSONDecodeError as e:
        logger.error("%s — failed to parse JSON response: %s", stage_label, e)
        raise


def _run_stage_1(profile: dict) -> dict:
    employee_count = (
        f" | {profile['employee_count']} employees" if profile.get("employee_count") else ""
    )
    budget = (
        f"${profile['budget_range_min']:,.0f}–${profile['budget_range_max']:,.0f}"
        if profile.get("budget_range_min") and profile.get("budget_range_max")
        else "not specified"
    )
    user_msg = STAGE_1_USER_TEMPLATE.format(
        company_name=profile.get("company_name", "Unknown"),
        industry=profile.get("industry", "Unknown"),
        company_size=profile.get("company_size", "Unknown"),
        employee_count=employee_count,
        annual_revenue_range=profile.get("annual_revenue_range", "not specified"),
        ai_maturity_stage=profile.get("ai_maturity_stage", "explore"),
        current_tools=_fmt_list(profile.get("current_tools")),
        key_processes=_fmt_list(profile.get("key_processes")),
        data_availability=profile.get("data_availability") or "not specified",
        regulatory_context=_fmt_list(profile.get("regulatory_context")),
        pain_points=_fmt_list(profile.get("pain_points")),
        goals=_fmt_list(profile.get("goals")),
        budget_range=budget,
        notes=profile.get("notes") or "none",
    )
    return _call_llm(STAGE_1_SYSTEM, user_msg, "Stage 1 — Business Profiling")


def _run_stage_2(
    stage1: dict,
    profile: dict,
    use_cases: list[dict],
    rag_chunks: list[dict],
    max_use_cases: int = 5,
) -> dict:
    system = STAGE_2_SYSTEM.replace("{max_use_cases}", str(max_use_cases))
    user_msg = STAGE_2_USER_TEMPLATE.format(
        stage1_json=json.dumps(stage1, indent=2),
        use_cases_text=_fmt_use_cases(use_cases),
        rag_chunks_text=_fmt_rag_chunks(rag_chunks),
        profile_summary=_fmt_profile_summary(profile),
    )
    return _call_llm(system, user_msg, "Stage 2 — Gap Analysis & Report")


# ── validation ────────────────────────────────────────────────────────────────

def _validate_report(report: dict, valid_use_case_ids: set[str]) -> dict:
    """Strip any recommended use cases with null or invalid use_case_id."""
    before = len(report.get("recommended_use_cases", []))
    validated = [
        uc for uc in report.get("recommended_use_cases", [])
        if uc.get("use_case_id") in valid_use_case_ids
    ]
    report["recommended_use_cases"] = validated
    dropped = before - len(validated)
    if dropped:
        logger.warning("_validate_report: dropped %d use case(s) with null or unrecognised ID", dropped)
    return report


# ── public API ────────────────────────────────────────────────────────────────

def generate_report(profile: dict, max_use_cases: int = 5) -> dict:
    """Run the two-stage analysis and return a complete AI readiness report.

    Stage 1: GPT-4o profiles the business and generates targeted RAG queries.
    Retrieval: structured use cases + MMR-ranked semantic chunks per query.
    Stage 2: GPT-4o synthesises everything into a structured report.
    """
    company = profile.get("company_name", "unknown")
    industry = profile.get("industry", "")

    # Stage 1
    logger.info("[%s] Starting Stage 1 — business profiling", company)
    stage1 = _run_stage_1(profile)
    logger.info("[%s] Stage 1 complete — %d search queries generated",
                company, len(stage1.get("recommended_search_queries", [])))

    # Structured use case retrieval
    use_cases = fetch_structured_use_cases(industry)
    valid_ids = {uc["id"] for uc in use_cases}
    logger.info("[%s] Retrieved %d structured use cases", company, len(use_cases))

    # Semantic retrieval per query (deduplicated by chunk ID)
    seen_ids: set[str] = set()
    rag_chunks: list[dict] = []
    for query in stage1.get("recommended_search_queries", []):
        chunks = fetch_semantic_chunks(
            query=query,
            industry_tags=[industry] if industry else [],
            top_k=5,
        )
        for chunk in chunks:
            if chunk["id"] not in seen_ids:
                seen_ids.add(chunk["id"])
                rag_chunks.append(chunk)

    logger.info("[%s] Retrieved %d unique RAG chunks across %d queries",
                company, len(rag_chunks), len(stage1.get("recommended_search_queries", [])))
    logger.info(
        "[%s] RAG chunks used:\n%s",
        company,
        "\n".join([
            f"  [{c.get('metadata', {}).get('section_heading', '—')}] "
            f"(similarity={c.get('similarity', 0):.3f}) "
            f"{c['content'][:100]}..."
            for c in rag_chunks
        ])
    )

    rag_chunk_ids = [c['id'] for c in rag_chunks]

    # Stage 2
    logger.info("[%s] Starting Stage 2 — gap analysis and report generation", company)
    report = _run_stage_2(stage1, profile, use_cases, rag_chunks, max_use_cases)
    report['rag_chunk_ids'] = rag_chunk_ids
    report = _validate_report(report, valid_ids)
    logger.info("[%s] Report generation complete (readiness score: %s, use cases: %d)",
                company, report.get("readiness_score", {}).get("overall", "?"),
                len(report.get("recommended_use_cases", [])))

    return report
