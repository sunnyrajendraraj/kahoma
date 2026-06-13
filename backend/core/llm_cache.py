"""
Kahoma Backend — LLM Cache.
Provides exact-match in-memory caching for LLM generation requests to optimize costs and latency.
"""

import hashlib
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)


class LLMCache:
    """Singleton in-memory cache for LLM responses."""

    _instance: Optional["LLMCache"] = None
    _cache: dict[str, Any]

    def __new__(cls, *args: Any, **kwargs: Any) -> "LLMCache":
        if not cls._instance:
            cls._instance = super().__new__(cls, *args, **kwargs)
            cls._instance._cache = {}
        return cls._instance

    def _generate_key(
        self,
        system_instruction: Optional[str],
        contents: str,
        response_schema_name: Optional[str] = None,
    ) -> str:
        """Generate a SHA-256 key from LLM request parameters."""
        hasher = hashlib.sha256()
        hasher.update((system_instruction or "").encode("utf-8"))
        hasher.update(contents.encode("utf-8"))
        if response_schema_name:
            hasher.update(response_schema_name.encode("utf-8"))
        return hasher.hexdigest()

    def get(
        self,
        system_instruction: Optional[str],
        contents: str,
        response_schema_name: Optional[str] = None,
    ) -> Optional[Any]:
        """Lookup a cached response. Returns None if miss."""
        key = self._generate_key(system_instruction, contents, response_schema_name)
        if key in self._cache:
            logger.info("LLM Cache HIT for prompt hash: %s", key[:8])
            return self._cache[key]
        logger.debug("LLM Cache MISS for prompt hash: %s", key[:8])
        return None

    def set(
        self,
        system_instruction: Optional[str],
        contents: str,
        response: Any,
        response_schema_name: Optional[str] = None,
    ) -> None:
        """Store a response in the cache."""
        key = self._generate_key(system_instruction, contents, response_schema_name)
        self._cache[key] = response
        logger.debug("LLM Cache STORED for prompt hash: %s", key[:8])

    def clear(self) -> None:
        """Clear all entries in the cache (useful for testing)."""
        self._cache.clear()
        logger.info("LLM Cache cleared")


# Global singleton instance
llm_cache = LLMCache()
