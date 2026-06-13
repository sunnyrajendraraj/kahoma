"""
Books API routes.
Book status, progress, and download endpoints.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException

from api.v1.deps import get_current_user_id
from config import get_settings
from core.supabase_client import get_supabase
from schemas.book import (
    BookResponse,
    BookStatusResponse,
    ChapterResponse,
    BookDownloadResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get(
    "/sessions/{session_id}/book/status",
    response_model=BookStatusResponse,
    summary="Get book generation status",
)
async def get_book_status(
    session_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """
    Get the current book and chapter progress for a session.
    Returns book record, chapters, and progress counts.
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

    # Fetch book
    book_result = (
        sb.table("books")
        .select("*")
        .eq("session_id", session_id)
        .maybe_single()
        .execute()
    )

    # Fetch chapters
    chapters_result = (
        sb.table("chapters")
        .select("*")
        .eq("session_id", session_id)
        .order("chapter_number", desc=False)
        .execute()
    )

    chapters_data = chapters_result.data or []
    chapters = [ChapterResponse(**ch) for ch in chapters_data]
    written_count = sum(1 for ch in chapters_data if ch.get("status") == "written")

    book = BookResponse(**book_result.data) if book_result.data else None

    return BookStatusResponse(
        book=book,
        chapters=chapters,
        session_status=session_result.data.get("status", "recording"),
        chapters_written=written_count,
        total_chapters=len(chapters),
    )


@router.get(
    "/sessions/{session_id}/book/download",
    response_model=BookDownloadResponse,
    summary="Get book download URL",
)
async def get_book_download(
    session_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """
    Get a signed download URL for the book.
    URL is valid for 1 hour.
    """
    sb = get_supabase()
    settings = get_settings()

    # Verify ownership
    session_result = (
        sb.table("sessions")
        .select("id, user_id")
        .eq("id", session_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not session_result.data:
        raise HTTPException(status_code=404, detail="Session not found")

    # Fetch book
    book_result = (
        sb.table("books")
        .select("pdf_url, status, cover_title")
        .eq("session_id", session_id)
        .maybe_single()
        .execute()
    )
    if not book_result.data:
        raise HTTPException(status_code=404, detail="No book found for this session")

    book = book_result.data
    if book.get("status") != "ready":
        raise HTTPException(
            status_code=400,
            detail=f"Book is not ready. Current status: {book.get('status')}",
        )

    pdf_url = book.get("pdf_url")
    if not pdf_url:
        raise HTTPException(status_code=404, detail="No book file available")

    # Generate signed URL (1 hour expiry)
    try:
        signed = sb.storage.from_(settings.books_bucket).create_signed_url(
            pdf_url, 3600
        )
        signed_url = signed.get("signedURL") or signed.get("signedUrl")
        if not signed_url:
            raise ValueError("No signed URL returned")
    except Exception as exc:
        logger.error("Failed to create signed URL: %s", exc)
        raise HTTPException(status_code=500, detail=f"Failed to generate download URL: {exc}")

    # Determine filename
    filename = "kahoma_book.pdf" if pdf_url.endswith(".pdf") else "kahoma_book.html"

    return BookDownloadResponse(
        download_url=signed_url,
        filename=filename,
    )
