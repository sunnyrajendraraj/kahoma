"""
Supabase client initialization.
Uses the service_role key to bypass RLS — all ownership checks
are done explicitly in Python code.
"""

import logging
from functools import lru_cache

from supabase import create_client, Client

from config import get_settings

logger = logging.getLogger(__name__)


@lru_cache()
def get_supabase_client() -> Client:
    """Return a cached Supabase client using the service role key."""
    settings = get_settings()
    client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    logger.info("Supabase client initialized for %s", settings.supabase_url)
    return client


def get_supabase() -> Client:
    """Dependency-injectable Supabase client accessor."""
    return get_supabase_client()
