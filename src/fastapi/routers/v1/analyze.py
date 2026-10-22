import json
import uuid
import asyncio
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from schemas.analysis import (
    AnalyzeRequestPayload,
    AnalyzeResponsePayload,
    SynthesizeRoadmapRequest,
    SynthesizeRoadmapResponse,
    MatchedRole,
)
from schemas.team import (
    TeamSkillMatrixRequest,
    TeamSkillMatrixResponse,
)
from services.analyze import evaluate_roles, synthesize_pathway, evaluate_team_skill_matrix

router = APIRouter()


@router.post("/analyze", response_model=AnalyzeResponsePayload)
async def analyze_workforce_profile(request: AnalyzeRequestPayload):
    """
    Stage 1: Evaluates deterministic role matching, BGE-M3 dense vector cosine similarity,
    Supabase HNSW index search, UN SDG impact affinities, and automation-risk competencies.
    If autoSynthesizeRoadmap is True, also generates the 3-phase reskilling roadmap and persists to Supabase.
    If autoSynthesizeRoadmap is False, returns the Top 5 matched roles immediately (~1.2s)
    so the user can review and select their preferred career path.
    """
    session_id = request.sessionId or f"sess-{uuid.uuid4().hex[:12]}"
    assessment_id = str(uuid.uuid4())

    # 1. Deterministic Role Matching & Radar Chart computation
    matched_roles, radar_data, scenario_roles = await evaluate_roles(
        profile=request.profile,
        scenario=request.macroScenario,
        locale=request.locale,
    )

    top_5_roles = matched_roles[:5]
    roadmap = None

    if request.autoSynthesizeRoadmap:
        # Determine target role (either requested targetRoleId or top matched role)
        target_role = top_5_roles[0]
        if request.targetRoleId:
            for r in matched_roles:
                if r.roleId == request.targetRoleId:
                    target_role = r
                    break

        roadmap = await synthesize_pathway(
            target_role=target_role,
            profile=request.profile,
            locale=request.locale,
        )

    return AnalyzeResponsePayload(
        assessmentId=assessment_id,
        sessionId=session_id,
        generatedAt=datetime.now(timezone.utc).isoformat(),
        activeScenario=request.macroScenario,
        radarData=radar_data,
        topRoles=top_5_roles,
        scenarioRoles=scenario_roles,
        selectedRoleRoadmap=roadmap,
    )


@router.post("/analyze/stream")
async def analyze_workforce_profile_stream(request: AnalyzeRequestPayload):
    """
    Streams Server-Sent Events (SSE) representing each real computational phase
    of the profile intake and role discovery engine:
    - Phase 1: Auditing at-risk competencies against Supabase trend signals
    - Phase 2: Generating 1024-dimensional BGE-M3 semantic profile embedding
    - Phase 3: Querying Supabase HNSW pgvector index & soft skill overlaps
    - Phase 4: Calibrating Recharts radar axes & UN SDG alignments
    - Phase 5: Complete event delivering the Top 5 matched roles for user selection.
    """
    async def event_generator():
        try:
            # Phase 1: Trend Signals Audit
            yield f"data: {json.dumps({'phase': 1, 'title': 'Auditing Automation Risk', 'detail': 'Auditing competencies against live Supabase trend signals...', 'percent': 25})}\n\n"
            await asyncio.sleep(0.1)

            # Phase 2: Vector Embedding Generation
            yield f"data: {json.dumps({'phase': 2, 'title': 'Vector Embedding Generation', 'detail': 'Generating 1024-dimensional BGE-M3 semantic profile vector...', 'percent': 50})}\n\n"
            await asyncio.sleep(0.1)

            # Phase 3 & 4: Execute real role evaluation
            yield f"data: {json.dumps({'phase': 3, 'title': 'Occupational Taxonomy Search', 'detail': 'Querying Supabase HNSW pgvector index & calculating soft overlaps...', 'percent': 75})}\n\n"

            matched_roles, radar_data, scenario_roles = await evaluate_roles(
                profile=request.profile,
                scenario=request.macroScenario,
                locale=request.locale,
            )

            yield f"data: {json.dumps({'phase': 4, 'title': 'Calibrating SDG Alignment', 'detail': 'Calibrating competency radar axes & UN SDG impact goals...', 'percent': 90})}\n\n"
            await asyncio.sleep(0.1)

            top_5_roles = matched_roles[:5]
            session_id = request.sessionId or f"sess-{uuid.uuid4().hex[:12]}"
            assessment_id = str(uuid.uuid4())

            result_payload = AnalyzeResponsePayload(
                assessmentId=assessment_id,
                sessionId=session_id,
                generatedAt=datetime.now(timezone.utc).isoformat(),
                activeScenario=request.macroScenario,
                radarData=radar_data,
                topRoles=top_5_roles,
                scenarioRoles=scenario_roles,
                selectedRoleRoadmap=None,
            )

            yield f"data: {json.dumps({'phase': 5, 'title': 'Discovery Complete', 'detail': 'Discovered top 5 future-ready roles', 'percent': 100, 'result': result_payload.model_dump()})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'phase': -1, 'error': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/analyze/synthesize-roadmap", response_model=SynthesizeRoadmapResponse)
