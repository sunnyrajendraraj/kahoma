"""Pydantic schemas for sessions."""

from datetime import datetime
from pydantic import BaseModel, Field


class SessionCreate(BaseModel):
    """Request to create a new session."""
    title: str = "My Story"


class SessionResponse(BaseModel):
    """Session data returned to the client."""
    id: str
    user_id: str
    title: str = "My Story"
    status: str = "recording"
    phase: int = 1
    error_message: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class SessionListResponse(BaseModel):
    """Paginated list of sessions."""
    sessions: list[SessionResponse]
    count: int


class ContextMessage(BaseModel):
    """A single context message (user transcript or AI response)."""
    id: str
    session_id: str
    role: str  # "user" or "assistant"
    content: str
    chunk_id: str | None = None
    message_order: int | None = None
    created_at: datetime | None = None
