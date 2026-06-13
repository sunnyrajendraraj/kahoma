"""Pydantic schemas for processing pipeline."""

from pydantic import BaseModel
from typing import Any


class ProcessChunkRequest(BaseModel):
    """Request to trigger Phase 1 processing on a chunk."""
    session_id: str
    chunk_id: str | None = None


class ProcessChunkResponse(BaseModel):
    """Response from Phase 1 processing."""
    success: bool = True
    evaluator_score: int | None = None
    agent_errors: list[str] = []


class AgentOutput(BaseModel):
    """Generic agent output wrapper."""
    success: bool = True
    output: dict[str, Any] | None = None
    error: str | None = None
