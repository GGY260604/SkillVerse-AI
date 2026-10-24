from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from config import settings
from routers.v1 import v1_router
from services.http_client import get_shared_client, close_shared_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Eagerly initialize warm HTTP connection pool on startup
    get_shared_client()

    # Pre-warm local BGE-M3 model into memory during startup if enabled
    if settings.ENABLE_LOCAL_BGE_M3:
        import asyncio
        from services.embedding_service import get_local_embedding_model
        try:
            print("[startup] Pre-warming BAAI/bge-m3 local embedding model into RAM...")
            await asyncio.to_thread(get_local_embedding_model)
            print("[startup] BAAI/bge-m3 model warmed up and ready for zero-latency inference.")
        except Exception as e:
            print(f"[startup] Warning: Failed to pre-warm local embedding model: {e}")

    yield
    # Gracefully close connections on shutdown
    await close_shared_client()


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description=(
        "Computational AI microservice for SkillVerse AI. "
        "Provides multimodal document extraction, ESCO/O*NET taxonomy normalization, "
        "and AI reskilling pathway intelligence."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Configure Cross-Origin Resource Sharing (CORS) for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API v1 Routers
app.include_router(v1_router, prefix=settings.API_V1_PREFIX)


@app.get("/", tags=["Root"])
async def root():
    """
    Root status endpoint providing basic metadata and documentation links.
    """
    return {
        "service": settings.APP_NAME,
        "status": "online",
        "documentation": "/docs",
        "health": f"{settings.API_V1_PREFIX}/health",
        "version": "1.0.0",
    }


@app.get("/ping", tags=["Health"])
async def ping():
    """
    RunPod Serverless health check endpoint.
    """
    return {"status": "healthy"}


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Global exception fallback to return structured JSON errors.
    """
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error_type": type(exc).__name__,
            "message": str(exc),
        },
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
