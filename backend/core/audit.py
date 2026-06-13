"""
Audit / processing log helper.
Inserts structured events into the processing_log table for observability.
"""

import logging
from typing import Any

from core.supabase_client import get_supabase

logger = logging.getLogger(__name__)


async def log_event(
    event: str,
    *,
    session_id: str | None = None,
    chunk_id: str | None = None,
    data: dict[str, Any] | None = None,
) -> None:
    """Insert an audit event into processing_log."""
    sb = get_supabase()
    try:
        row: dict[str, Any] = {"event": event, "data": data or {}}
        if session_id:
            row["session_id"] = session_id
        if chunk_id:
            row["chunk_id"] = chunk_id

        sb.table("processing_log").insert(row).execute()
        logger.debug("Audit log: %s (session=%s)", event, session_id)
    except Exception as exc:
        logger.error("Failed to write audit log: %s — %s", event, exc)
