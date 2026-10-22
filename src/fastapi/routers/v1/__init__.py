from fastapi import APIRouter
from .extract import router as extract_router
from .health import router as health_router
from .analyze import router as analyze_router
from .trends import router as trends_router
from .mentor import router as mentor_router
from .credential import router as credential_router
from .replan import router as replan_router
from .quiz import router as quiz_router

v1_router = APIRouter()
v1_router.include_router(health_router, tags=["Health"])
v1_router.include_router(extract_router, tags=["Intake & Extraction"])
v1_router.include_router(analyze_router, tags=["Analysis & Reskilling"])
v1_router.include_router(trends_router, tags=["Dynamic Trends & Market Signals"])
v1_router.include_router(replan_router, tags=["Module 2: Autonomous Roadmap Re-Planning"])
v1_router.include_router(mentor_router, tags=["Module 3: In-Roadmap Learning Mentor"])
v1_router.include_router(credential_router, tags=["Module 5: Milestone Proof & Credential Verification"])
v1_router.include_router(quiz_router, tags=["Phase Mastery Quiz & Level Engine"])

__all__ = ["v1_router"]




