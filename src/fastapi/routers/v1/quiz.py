from fastapi import APIRouter, HTTPException, status
from schemas.quiz import PhaseQuizRequest, PhaseQuizResponse
from services.quiz_service import generate_phase_quiz

router = APIRouter(prefix="/quiz", tags=["Phase Mastery Quiz & Level Engine"])


@router.post(
    "/generate",
    response_model=PhaseQuizResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate 10-question technical competency quiz with EXP evaluation",
    description=(
        "Audits the planned competencies in a roadmap phase, generates exactly 10 practical "
        "multiple-choice questions with 4 options each, and asks Gemini to calibrate the EXP reward "
        "(between 5 and 100 in steps of 5) awarded upon achieving a perfect 10/10 score."
    ),
)
async def create_phase_quiz(request: PhaseQuizRequest):
    """
    Evaluates phase planned skills, generates 10 scenario questions,
    and returns Gemini-evaluated EXP rewards.
    """
    try:
        quiz_data = await generate_phase_quiz(request)
        return quiz_data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate phase verification quiz: {str(e)}",
        )
