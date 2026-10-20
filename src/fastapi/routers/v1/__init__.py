from fastapi import APIRouter
from .extract import router as extract_router
from .health import router as health_router
from .analyze import router as analyze_router

v1_router = APIRouter()
v1_router.include_router(health_router, tags=["Health"])
v1_router.include_router(extract_router, tags=["Intake & Extraction"])
v1_router.include_router(analyze_router, tags=["Analysis & Reskilling"])

__all__ = ["v1_router"]
