import uuid
from datetime import datetime, timezone
from fastapi import APIRouter
from schemas.analysis import (
    AnalyzeRequestPayload,
    AnalyzeResponsePayload,
)
from services.matching_service import evaluate_roles
from services.pathway_service import synthesize_pathway

router = APIRouter()


@router.post("/analyze", response_model=AnalyzeResponsePayload)
async def analyze_workforce_profile(request: AnalyzeRequestPayload):
    """
    Executes the deterministic matching engine, applies macro scenario weighting,
    evaluates UN SDG affinities, identifies automation-risk skills, and synthesizes
    a personalized 3-phase reskilling pathway grounded in verified courses.
    """
    session_id = request.sessionId or f"sess-{uuid.uuid4().hex[:12]}"
    assessment_id = f"asm-{uuid.uuid4().hex[:12]}"

    # 1. Deterministic Role Matching & Radar Chart computation
    matched_roles, radar_data = await evaluate_roles(
        profile=request.profile,
        scenario=request.macroScenario,
        locale=request.locale,
    )

    # 2. Reskilling Pathway Synthesis for the top prospective role
    top_role = matched_roles[0]
    roadmap = await synthesize_pathway(
        target_role=top_role,
        profile=request.profile,
        locale=request.locale,
    )

    # 3. Assemble and return complete analysis payload
    return AnalyzeResponsePayload(
        assessmentId=assessment_id,
        sessionId=session_id,
        generatedAt=datetime.now(timezone.utc).isoformat(),
        activeScenario=request.macroScenario,
        radarData=radar_data,
        topRoles=matched_roles,
        selectedRoleRoadmap=roadmap,
    )
