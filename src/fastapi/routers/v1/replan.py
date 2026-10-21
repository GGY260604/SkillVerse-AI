from fastapi import APIRouter, HTTPException, status
from schemas.replan import ReplanRequestPayload, ShiftAdvisoryPayload
from services.replan_service import execute_roadmap_replanning

router = APIRouter(prefix="/replan", tags=["Module 2: Autonomous Roadmap Re-Planning"])


@router.post(
    "",
    response_model=ShiftAdvisoryPayload,
    status_code=status.HTTP_200_OK,
    summary="Evaluate market drift and dynamically update career roadmaps",
    description=(
        "Module 2: Detects labor market vector shifts (Delta Vs >= 0.30) against user roadmap milestones, "
        "swapping declining courses for high-velocity and HRD Corp-claimable programs."
    ),
)
async def replan_roadmap(payload: ReplanRequestPayload):
    """
    Module 2: Autonomous Roadmap Re-Planning Engine ("Market Drift Alert").
    Evaluates market vector shifts and recommends modern course replacements.
    """
    try:
        advisory = await execute_roadmap_replanning(payload)
        return advisory
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Roadmap re-planning execution failed: {str(e)}",
        )
