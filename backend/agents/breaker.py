"""
Breaker Agent.
Structures the story into chapters — emotionally resonant, not necessarily chronological.
Thinks like Premchand, Amrita Pritam, Dharmveer Bharati.
Uses native Pydantic structured outputs.
"""

import logging
import json
from typing import Any, List, Optional
from pydantic import BaseModel, Field

from config import get_settings
from core.gemini_client import call_gemini_structured
from core.supabase_client import get_supabase
from core.audit import log_event

logger = logging.getLogger(__name__)


class Chapter(BaseModel):
    """Pydantic model representing a structured book chapter."""

    chapter_number: int = Field(description="Sequential index of the chapter starting from 1")
    title: str = Field(description="Evocative, literary chapter title")
    era: str = Field(description="The era or decade, e.g. '1960s', '1982'")
    primary_location: str = Field(description="The main city or geographic setting of the chapter")
    primary_character: str = Field(description="The central figure besides the narrator in this chapter")
    emotional_arc: str = Field(description="Transition of feelings (e.g. warmth -> longing)")
    relevant_transcript_sections: List[str] = Field(description="Specific excerpts or segments from the transcript relevant to this chapter")
    image_concept: str = Field(description="Detailed prompt for generating the chapter's illustration")


class BreakerResult(BaseModel):
    """Pydantic model representing the overall Breaker output structure."""

    book_title: str = Field(description="Evocative 4-6 word book title")
    book_subtitle: Optional[str] = Field(default=None, description="Bitter-sweet or poetic subtitle")
    narrative_structure: str = Field(description="Description of the ordering style used (thematic, chronological, emotional)")
    chapters: List[Chapter] = Field(description="List of structured chapters")
    total_chapters: int = Field(description="Total number of chapters")


BREAKER_SYSTEM_PROMPT = """You are the Breaker Agent. Think like India's greatest storytellers:
Premchand, Amrita Pritam, Dharmveer Bharati.
You receive the full Bible (sentiment + entities + transcript).
Divide the story into optimal chapters — NOT necessarily chronological.
Find the order that creates the most emotionally resonant book."""

MOCK_BREAKER_OUTPUT: dict[str, Any] = {
    "book_title": "The Haveli on Residency Road",
    "book_subtitle": "A memoir of mornings, migrations, and memory",
    "narrative_structure": "thematic-emotional",
    "total_chapters": 3,
    "chapters": [
        {
            "chapter_number": 1,
            "title": "The Smell of Tulsi at Dawn",
            "era": "1960s",
            "primary_location": "Lucknow",
            "primary_character": "Dadi Savitri",
            "emotional_arc": "warmth → longing",
            "relevant_transcript_sections": [
                "Dadi would wake before anyone. The tulsi plant was the first thing she touched."
            ],
            "image_concept": "Elderly Indian woman tending a tulsi plant in a sunlit courtyard, 1960s film grain",
        },
        {
            "chapter_number": 2,
            "title": "Harmonium Evenings",
            "era": "1970s",
            "primary_location": "Lucknow",
            "primary_character": "Papa",
            "emotional_arc": "joy → bittersweetness",
            "relevant_transcript_sections": [
                "Papa played the harmonium every evening after work. The neighbours gathered."
            ],
            "image_concept": "Man playing harmonium on a verandah at dusk, warm lamp light, 1970s India",
        },
        {
            "chapter_number": 3,
            "title": "Train to Bombay",
            "era": "1982",
            "primary_location": "Bombay",
            "primary_character": "Narrator",
            "emotional_arc": "anticipation → displacement",
            "relevant_transcript_sections": [
                "The day we left Lucknow, Maa didn't cry until the train crossed the bridge."
            ],
            "image_concept": "Indian family on a crowded railway platform, suitcases and farewells, early 1980s",
        },
    ],
}


async def run_breaker(session_id: str) -> dict[str, Any]:
    """
    Structure the story into chapters.
    Inserts chapter rows and book record into the database.

    Returns dict with chapters, book_id, book_title.
    """
    settings = get_settings()
    sb = get_supabase()

    # Get user_id from session
    session_data = (
        sb.table("sessions").select("user_id").eq("id", session_id).single().execute()
    )
    user_id = session_data.data.get("user_id") if session_data.data else None

    if settings.mock_mode:
        parsed = MOCK_BREAKER_OUTPUT.copy()
        logger.info("[MOCK] Breaker returning hardcoded 3-chapter structure")
    else:
        # Fetch the Bible: sentiment + entities + all context messages
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

        context_string = "\n\n".join(
            f"[{m['role'].upper()}]: {m['content']}" for m in messages
        )

        bible_text = f"--- FULL TRANSCRIPT ---\n{context_string}"
        if sentiment:
            bible_text += f"\n\n--- SENTIMENT ANALYSIS ---\n{json.dumps(sentiment.get('raw_output', sentiment), indent=2)}"
        if entities:
            bible_text += f"\n\n--- ENTITIES ---\n{json.dumps(entities.get('entities', []), indent=2)}"
            bible_text += f"\n\n--- RELATIONSHIPS ---\n{json.dumps(entities.get('relationships', []), indent=2)}"

        structured_response = await call_gemini_structured(
            BREAKER_SYSTEM_PROMPT,
            f"Here is the complete Bible for this story. Structure the optimal book:\n\n{bible_text}",
            response_schema=BreakerResult,
            max_tokens=4096,
        )
        parsed = structured_response.model_dump()

    chapters = parsed.get("chapters", [])

    # Insert chapters
    for chapter in chapters:
        sb.table("chapters").insert(
            {
                "session_id": session_id,
                "chapter_number": chapter["chapter_number"],
                "title": chapter["title"],
                "era": chapter.get("era", ""),
                "location": chapter.get("primary_location", ""),
                "transcript_segments": chapter.get("relevant_transcript_sections", []),
                "emotional_arc": chapter.get("emotional_arc", ""),
                "image_prompt": chapter.get("image_concept", ""),
                "status": "pending",
            }
        ).execute()

    # Insert book record
    book_result = (
        sb.table("books")
        .insert(
            {
                "session_id": session_id,
                "user_id": user_id,
                "cover_title": parsed.get("book_title", "My Story"),
                "author_name": "",
                "status": "generating",
            }
        )
        .select()
        .single()
        .execute()
    )
    book = book_result.data

    # Audit log
    await log_event(
        "breaker_complete",
        session_id=session_id,
        data={
            "book_title": parsed.get("book_title"),
            "total_chapters": parsed.get("total_chapters"),
        },
    )

    return {
        "chapters": chapters,
        "book_id": book["id"] if book else None,
        "book_title": parsed.get("book_title"),
    }
