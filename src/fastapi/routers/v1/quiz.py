from fastapi import APIRouter, HTTPException, status
from schemas.quiz import PhaseQuizRequest, PhaseQuizResponse
from services.quiz import generate_phase_quiz

router = APIRouter(prefix="/quiz", tags=["Phase Mastery Quiz & Level Engine"])


@router.post(
    "/generate",
    response_model=PhaseQuizResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate 10-question technical competency quiz with EXP evaluation",
    description=(
        "Audits the planned competencies in a roadmap phase, generates exactly 10 practical "
        "multiple-choice questions with 4 options each via Tier 1 Local Qwen 2.5 (with Tier 2 Gemini "
        "and Tier 3 deterministic fallbacks), and calibrates the EXP reward in steps of 5."
    ),
)
async def create_phase_quiz(request: PhaseQuizRequest):
    """
    Evaluates phase planned skills, generates 10 scenario questions via Tier 1 Qwen 2.5,
    and returns evaluated EXP rewards.
    """
    try:
        quiz_data = await generate_phase_quiz(request)
        return quiz_data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate phase verification quiz: {str(e)}",
        )
