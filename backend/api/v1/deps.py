"""
Shared API dependencies.
Authentication and authorization helpers used across all routes.
"""

import logging
import re
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status

from config import get_settings
from core.supabase_client import get_supabase

logger = logging.getLogger(__name__)

_UUID_PATTERN = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.I
)


async def get_current_user_id(
    authorization: Annotated[str | None, Header()] = None,
) -> str:
    """
    Extract and verify user_id from the Supabase JWT in the Authorization header.
    In development with MOCK_MODE, accepts a simple user ID or falls back to a mock user.
    """
    settings = get_settings()

    if not authorization:
        if settings.mock_mode:
            return "00000000-0000-0000-0000-000000000001"
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required",
        )

    # Extract token from "Bearer <token>"
    parts = authorization.split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization header format. Expected: Bearer <token>",
        )

    token = parts[1]

    # In mock mode, accept the token as-is if it looks like a UUID
    if settings.mock_mode:
        if _UUID_PATTERN.match(token):
            return token
        # Fall through to JWT verification

    # Verify the JWT using Supabase
    try:
        sb = get_supabase()
        user_response = sb.auth.get_user(token)
        if user_response and user_response.user:
            return user_response.user.id
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Auth verification failed: %s", exc)
        if settings.mock_mode:
            return "00000000-0000-0000-0000-000000000001"
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {exc}",
        )
