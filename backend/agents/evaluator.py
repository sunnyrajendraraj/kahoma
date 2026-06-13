"""
Evaluator Agent.
Scores story understanding 0-100 across 5 dimensions.
Decides whether to acknowledge the narrator or ask a clarifying question.
"""

import logging
from typing import Any
import json

from config import get_settings
from core.gemini_client import call_gemini_json
from core.supabase_client import get_supabase
from core.audit import log_event

logger = logging.getLogger(__name__)

EVALUATOR_SYSTEM_PROMPT = """You are the Evaluator Agent for Kahoma.
Score story understanding 0-100:
- Entity completeness: 25pts
- Relationship clarity: 20pts
- Sentiment confidence: 20pts
- Perspective accuracy: 20pts
- Story coherence: 15pts
Threshold: 80. Below 80 = ask ONE specific question. Above 80 = acknowledge.
If a key character's identity is ambiguous in a story-changing way: always ask regardless of score.
Respond with ONLY valid JSON:
{
  "overall_score": integer,
  "dimension_scores": { "entity_completeness": int, "relationship_clarity": int, "sentiment_confidence": int, "perspective_accuracy": int, "story_coherence": int },
  "decision": "acknowledge"|"ask",
  "gaps": string[],
  "question_to_ask": string or null,
  "catastrophic_gap": boolean,
  "new_characters_needing_photo": string[]
}"""

MOCK_ASK: dict[str, Any] = {
    "overall_score": 65,
    "dimension_scores": {
        "entity_completeness": 15,
        "relationship_clarity": 10,
        "sentiment_confidence": 15,
        "perspective_accuracy": 12,
        "story_coherence": 13,
    },
    "decision": "ask",
    "gaps": ["Relationship between Dadi Savitri and Papa is unclear"],
    "question_to_ask": "Was Savitri your father's mother or your mother's mother?",
    "catastrophic_gap": False,
    "new_characters_needing_photo": ["dadi-savitri"],
}

MOCK_ACKNOWLEDGE: dict[str, Any] = {
    "overall_score": 85,
    "dimension_scores": {
        "entity_completeness": 22,
        "relationship_clarity": 17,
        "sentiment_confidence": 18,
        "perspective_accuracy": 16,
        "story_coherence": 12,
    },
    "decision": "acknowledge",
    "gaps": [],
    "question_to_ask": None,
    "catastrophic_gap": False,
    "new_characters_needing_photo": [],
}


async def run_evaluator(session_id: str) -> dict[str, Any]:
    """
    Evaluate story understanding and decide ask/acknowledge.
    First chunk: ask. Subsequent: acknowledge (in mock mode).

    Returns the evaluator result dict.
    """
    settings = get_settings()
    sb = get_supabase()

    if settings.mock_mode:
        # Count messages to alternate between ask/acknowledge
        msg_result = (
            sb.table("context_messages")
            .select("id", count="exact")
            .eq("session_id", session_id)
            .execute()
        )
        count = msg_result.count or 0
        should_ask = count <= 2

        parsed = MOCK_ASK.copy() if should_ask else MOCK_ACKNOWLEDGE.copy()
        logger.info(
            "[MOCK] Evaluator returning %s with score %s",
            parsed["decision"],
            parsed["overall_score"],
        )
    else:
        # Fetch all stores for evaluation
        messages_result = (
            sb.table("context_messages")
            .select("role, content, message_order")
            .eq("session_id", session_id)
            .order("message_order", desc=False)
            .execute()
        )
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

        messages = messages_result.data or []
        sentiment = sentiment_result.data
        entities = entity_result.data

        context_string = "\n\n".join(
            f"[{m['role'].upper()}]: {m['content']}" for m in messages
        )

        user_message = f"Evaluate how well we understand this story:\n\n--- TRANSCRIPT ---\n{context_string}"
        if sentiment:
            user_message += f"\n\n--- S-AGENT OUTPUT ---\n{json.dumps(sentiment.get('raw_output', sentiment), indent=2)}"
        if entities:
            user_message += f"\n\n--- E-AGENT OUTPUT ---\nEntities: {json.dumps(entities.get('entities', []), indent=2)}\nRelationships: {json.dumps(entities.get('relationships', []), indent=2)}"

        parsed = await call_gemini_json(
            EVALUATOR_SYSTEM_PROMPT,
            user_message,
            max_tokens=1024,
        )

    # Audit log
    await log_event(
        "evaluator_complete",
        session_id=session_id,
        data={"score": parsed.get("overall_score"), "decision": parsed.get("decision")},
    )

    return parsed
