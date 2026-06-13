"""
Processing API routes.
Direct Phase 1 processing trigger endpoint.
"""

import logging

from fastapi import APIRouter, BackgroundTasks, Depends

from api.v1.deps import get_current_user_id
from schemas.processing import ProcessChunkRequest, ProcessChunkResponse
from services.processing_service import process_chunk

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post(
    "/process-chunk",
    response_model=ProcessChunkResponse,
    status_code=202,
    summary="Trigger Phase 1 processing",
    description="Run the Phase 1 pipeline (S-Agent, E-Agent, Evaluator, Clarification) in the background.",
)
async def trigger_process_chunk(
    body: ProcessChunkRequest,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id),
):
    """
    Trigger Phase 1 processing for a session.
    Runs in background: S-Agent + E-Agent (parallel) → Evaluator → Clarification.
    """
    background_tasks.add_task(
        _background_process_chunk,
        body.session_id,
        body.chunk_id,
    )

    return ProcessChunkResponse(
        success=True,
        evaluator_score=None,
        agent_errors=[],
    )


async def _background_process_chunk(
    session_id: str, chunk_id: str | None
) -> None:
    """Background task wrapper for chunk processing."""
    try:
        await process_chunk(session_id, chunk_id)
    except Exception as exc:
        logger.error("Background process_chunk failed: %s", exc)
