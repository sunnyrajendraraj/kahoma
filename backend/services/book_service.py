"""
Book Service.
Phase 2 orchestrator: Breaker → ProxyWriter (sequential) → Picasso → Binder.
Mirrors generate-book edge function logic.
"""

import logging
from typing import Any

from core.supabase_client import get_supabase
from core.audit import log_event
from agents.breaker import run_breaker
from agents.proxy_writer import run_proxy_writer
from agents.picasso import run_picasso
from agents.binder import run_binder

logger = logging.getLogger(__name__)


async def generate_book(session_id: str) -> dict[str, Any]:
    """
    Phase 2 orchestrator.
    1. Update session to phase 2
    2. Run Breaker → structure chapters
    3. Run ProxyWriter per chapter (sequential for coherence)
    4. Run Picasso → generate images
    5. Run Binder → assemble final book

    Returns dict with success, book_title, pdf_url.
    """
    sb = get_supabase()

    try:
        # 1. Update session to Phase 2
        sb.table("sessions").update(
            {"phase": 2, "status": "generating_book"}
        ).eq("id", session_id).execute()

        await log_event(
            "generate_book_start",
            session_id=session_id,
            data={},
        )

        # 2. Run Breaker Agent — structures the book
        breaker_result = await run_breaker(session_id)

        # 3. Run Proxy Writer for each chapter sequentially
        chapters_result = (
            sb.table("chapters")
            .select("id, chapter_number")
            .eq("session_id", session_id)
            .order("chapter_number", desc=False)
            .execute()
        )
        chapters = chapters_result.data or []

        for chapter in chapters:
            try:
                await run_proxy_writer(session_id, chapter["id"])
            except Exception as exc:
                logger.error(
                    "Proxy writer failed for chapter %d: %s",
                    chapter["chapter_number"],
                    exc,
                )
                # Continue with remaining chapters

        # 4. Run Picasso Agent — generate images
        try:
            await run_picasso(session_id)
        except Exception as exc:
            logger.error("Picasso agent failed: %s", exc)
            # Continue to binder — chapters without images still generate

        # 5. Run Binder Agent — assemble final book
        binder_result = await run_binder(session_id)

        # Log completion
        await log_event(
            "generate_book_complete",
            session_id=session_id,
            data={
                "book_title": breaker_result.get("book_title"),
                "pdf_url": binder_result.get("pdf_url"),
            },
        )

        return {
            "success": True,
            "book_title": breaker_result.get("book_title"),
            "pdf_url": binder_result.get("pdf_url"),
        }

    except Exception as exc:
        logger.error("generate_book error: %s", exc)

        # Mark session as failed
        try:
            sb.table("sessions").update(
                {
                    "status": "failed",
                    "error_message": str(exc),
                }
            ).eq("id", session_id).execute()
        except Exception:
            pass

        await log_event(
            "generate_book_error",
            session_id=session_id,
            data={"error": str(exc)},
        )

        raise
