from fastapi import APIRouter
from ...config import settings

router = APIRouter()


@router.get("/health")
async def health_check():
    """
    Health check endpoint for RunPod pod monitoring and Next.js backend health checks.
    """
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": "1.0.0",
        "gemini_keys_available": len(settings.GEMINI_API_KEYS),
    }
