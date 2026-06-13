"""
Gemini AI client using the google-genai SDK.
Provides retries, caching, structured outputs, and token/latency observability.
"""

import json
import logging
import time
from functools import lru_cache
from typing import Any, Optional, Type, TypeVar

from google import genai
from google.genai import types
from google.genai.errors import APIError
from pydantic import BaseModel
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from config import get_settings
from core.llm_cache import llm_cache

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)


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
    """
    cleaned = text.strip()
    # Strip markdown code fences
    if cleaned.startswith("```"):
        first_newline = cleaned.find("\n")
        if first_newline != -1:
            cleaned = cleaned[first_newline + 1:]
        if cleaned.rstrip().endswith("```"):
            cleaned = cleaned.rstrip()[:-3].rstrip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(cleaned[start : end + 1])
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Failed to parse JSON from Gemini response: {cleaned[:200]}")


@retry(
    reraise=True,
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((APIError, Exception)),
)
def _generate_content_with_retry(
    client: genai.Client,
    model: str,
    contents: str,
    config: types.GenerateContentConfig,
) -> Any:
    """Execute Gemini call with exponential backoff retries on rate limits or API errors."""
    return client.models.generate_content(
        model=model,
        contents=contents,
        config=config,
    )


async def call_gemini(
    system_prompt: str,
    user_message: str,
    max_tokens: int = 2048,
) -> str:
    """
    Call Gemini with retries, exact-match caching, and latency/token observability.
    Returns raw text.
    """
    settings = get_settings()
    client = get_gemini_client()

    # 1. Cache Lookup
    cached = llm_cache.get(system_prompt, user_message)
    if cached is not None:
        logger.info("LLM Cache HIT (raw text response)")
        return cached

    # 2. Call API with Timer and Retry
    start_time = time.time()
    config = types.GenerateContentConfig(
        system_instruction=system_prompt,
        max_output_tokens=max_tokens,
        temperature=0.7,
    )

    try:
        response = _generate_content_with_retry(
            client, settings.gemini_model, user_message, config
        )
        duration = time.time() - start_time
        result_text = response.text

        if not result_text:
            raise ValueError("Gemini returned empty response")

        # 3. Extract and log token usage
        prompt_tokens = 0
        completion_tokens = 0
        if response.usage_metadata:
            prompt_tokens = response.usage_metadata.prompt_token_count or 0
            completion_tokens = response.usage_metadata.candidates_token_count or 0

        logger.info(
            "Gemini Call Success | Latency: %.2fs | Prompt Tokens: %d | Completion Tokens: %d | Model: %s",
            duration,
            prompt_tokens,
            completion_tokens,
            settings.gemini_model,
        )

        # 4. Cache Store
        llm_cache.set(system_prompt, user_message, result_text)
        return result_text

    except Exception as exc:
        logger.error("Gemini API call failed after retries: %s", exc)
        raise exc


async def call_gemini_structured(
    system_prompt: str,
    user_message: str,
    response_schema: Type[T],
    max_tokens: int = 2048,
) -> T:
    """
    Call Gemini with native Pydantic structured output, retries, and caching.
    Returns a Pydantic model instance of type T.
    """
    settings = get_settings()
    client = get_gemini_client()

    schema_name = response_schema.__name__

    # 1. Cache Lookup
    cached = llm_cache.get(system_prompt, user_message, schema_name)
    if cached is not None:
        logger.info("LLM Cache HIT (structured output schema: %s)", schema_name)
        return cached

    # 2. Call API with Timer and Retry
    start_time = time.time()
    config = types.GenerateContentConfig(
        system_instruction=system_prompt,
        max_output_tokens=max_tokens,
        temperature=0.7,
        response_mime_type="application/json",
        response_schema=response_schema,
    )

    try:
        response = _generate_content_with_retry(
            client, settings.gemini_model, user_message, config
        )
        duration = time.time() - start_time
        parsed_result = response.parsed

        if parsed_result is None:
            # Fallback to parsing from text if parser returns None
            raw_text = response.text or "{}"
            parsed_dict = parse_json_response(raw_text)
            parsed_result = response_schema.model_validate(parsed_dict)

        # 3. Extract and log token usage
        prompt_tokens = 0
        completion_tokens = 0
        if response.usage_metadata:
            prompt_tokens = response.usage_metadata.prompt_token_count or 0
            completion_tokens = response.usage_metadata.candidates_token_count or 0

        logger.info(
            "Gemini Structured Call Success | Schema: %s | Latency: %.2fs | Prompt Tokens: %d | Completion Tokens: %d | Model: %s",
            schema_name,
            duration,
            prompt_tokens,
            completion_tokens,
            settings.gemini_model,
        )

        # 4. Cache Store
        llm_cache.set(system_prompt, user_message, parsed_result, schema_name)
        return parsed_result

    except Exception as exc:
        logger.error("Gemini Structured API call failed: %s", exc)
        raise exc


async def call_gemini_json(
    system_prompt: str,
    user_message: str,
    max_tokens: int = 2048,
) -> dict[str, Any]:
    """
    Call Gemini and parse raw JSON from text.
    Maintained for backward compatibility.
    """
    raw_text = await call_gemini(system_prompt, user_message, max_tokens)
    return parse_json_response(raw_text)
