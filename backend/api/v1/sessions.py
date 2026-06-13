"""
Sessions API routes.
CRUD operations for storytelling sessions.
"""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks

from api.v1.deps import get_current_user_id
from core.supabase_client import get_supabase
from schemas.session import SessionCreate, SessionResponse, SessionListResponse, ContextMessage
from schemas.book import BookGenerateResponse
from services.book_service import generate_book

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post(
    "/",
    response_model=SessionResponse,
    status_code=201,
    summary="Create a new session",
)
async def create_session(
    body: SessionCreate,
    user_id: str = Depends(get_current_user_id),
):
    """Create a new storytelling session."""
    sb = get_supabase()

    result = (
        sb.table("sessions")
        .insert(
            {
                "user_id": user_id,
                "title": body.title,
                "status": "recording",
                "phase": 1,
            }
        )
        .select()
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create session")

    return SessionResponse(**result.data)


@router.get(
    "/",
    response_model=SessionListResponse,
    summary="List user sessions",
)
async def list_sessions(
    user_id: str = Depends(get_current_user_id),
):
    """List all sessions owned by the authenticated user."""
    sb = get_supabase()

    result = (
        sb.table("sessions")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )

    sessions = [SessionResponse(**s) for s in (result.data or [])]
    return SessionListResponse(sessions=sessions, count=len(sessions))


@router.get(
    "/{session_id}",
    response_model=SessionResponse,
    summary="Get session details",
)
async def get_session(
    session_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """Get a single session by ID, verifying ownership."""
    sb = get_supabase()

    result = (
        sb.table("sessions")
        .select("*")
        .eq("id", session_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Session not found")

    return SessionResponse(**result.data)


@router.get(
    "/{session_id}/messages",
    response_model=list[ContextMessage],
    summary="Get session messages",
)
async def get_session_messages(
    session_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """Get all context messages for a session."""
    sb = get_supabase()

    # Verify ownership
    session_result = (
        sb.table("sessions")
        .select("id")
        .eq("id", session_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not session_result.data:
        raise HTTPException(status_code=404, detail="Session not found")

    result = (
        sb.table("context_messages")
        .select("*")
        .eq("session_id", session_id)
        .order("message_order", desc=False)
        .execute()
    )

    return [ContextMessage(**m) for m in (result.data or [])]


@router.post(
    "/{session_id}/generate-book",
    response_model=BookGenerateResponse,
    status_code=202,
    summary="Trigger book generation",
    description="Start Phase 2 book generation in the background. Returns 202 immediately.",
)
async def trigger_generate_book(
    session_id: str,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id),
):
    """
    Trigger book generation for a session.
    Runs the full Phase 2 pipeline in the background:
    Breaker → ProxyWriter → Picasso → Binder
    """
    sb = get_supabase()

    # Verify ownership
    session_result = (
        sb.table("sessions")
        .select("id, user_id, status")
        .eq("id", session_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not session_result.data:
        raise HTTPException(status_code=404, detail="Session not found")

    current_status = session_result.data.get("status")
    if current_status in ("generating_book", "book_ready"):
        raise HTTPException(
            status_code=400,
            detail=f"Session already in state: {current_status}",
        )

    # Start background generation
    background_tasks.add_task(_background_generate_book, session_id)

    return BookGenerateResponse(session_id=session_id)


async def _background_generate_book(session_id: str) -> None:
    """Background task wrapper for book generation."""
    try:
        await generate_book(session_id)
    except Exception as exc:
        logger.error("Background book generation failed: %s", exc)
