"""Pydantic schemas for voice chunks."""

from datetime import datetime
from pydantic import BaseModel, Field


class ChunkUploadResponse(BaseModel):
    """Response after uploading a voice chunk."""
    success: bool = True
    chunk_id: str
    session_id: str
    chunk_order: int
    message: str = "Chunk uploaded. Transcription started in background."


class ChunkRecord(BaseModel):
    """Voice chunk database record."""
    id: str
    session_id: str
    user_id: str
    audio_url: str | None = None
    transcript: str | None = None
    chunk_order: int
    whisper_status: str = "pending"
    created_at: datetime | None = None
