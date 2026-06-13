"""
Chunks API routes.
POST /chunks/upload — multipart audio upload → background transcription
"""

import logging
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, UploadFile, BackgroundTasks, HTTPException

from api.v1.deps import get_current_user_id
from config import get_settings
from core.supabase_client import get_supabase
from schemas.chunk import ChunkUploadResponse
from services.transcription_service import transcribe_chunk
from services.processing_service import process_chunk

logger = logging.getLogger(__name__)
router = APIRouter()


async def _background_transcribe_and_process(chunk_id: str, session_id: str) -> None:
    """Background task: transcribe audio then run Phase 1 processing."""
    try:
        result = await transcribe_chunk(chunk_id)
        if result.get("success"):
            await process_chunk(session_id, chunk_id)
    except Exception as exc:
        logger.error("Background transcription/processing failed: %s", exc)


@router.post(
    "/upload",
    response_model=ChunkUploadResponse,
    status_code=202,
    summary="Upload a voice chunk",
    description="Upload a multipart audio file. Returns 202 immediately. Transcription and processing happen in the background.",
)
async def upload_chunk(
    background_tasks: BackgroundTasks,
    session_id: str = Form(...),
    chunk_order: int = Form(...),
    audio: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
):
    """
    Upload a voice recording chunk.
    1. Upload audio to Supabase Storage
    2. Insert voice_chunk record
    3. Start background transcription + processing
    """
    settings = get_settings()
    sb = get_supabase()

    # Verify session ownership
    session_result = (
        sb.table("sessions")
        .select("id, user_id")
        .eq("id", session_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not session_result.data:
        raise HTTPException(status_code=404, detail="Session not found or not owned by user")

    # Read audio file
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file")

    # Generate storage path
    file_ext = audio.filename.split(".")[-1] if audio.filename and "." in audio.filename else "m4a"
    storage_path = f"{user_id}/{session_id}/chunk_{chunk_order}.{file_ext}"

    # Upload to Supabase Storage
    try:
        sb.storage.from_(settings.audio_bucket).upload(
            storage_path,
            audio_bytes,
            {"content-type": audio.content_type or "audio/m4a", "upsert": "true"},
        )
    except Exception as exc:
        logger.error("Audio upload failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Audio upload failed: {exc}")

    # Insert voice_chunk record
    chunk_id = str(uuid.uuid4())
    try:
        sb.table("voice_chunks").insert(
            {
                "id": chunk_id,
                "session_id": session_id,
                "user_id": user_id,
                "audio_url": storage_path,
                "chunk_order": chunk_order,
                "whisper_status": "pending",
            }
        ).execute()
    except Exception as exc:
        logger.error("Chunk record insertion failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")

    # Start background processing (fire-and-forget)
    background_tasks.add_task(_background_transcribe_and_process, chunk_id, session_id)

    return ChunkUploadResponse(
        chunk_id=chunk_id,
        session_id=session_id,
        chunk_order=chunk_order,
    )
