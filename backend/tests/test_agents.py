"""
Unit tests verifying LLM Cache, JSON parsing resilience,
tenacity retries, and Pydantic structured output mappings.
"""

import pytest
from unittest.mock import MagicMock, patch
from pydantic import BaseModel, Field

from core.llm_cache import llm_cache
from core.gemini_client import parse_json_response, call_gemini, call_gemini_structured


# ─── Pydantic Test Model ──────────────────────────────────────────────────────

class SimpleSchema(BaseModel):
    name: str
    age: int


# ─── Tests ───────────────────────────────────────────────────────────────────

def test_llm_cache_exact_match():
    """Verify in-memory LLM cache lookup, hit, and clear workflow."""
    system = "You are a helpful assistant"
    prompt = "Translate Hello to French"
    schema_name = "TranslateSchema"

    # Cache should start empty (handled by conftest fixture autouse)
    assert llm_cache.get(system, prompt, schema_name) is None

    # Store a mock response
    mock_response = "Bonjour"
    llm_cache.set(system, prompt, mock_response, schema_name)

    # Check cache hit
    hit = llm_cache.get(system, prompt, schema_name)
    assert hit == mock_response

    # Check that changing prompt causes cache miss
    assert llm_cache.get(system, "Translate Hello to Spanish", schema_name) is None

    # Clear and verify empty
    llm_cache.clear()
    assert llm_cache.get(system, prompt, schema_name) is None


def test_parse_json_response():
    """Test stripping of markdown fences and extracting JSON boundaries."""
    # Test perfect json
    res = parse_json_response('{"status": "ok"}')
    assert res == {"status": "ok"}

    # Test markdown fences
    markdown_str = "```json\n{\n  \"status\": \"ok\"\n}\n```"
    res = parse_json_response(markdown_str)
    assert res == {"status": "ok"}

    # Test extra leading/trailing text
    text_surrounded = "Here is your response: {\"status\": \"ok\"} hope this helps!"
    res = parse_json_response(text_surrounded)
    assert res == {"status": "ok"}

    # Test invalid json
    with pytest.raises(ValueError):
        parse_json_response("invalid-string")


@pytest.mark.asyncio
async def test_tenacity_retry_resilience():
    """Test that call_gemini retries on transient exceptions and succeeds on subsequent attempts."""
    system = "system instruction"
    prompt = "user prompt"

    # We mock get_gemini_client and models.generate_content
    with patch("core.gemini_client.get_gemini_client") as mock_get_client:
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client

        # Emulate 2 failures followed by a success
        mock_response = MagicMock()
        mock_response.text = "Hello after retries"
        mock_response.usage_metadata = MagicMock(prompt_token_count=10, candidates_token_count=5)

        # tenacity retry_if_exception_type catches APIError and Exception
        mock_client.models.generate_content.side_effect = [
            Exception("Transient Rate limit exceeded"),
            Exception("Transient Service Unavailable"),
            mock_response
        ]

        result = await call_gemini(system, prompt)
        assert result == "Hello after retries"
        # Ensure it was called 3 times total
        assert mock_client.models.generate_content.call_count == 3


@pytest.mark.asyncio
async def test_call_gemini_structured():
    """Test calling Gemini with Pydantic structured output mapping."""
    system = "system instruction"
    prompt = "user prompt"

    with patch("core.gemini_client.get_gemini_client") as mock_get_client:
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client

        # Mock parsed response object returned by SDK
        mock_parsed = SimpleSchema(name="Lucknow", age=100)
        mock_response = MagicMock()
        mock_response.parsed = mock_parsed
        mock_response.usage_metadata = MagicMock(prompt_token_count=10, candidates_token_count=5)
        mock_client.models.generate_content.return_value = mock_response

        result = await call_gemini_structured(system, prompt, SimpleSchema)
        assert isinstance(result, SimpleSchema)
        assert result.name == "Lucknow"
        assert result.age == 100
