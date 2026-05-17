import logging
import os
from typing import Optional

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from supabase import create_client, Client

load_dotenv()

logger = logging.getLogger(__name__)

router = APIRouter()

_supabase: Client = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_KEY"],
)


class ProfileCreate(BaseModel):
    company_name:         str
    industry:             str
    company_size:         str
    annual_revenue_range: str
    ai_maturity_stage:    str
    employee_count:       Optional[int]   = None
    current_tools:        list[str]       = []
    key_processes:        list[str]       = []
    data_availability:    Optional[str]   = None
    regulatory_context:   list[str]       = []
    pain_points:          list[str]       = []
    goals:                list[str]       = []
    budget_range_min:     Optional[float] = None
    budget_range_max:     Optional[float] = None
    budget_currency:      Optional[str]   = 'EUR'
    notes:                Optional[str]   = None


@router.post("/profiles", status_code=201)
def create_profile(body: ProfileCreate):
    """Insert a new test profile and return its UUID."""
    try:
        response = _supabase.table("test_profiles").insert(body.model_dump()).execute()
        profile_id = response.data[0]["id"]
        logger.info("Created profile %s (%s)", profile_id, body.company_name)
        return {"id": profile_id}
    except Exception as e:
        logger.error("Failed to create profile: %s", e)
        raise HTTPException(status_code=500, detail="Failed to create profile.")
