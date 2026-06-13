"""
Bible Service.
Assembles the "Bible" — the accumulated knowledge from Phase 1
that Phase 2 agents use for book generation.

Bible = Sentiment Store + Entity Store + Context Window (all messages)
"""

import logging
from typing import Any

from core.supabase_client import get_supabase

logger = logging.getLogger(__name__)


async def assemble_bible(session_id: str) -> dict[str, Any]:
    """
    Assemble the complete Bible for a session.
    Used by Phase 2 agents (Breaker, ProxyWriter) for context.

    Returns dict with sentiment, entities, relationships, and transcript.
    """
    sb = get_supabase()

    # Fetch all three stores in parallel-ish (sync calls via supabase-py)
    sentiment_result = (
        sb.table("sentiment_store")
        .select("*")
        .eq("session_id", session_id)
        .maybe_single()
        .execute()
    )
    entity_result = (
        sb.table("entity_store")
        .select("*")
        .eq("session_id", session_id)
        .maybe_single()
        .execute()
    )
    messages_result = (
        sb.table("context_messages")
        .select("role, content, message_order")
        .eq("session_id", session_id)
        .order("message_order", desc=False)
        .execute()
    )

    sentiment = sentiment_result.data
    entities = entity_result.data
    messages = messages_result.data or []

    # Build transcript string
    transcript = "\n\n".join(
        f"[{m['role'].upper()}]: {m['content']}" for m in messages
    )

    # Extract user-only transcript (for word count, etc.)
    user_transcript = "\n\n".join(
        m["content"] for m in messages if m["role"] == "user"
    )

    return {
        "sentiment": sentiment.get("raw_output", {}) if sentiment else {},
        "entities": entities.get("entities", []) if entities else [],
        "relationships": entities.get("relationships", []) if entities else [],
        "full_transcript": transcript,
        "user_transcript": user_transcript,
        "message_count": len(messages),
        "user_message_count": sum(1 for m in messages if m["role"] == "user"),
    }
