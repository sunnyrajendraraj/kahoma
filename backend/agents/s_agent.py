"""
S-Agent (Sentiment Analysis Agent).
Analyzes the emotional landscape of the narrator's story.
Uses native Pydantic structured outputs.
"""

import logging
from typing import Any, List, Optional
from pydantic import BaseModel, Field

from config import get_settings
from core.gemini_client import call_gemini_structured
from core.supabase_client import get_supabase
from core.audit import log_event

logger = logging.getLogger(__name__)


class SentimentResult(BaseModel):
    """Pydantic model for S-Agent sentiment analysis output."""

    sentiment: str = Field(description="The primary emotional tone of the narrator's story")
    tonality: str = Field(description="Subtle nuances or variations in tone (e.g., warm, melancholy)")
    story_direction: str = Field(description="Narrative arc or summary of story path")
    political_social_lens: Optional[str] = Field(
        default=None, description="Any political or social context mentioned or implied"
    )
    predicted_future: str = Field(description="Predicted direction of narrator's future story topics")
    confidence: int = Field(ge=0, le=100, description="Confidence score (0-100) of the analysis")
    key_emotional_moments: List[str] = Field(description="List of emotionally charged moments in the transcript")
    narrator_current_emotional_state: str = Field(description="Narrator's current emotional state during recording")


S_AGENT_SYSTEM_PROMPT = """You are the Sentiment Analysis Agent for Kahoma, a memoir platform.
Analyze the narrator's full transcript and extract the emotional landscape.
The narrator is the supreme authority on their own story. Never judge. Always understand."""

MOCK_SENTIMENT: dict[str, Any] = {
    "sentiment": "nostalgic",
    "tonality": "warm with undercurrents of loss",
    "story_direction": "A family saga spanning generations, rooted in the narrator's deep love for their grandmother and the old haveli in Lucknow",
    "political_social_lens": "Post-partition India, middle-class family navigating modernization",
    "predicted_future": "The narrator will likely reveal a pivotal loss or separation that shaped their adult identity",
    "confidence": 78,
    "key_emotional_moments": [
        "The description of grandmother Savitri standing near tulsi every morning",
        "Father's harmonium evenings — a sacred ritual",
        "The family's move to Bombay — loss of the familiar",
    ],
    "narrator_current_emotional_state": "Reflective and tender, revisiting memories with love and a slight ache",
}


async def run_s_agent(session_id: str) -> dict[str, Any]:
    """
    Run sentiment analysis on a session's transcript.
    UPSERTs the result into sentiment_store.

    Returns the parsed sentiment output as a dictionary.
    """
    settings = get_settings()
    sb = get_supabase()

    if settings.mock_mode:
        parsed = MOCK_SENTIMENT.copy()
        logger.info("[MOCK] S-Agent returning mock sentiment")
    else:
        # Fetch all context messages
        result = (
            sb.table("context_messages")
            .select("role, content, message_order")
            .eq("session_id", session_id)
            .order("message_order", desc=False)
            .execute()
        )
        messages = result.data or []

        context_string = "\n\n".join(
            f"[{m['role'].upper()}]: {m['content']}" for m in messages
        )

        structured_response = await call_gemini_structured(
            S_AGENT_SYSTEM_PROMPT,
            f"Analyze this story transcript:\n\n{context_string}",
            response_schema=SentimentResult,
            max_tokens=1024,
        )
        parsed = structured_response.model_dump()

    # UPSERT to sentiment_store
    sb.table("sentiment_store").upsert(
        {
            "session_id": session_id,
            "sentiment": parsed.get("sentiment", ""),
            "tonality": parsed.get("tonality", ""),
            "story_direction": parsed.get("story_direction", ""),
            "predicted_future": parsed.get("predicted_future", ""),
            "confidence_score": parsed.get("confidence", 0),
            "raw_output": parsed,
        },
        on_conflict="session_id",
    ).execute()

    # Audit log
    await log_event(
        "s_agent_complete",
        session_id=session_id,
        data={"confidence": parsed.get("confidence")},
    )

    return parsed
