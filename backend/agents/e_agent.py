"""
E-Agent (Entity Extraction Agent).
Extracts characters, places, events, relationships — preserving the narrator's perspective.
Uses native Pydantic structured outputs.
"""

import logging
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field

from config import get_settings
from core.gemini_client import call_gemini_structured
from core.supabase_client import get_supabase
from core.audit import log_event

logger = logging.getLogger(__name__)


class Entity(BaseModel):
    """Pydantic model representing an extracted entity."""

    entity_id: str = Field(description="Slug or identifier for the entity, e.g. 'dadi-savitri'")
    type: Literal["character", "event", "place", "era", "object"] = Field(description="The type of entity")
    name: str = Field(description="Display name of the entity")
    user_perspective: str = Field(description="Narration-focused description of what this entity means to the narrator")
    emotional_charge: Literal["positive", "negative", "complex", "neutral"] = Field(description="Narrator's emotional association with the entity")
    attributes: Dict[str, Any] = Field(default_factory=dict, description="Metadata attributes like birth_era, city, occupation")
    mentioned_in_chunks: List[int] = Field(default_factory=list, description="Array of chunk indices where mentioned")


class Relationship(BaseModel):
    """Pydantic model representing a relationship between two entities."""

    from_: str = Field(alias="from", description="entity_id of source entity")
    to: str = Field(description="entity_id of target entity")
    type: str = Field(description="Type of relationship, e.g. 'mother-son'")
    narrator_framing: str = Field(description="Narrator's specific perspective on the relationship")

    model_config = {
        "populate_by_name": True,
    }


class EntityExtractionResult(BaseModel):
    """Pydantic model for E-Agent entity extraction output."""

    entities: List[Entity] = Field(description="List of all extracted entities")
    relationships: List[Relationship] = Field(description="List of all relationships between entities")
    new_characters_this_chunk: List[str] = Field(description="List of entity_ids of newly identified characters in this chunk")


E_AGENT_SYSTEM_PROMPT = """You are the Entity Extraction Agent for Kahoma.
Extract ALL entities and capture THE NARRATOR'S PERSPECTIVE on each — not objective reality.
A grandmother can be loving OR cruel. A success can feel like failure.
Always capture what entities MEAN to THIS narrator.
Merge with existing entities — enrich, never duplicate."""

MOCK_ENTITIES: dict[str, Any] = {
    "entities": [
        {
            "entity_id": "dadi-savitri",
            "type": "character",
            "name": "Dadi Savitri",
            "user_perspective": "The anchor of the family. A woman of quiet, immovable strength who made the narrator feel that the world was safe.",
            "emotional_charge": "positive",
            "attributes": {"birth_era": "1930s", "city": "Lucknow"},
            "mentioned_in_chunks": [1],
        },
        {
            "entity_id": "papa",
            "type": "character",
            "name": "Papa",
            "user_perspective": "A government servant by day but a dreamer at heart. His harmonium evenings were sacred — he taught the narrator to dream beyond the practical.",
            "emotional_charge": "complex",
            "attributes": {"occupation": "government job", "passion": "music"},
            "mentioned_in_chunks": [2],
        },
        {
            "entity_id": "maa",
            "type": "character",
            "name": "Maa",
            "user_perspective": "The practical one. Slightly disapproving of Papa's dreaming but deeply caring. She held the family together during the Bombay move.",
            "emotional_charge": "positive",
            "attributes": {},
            "mentioned_in_chunks": [2, 3],
        },
        {
            "entity_id": "haveli-lucknow",
            "type": "place",
            "name": "The Haveli in Lucknow",
            "user_perspective": "Home. The smell of life. A place that meant safety and belonging.",
            "emotional_charge": "positive",
            "attributes": {"city": "Lucknow", "type": "ancestral home"},
            "mentioned_in_chunks": [1],
        },
        {
            "entity_id": "bombay-move",
            "type": "event",
            "name": "The Move to Bombay",
            "user_perspective": "A rupture. Exciting but terrifying. Leaving behind everything familiar for the unknown.",
            "emotional_charge": "complex",
            "attributes": {"year": "1992"},
            "mentioned_in_chunks": [3],
        },
    ],
    "relationships": [
        {
            "from": "dadi-savitri",
            "to": "papa",
            "type": "mother-son",
            "narrator_framing": "Dadi raised Papa with values but also expectations he quietly rebelled against through music",
        },
        {
            "from": "papa",
            "to": "maa",
            "type": "husband-wife",
            "narrator_framing": "A loving but contrasting pair — he the dreamer, she the realist",
        },
    ],
    "new_characters_this_chunk": ["dadi-savitri", "papa", "maa"],
}


async def run_e_agent(session_id: str) -> dict[str, Any]:
    """
    Run entity extraction on a session's transcript.
    UPSERTs the result into entity_store.
    Inserts new characters into the characters table.

    Returns the parsed entity output and list of new character names.
    """
    settings = get_settings()
    sb = get_supabase()

    if settings.mock_mode:
        parsed = MOCK_ENTITIES.copy()
        logger.info("[MOCK] E-Agent returning mock entities")
    else:
        # Fetch context messages and existing entities
        messages_result = (
            sb.table("context_messages")
            .select("role, content, message_order")
            .eq("session_id", session_id)
            .order("message_order", desc=False)
            .execute()
        )
        messages = messages_result.data or []

        entity_result = (
            sb.table("entity_store")
            .select("*")
            .eq("session_id", session_id)
            .maybe_single()
            .execute()
        )
        existing_entities = entity_result.data

        context_string = "\n\n".join(
            f"[{m['role'].upper()}]: {m['content']}" for m in messages
        )

        user_message = f"Analyze this story transcript and extract all entities:\n\n{context_string}"
        if existing_entities:
            import json

            user_message += f"\n\n--- EXISTING ENTITIES (enrich these, don't duplicate) ---\n{json.dumps(existing_entities.get('entities', []), indent=2)}"
            user_message += f"\n\n--- EXISTING RELATIONSHIPS ---\n{json.dumps(existing_entities.get('relationships', []), indent=2)}"

        structured_response = await call_gemini_structured(
            E_AGENT_SYSTEM_PROMPT,
            user_message,
            response_schema=EntityExtractionResult,
            max_tokens=2048,
        )
        # We model_dump by_alias=True to preserve the "from" name in output JSON
        parsed = structured_response.model_dump(by_alias=True)

    # UPSERT entity_store
    sb.table("entity_store").upsert(
        {
            "session_id": session_id,
            "entities": parsed.get("entities", []),
            "relationships": parsed.get("relationships", []),
            "raw_output": parsed,
        },
        on_conflict="session_id",
    ).execute()

    # Insert new characters
    new_character_ids = parsed.get("new_characters_this_chunk", [])
    entities = parsed.get("entities", [])
    new_characters: list[str] = []

    for char_id in new_character_ids:
        entity = next(
            (e for e in entities if e.get("entity_id") == char_id and e.get("type") == "character"),
            None,
        )
        if entity:
            # Check if character already exists
            existing = (
                sb.table("characters")
                .select("id")
                .eq("session_id", session_id)
                .eq("name", entity["name"])
                .maybe_single()
                .execute()
            )
            if not existing.data:
                sb.table("characters").insert(
                    {
                        "session_id": session_id,
                        "name": entity["name"],
                        "relationship_to_narrator": entity.get("user_perspective", ""),
                        "birth_era": entity.get("attributes", {}).get("birth_era", ""),
                        "photo_requested": False,
                    }
                ).execute()
                new_characters.append(entity["name"])

    # Audit log
    await log_event(
        "e_agent_complete",
        session_id=session_id,
        data={"entity_count": len(entities), "new_characters": new_characters},
    )

    return {"output": parsed, "new_characters": new_characters}
