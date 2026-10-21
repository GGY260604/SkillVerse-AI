from fastapi import APIRouter, HTTPException, status
from schemas.mentor import MentorQueryPayload, MentorResponsePayload
from services.mentor_service import generate_mentor_guidance

router = APIRouter(prefix="/mentor", tags=["Module 3: In-Roadmap Learning Mentor"])


@router.post(
    "",
    response_model=MentorResponsePayload,
    status_code=status.HTTP_200_OK,
    summary="Generate contextualized AI mentor guidance for a roadmap module",
    description=(
        "Translates technical course topics and concepts into intuitive analogies grounded "
        "in the learner's previous non-technical occupation, generating an interactive mini-check quiz "
        "and UN SDG impact alignment."
    ),
)
async def ask_ai_mentor(payload: MentorQueryPayload):
    """
    Module 3: In-Roadmap Contextual Learning Mentor ("Ask AI Mentor").
    Bridges user's past job experience to complex technical course topics.
    """
    try:
        guidance = await generate_mentor_guidance(payload)
        return guidance
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate AI mentor guidance: {str(e)}",
        )
