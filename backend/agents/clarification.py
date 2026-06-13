"""
Clarification Agent.
Generates warm, human-like responses — acknowledgements or questions.
"""

import logging
import random
from typing import Any

from config import get_settings
from core.gemini_client import call_gemini
from core.supabase_client import get_supabase
from core.audit import log_event

logger = logging.getLogger(__name__)

CLARIFICATION_SYSTEM_PROMPT = """You are Kahoma's story companion. Warm, patient, genuinely interested.
Acknowledgements: max 2 sentences. Questions: max 1 sentence.
Never clinical. Never formal. Speak like a caring friend.
Good acknowledgement: "That's a remarkable memory. Please continue."
Good question: "Just to hold the story clearly — he's your father, yes?"
If requesting a photo: explain warmly how it will help bring the story to life. Make clear it's optional. Max 2 sentences."""

MOCK_ACKNOWLEDGEMENTS = [
    "That's a beautiful memory — the way you describe your dadi and the tulsi plant, I can almost smell the mornings. Please, continue whenever you're ready.",
    "I can feel the warmth of those harmonium evenings. Your father sounds like a remarkable man. Tell me more whenever you'd like.",
    "The move to Bombay sounds like it changed everything. Thank you for sharing something so deeply personal. Take your time.",
]

MOCK_QUESTIONS = [
    "Just to make sure I have the family right — was Savitri your father's mother or your mother's mother?",
    "I want to hold this story clearly — when you mention 'home,' are you thinking of the haveli in Lucknow or somewhere else?",
]


async def run_clarification(
    session_id: str,
    evaluator_result: dict[str, Any],
) -> dict[str, Any]:
    """
    Generate a warm response based on the evaluator's decision.
    Inserts the message into context_messages and updates session status.

    Returns dict with message, decision, and photo_character (if any).
    """
    settings = get_settings()
    sb = get_supabase()

    decision = evaluator_result.get("decision", "acknowledge")
    question_to_ask = evaluator_result.get("question_to_ask")
    new_chars_needing_photo = evaluator_result.get("new_characters_needing_photo", [])

    photo_character_name: str | None = None

    if settings.mock_mode:
        if decision == "ask" and question_to_ask:
            generated_message = random.choice(MOCK_QUESTIONS)
        else:
            generated_message = random.choice(MOCK_ACKNOWLEDGEMENTS)

        # Handle photo request
        if new_chars_needing_photo:
            chars_result = (
                sb.table("characters")
                .select("id, name, photo_requested")
                .eq("session_id", session_id)
                .eq("photo_requested", False)
                .limit(1)
                .execute()
            )
            chars = chars_result.data or []
            if chars:
                photo_character_name = chars[0]["name"]
                generated_message += f"\n\nIf you happen to have a photo of {photo_character_name}, we'd love to include it in your book — but only if you'd like to."

        logger.info("[MOCK] Clarification returning %s message", decision)
    else:
        # Fetch recent context for tone matching
        recent_result = (
            sb.table("context_messages")
            .select("role, content")
            .eq("session_id", session_id)
            .order("message_order", desc=True)
            .limit(3)
            .execute()
        )
        recent_messages = list(reversed(recent_result.data or []))
        recent_context = "\n".join(
            f"[{m['role'].upper()}]: {m['content']}" for m in recent_messages
        )

        if decision == "acknowledge":
            user_prompt = f"The narrator just shared this part of their story. Generate a warm, genuine 1-2 sentence acknowledgement that invites them to continue.\n\nRecent context:\n{recent_context}"
        else:
            user_prompt = f"The narrator just shared their story but we need clarification. Rephrase this question into warm, friendly language (max 1 sentence):\n\nQuestion: {question_to_ask}\n\nRecent context:\n{recent_context}"

        # Handle photo request for real mode
        if new_chars_needing_photo:
            chars_result = (
                sb.table("characters")
                .select("id, name, photo_requested")
                .eq("session_id", session_id)
                .eq("photo_requested", False)
                .limit(1)
                .execute()
            )
            chars = chars_result.data or []
            if chars:
                photo_character_name = chars[0]["name"]
                user_prompt += f"\n\nAlso, gently ask if the narrator has a photo of {photo_character_name} they'd like to include. Make it feel optional and warm. Append this as a second part of your response."

        generated_message = await call_gemini(
            CLARIFICATION_SYSTEM_PROMPT,
            user_prompt,
            max_tokens=512,
        )

    # Mark character as photo_requested
    if photo_character_name:
        sb.table("characters").update({"photo_requested": True}).eq(
            "session_id", session_id
        ).eq("name", photo_character_name).execute()

    # Get next message_order
    last_msg_result = (
        sb.table("context_messages")
        .select("message_order")
        .eq("session_id", session_id)
        .order("message_order", desc=True)
        .limit(1)
        .maybe_single()
        .execute()
    )
    next_order = (last_msg_result.data.get("message_order", 0) if last_msg_result.data else 0) + 1

    # Insert assistant message
    sb.table("context_messages").insert(
        {
            "session_id": session_id,
            "role": "assistant",
            "content": generated_message,
            "message_order": next_order,
        }
    ).execute()

    # Update session status
    sb.table("sessions").update({"status": "awaiting_user"}).eq("id", session_id).execute()

    # Audit log
    await log_event(
        "clarification_complete",
        session_id=session_id,
        data={"decision": decision, "photo_requested": photo_character_name},
    )

    return {
        "message": generated_message,
        "decision": decision,
        "photo_character": photo_character_name,
    }