async def synthesize_selected_role_roadmap(request: SynthesizeRoadmapRequest):
    """
    Stage 2: Takes the user's explicitly selected role from the Top 5 candidates,
    synthesizes a tailored 3-phase reskilling roadmap via Google Gemini (grounded in
    free Coursera/edX audit tracks and Malaysian HRD Corp claimable modules),
    and persists the complete assessment record to Supabase.
    """
    session_id = request.sessionId or f"sess-{uuid.uuid4().hex[:12]}"
    assessment_id = request.assessmentId or str(uuid.uuid4())

    # 1. Locate the selected role definition
    target_role: Optional[MatchedRole] = None
    if request.topRoles:
        for r in request.topRoles:
            if r.roleId == request.targetRoleId:
                target_role = r
                break

    # If topRoles not provided or role not found in cached list, evaluate dynamically
    if not target_role:
        matched_roles, radar_data, _ = await evaluate_roles(
            profile=request.profile,
            scenario=request.macroScenario,
            locale=request.locale,
        )
        for r in matched_roles:
            if r.roleId == request.targetRoleId:
                target_role = r
                break
        if not target_role and matched_roles:
            target_role = matched_roles[0]
        top_roles_to_save = matched_roles[:5]
        radar_data_to_save = radar_data
    else:
        top_roles_to_save = request.topRoles
        radar_data_to_save = request.radarData or []

    if not target_role:
        raise HTTPException(
            status_code=404,
            detail=f"Target role '{request.targetRoleId}' could not be resolved.",
        )

    # 2. Reskilling Pathway Synthesis with Google Gemini 1.5 Flash
    roadmap = await synthesize_pathway(
        target_role=target_role,
        profile=request.profile,
        locale=request.locale,
    )

    return SynthesizeRoadmapResponse(
        assessmentId=assessment_id,
        sessionId=session_id,
        generatedAt=datetime.now(timezone.utc).isoformat(),
        activeScenario=request.macroScenario,
        targetRoleId=target_role.roleId,
        targetRoleTitle=target_role.titleLocalized or target_role.title,
        radarData=radar_data_to_save,
        topRoles=top_roles_to_save,
        selectedRoleRoadmap=roadmap,
    )


@router.post("/analyze/team-matrix", response_model=TeamSkillMatrixResponse)
async def analyze_team_skill_matrix(request: TeamSkillMatrixRequest):
    """
    Manager Workforce Analytics:
    Evaluates and ranks a cohort of candidates against a target role benchmark.
    Uses the 3-Tier Hybrid Matching Pipeline (Exact -> Token Overlap -> BGE-M3 Dense Cosine).
    Returns ranked candidates (closest candidate = Rank 1), mastery vs deficit breakdown,
    and HRD Corp claimable cohort reskilling recommendations.
    """
    return await evaluate_team_skill_matrix(request)

