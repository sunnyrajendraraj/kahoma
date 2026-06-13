"""
Kahoma Backend — FastAPI Application Entry Point.

Voice-first memoir creation platform.
Run with: uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""

import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Ensure the backend directory is on the Python path
sys.path.insert(0, str(Path(__file__).parent))

from config import get_settings
from api.v1.router import router as v1_router

# ─── Logging ────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("kahoma")


# ─── Lifespan ───────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    settings = get_settings()
    logger.info("=" * 60)
    logger.info("  Kahoma Backend starting...")
    logger.info("  MOCK_MODE: %s", settings.mock_mode)
    logger.info("  Supabase: %s", settings.supabase_url)
    logger.info("  Gemini model: %s", settings.gemini_model)
    logger.info("=" * 60)

    # Eagerly initialize clients to catch config errors at startup
    from core.supabase_client import get_supabase_client
    try:
        get_supabase_client()
        logger.info("✓ Supabase client initialized")
    except Exception as exc:
        logger.error("✗ Supabase client failed: %s", exc)

    if not settings.mock_mode:
        from core.gemini_client import get_gemini_client
        try:
            get_gemini_client()
            logger.info("✓ Gemini client initialized")
        except Exception as exc:
            logger.error("✗ Gemini client failed: %s", exc)

    yield

    logger.info("Kahoma Backend shutting down...")


# ─── App ────────────────────────────────────────────────────────────────────

settings = get_settings()

app = FastAPI(
    title="Kahoma API",
    description=(
        "Voice-first memoir creation platform. "
        "Upload voice recordings, AI processes them through a multi-agent pipeline, "
        "and generates a literary-quality memoir book."
    ),
    version=settings.app_version,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)


# ─── CORS ───────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Global exception handler ──────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all exception handler for unhandled errors."""
    logger.error("Unhandled exception: %s %s — %s", request.method, request.url, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)},
    )


# ─── Routes ─────────────────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
async def root():
    """Health check endpoint."""
    return {
        "app": "Kahoma Backend",
        "version": settings.app_version,
        "mock_mode": settings.mock_mode,
        "status": "running",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Detailed health check."""
    health = {
        "status": "healthy",
        "mock_mode": settings.mock_mode,
        "supabase_url": settings.supabase_url,
    }

    # Test Supabase connection
    try:
        from core.supabase_client import get_supabase
        sb = get_supabase()
        sb.table("sessions").select("id").limit(1).execute()
        health["supabase"] = "connected"
    except Exception as exc:
        health["supabase"] = f"error: {exc}"
        health["status"] = "degraded"

    return health


# Include v1 API routes
app.include_router(v1_router, prefix=settings.api_prefix)


# ─── Run ────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )
