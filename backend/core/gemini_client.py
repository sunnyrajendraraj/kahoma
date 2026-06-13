"""
Gemini AI client using the google-genai SDK.
Provides a thin wrapper for all AI calls in the pipeline.
"""

import json
import logging
from functools import lru_cache
from typing import Any

from google import genai
from google.genai import types

from config import get_settings

logger = logging.getLogger(__name__)


@lru_cache()
def get_gemini_client() -> genai.Client:
    """Return a cached Gemini client."""
    settings = get_settings()
    client = genai.Client(api_key=settings.gemini_api_key)
    logger.info("Gemini client initialized")
    return client


def parse_json_response(text: str) -> dict[str, Any]:
    """
    Parse JSON from Gemini response, stripping markdown fences if present.
    Mirrors the parseClaudeJSON logic from the Deno edge functions.
    """
    cleaned = text.strip()
    # Strip markdown code fences
    if cleaned.startswith("```"):
        # Remove opening fence (```json or ```)
        first_newline = cleaned.find("\n")
        if first_newline != -1:
            cleaned = cleaned[first_newline + 1:]
        # Remove closing fence
        if cleaned.rstrip().endswith("```"):
            cleaned = cleaned.rstrip()[:-3].rstrip()

    # Try direct parse
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Extract content between first { and last }
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(cleaned[start : end + 1])
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Failed to parse JSON from Gemini response: {cleaned[:200]}")


async def call_gemini(
    system_prompt: str,
    user_message: str,
    max_tokens: int = 2048,
) -> str:
    """
    Call Gemini with a system prompt and user message.
    Returns the raw text response.
    """
    settings = get_settings()
    client = get_gemini_client()

    response = client.models.generate_content(
        model=settings.gemini_model,
        contents=user_message,
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            max_output_tokens=max_tokens,
            temperature=0.7,
        ),
    )

    result_text = response.text
    if not result_text:
        raise ValueError("Gemini returned empty response")

    logger.debug("Gemini response length: %d chars", len(result_text))
    return result_text


async def call_gemini_json(
    system_prompt: str,
    user_message: str,
    max_tokens: int = 2048,
) -> dict[str, Any]:
    """
    Call Gemini and parse the JSON response.
    Combines call_gemini + parse_json_response.
    """
    raw_text = await call_gemini(system_prompt, user_message, max_tokens)
    return parse_json_response(raw_text)
