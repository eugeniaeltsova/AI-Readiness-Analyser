import logging
import os
from uuid import UUID

from dotenv import load_dotenv
from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel
from supabase import create_client, Client

from services.analysis_service import generate_report

load_dotenv()

logger = logging.getLogger(__name__)

router = APIRouter()

_supabase: Client = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_KEY"],
)


class AnalyzeRequest(BaseModel):
    profile_id: UUID
    max_use_cases: int = 5


def _run_analysis(report_id: str, profile: dict, max_use_cases: int) -> None:
    """Background task: run generate_report() and persist the result."""
    try:
        report = generate_report(profile, max_use_cases=max_use_cases)

        _supabase.table("reports").update({
            "status":                "completed",
            "generated_at":          "now()",
            "readiness_score":       report.get("readiness_score", {}).get("overall"),
            "executive_summary":     report.get("executive_summary"),
            "recommended_use_cases": report.get("recommended_use_cases", []),
            "full_report":           report,
        }).eq("id", report_id).execute()

        logger.info("Report %s completed (score=%s)",
                    report_id, report.get("readiness_score", {}).get("overall"))

    except Exception as e:
        error_msg = str(e)
        logger.error("Report %s failed: %s", report_id, error_msg)

        _supabase.table("reports").update({
            "status":        "failed",
            "error_message": error_msg,
        }).eq("id", report_id).execute()


@router.post("/analyze", status_code=202)
def analyze(request: AnalyzeRequest, background_tasks: BackgroundTasks):
    """Kick off a two-stage AI readiness analysis.

    Returns report_id immediately (HTTP 202) so the frontend can start
    polling. The analysis runs in the background and updates the report
    row to 'completed' or 'failed' when done.
    """
    profile_id = str(request.profile_id)

    # Fetch profile — fail fast before queuing the background task
    profile_result = (
        _supabase.table("test_profiles")
        .select("*")
        .eq("id", profile_id)
        .limit(1)
        .execute()
    )
    if not profile_result.data:
        raise HTTPException(status_code=404, detail=f"Profile '{profile_id}' not found.")

    profile = profile_result.data[0]

    # Insert report row — frontend can poll this immediately
    report_row = (
        _supabase.table("reports")
        .insert({"profile_id": profile_id, "status": "processing"})
        .execute()
    )
    report_id = report_row.data[0]["id"]
    logger.info("Queued analysis for profile %s → report %s", profile_id, report_id)

    background_tasks.add_task(_run_analysis, report_id, profile, request.max_use_cases)

    return {"report_id": report_id, "status": "processing"}


@router.get("/reports/all")
def get_all_reports():
    """Return all completed reports joined with profile metadata, newest first."""
    result = (
        _supabase.table("reports")
        .select("id, profile_id, readiness_score, generated_at, full_report, "
                "test_profiles(company_name, industry, ai_maturity_stage)")
        .eq("status", "completed")
        .order("generated_at", desc=True)
        .execute()
    )
    rows = []
    for row in result.data:
        profile = row.pop("test_profiles", None) or {}
        rows.append({
            **row,
            "company_name":      profile.get("company_name"),
            "industry":          profile.get("industry"),
            "ai_maturity_stage": profile.get("ai_maturity_stage"),
        })
    return rows


@router.get("/reports/{profile_id}")
def get_reports(profile_id: UUID):
    """Return all reports for a profile, ordered by generated_at DESC."""
    result = (
        _supabase.table("reports")
        .select("*")
        .eq("profile_id", str(profile_id))
        .order("generated_at", desc=True)
        .execute()
    )
    return result.data
