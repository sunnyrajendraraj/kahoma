"""
Transcription Service.
Handles audio transcription — mock transcripts or Whisper API.
Fires process-chunk after transcription completes.
"""

import logging
from typing import Any

from config import get_settings
from core.supabase_client import get_supabase
from core.audit import log_event

logger = logging.getLogger(__name__)

MOCK_TRANSCRIPTS = [
    "Meri dadi ka naam Savitri tha. Woh Lucknow ke purane shehar mein rehti thi, ek haveli mein jismein zindagi ki khushbu basi rehti thi. She was the strongest woman I've ever known. Har subah woh tulsi ke paas khadi hoti thi, aur mujhe lagta tha ki duniya mein sab kuch theek hai.",
    "Papa government job mein the, but unka asli pyaar music tha. Har raat ko woh harmonium bajate the, aur main unke paas baithkar sunta tha. Those evenings shaped everything I became. Maa kehti thi ki woh sapne zyada dekhte hain, lekin unhone mujhe sapne dekhna sikhaya.",
    "1992 mein hum Bombay shift hue. Nayi jagah, naye log, sab kuch alag. I remember the smell of the sea, the sound of local trains. Papa ko naya kaam mil gaya tha aur Maa ne school dhoondna shuru kiya. It was scary but exciting — like starting a completely new chapter of life.",
]


async def transcribe_chunk(chunk_id: str) -> dict[str, Any]:
    """
    Transcribe a voice chunk.
    In mock mode, returns pre-written Hindi-English transcript.
    After transcription, inserts into context_messages and triggers process-chunk.

    Returns dict with success and transcript.
    """
    settings = get_settings()
    sb = get_supabase()

    # 1. Fetch the voice chunk
    chunk_result = (
        sb.table("voice_chunks").select("*").eq("id", chunk_id).single().execute()
    )
    chunk = chunk_result.data
    if not chunk:
        raise ValueError(f"Chunk not found: {chunk_id}")

    if chunk.get("whisper_status") != "pending":
        raise ValueError(f"Chunk already processed: {chunk_id}")

    # 2. Update status to transcribing
    sb.table("voice_chunks").update({"whisper_status": "transcribing"}).eq(
        "id", chunk_id
    ).execute()

    try:
        if settings.mock_mode:
            chunk_order = chunk.get("chunk_order", 1)
            transcript = MOCK_TRANSCRIPTS[(chunk_order - 1) % len(MOCK_TRANSCRIPTS)]
            logger.info("[MOCK] Using mock transcript for chunk %s", chunk_id)
        else:
            # Real mode: Download audio and call Whisper
            import httpx

            audio_url = chunk.get("audio_url")
            if not audio_url:
                raise ValueError("No audio_url on chunk")

            signed_data = sb.storage.from_(settings.audio_bucket).create_signed_url(
                audio_url, 600
            )
            signed_url = signed_data.get("signedURL")
            if not signed_url:
                raise ValueError("Failed to get signed audio URL")

            # Download audio
            async with httpx.AsyncClient(timeout=120) as client:
                audio_response = await client.get(signed_url)
                audio_bytes = audio_response.content

            # Call OpenAI Whisper
            async with httpx.AsyncClient(timeout=120) as client:
                files = {"file": ("audio.m4a", audio_bytes, "audio/m4a")}
                data = {"model": "whisper-1"}
                whisper_response = await client.post(
                    "https://api.openai.com/v1/audio/transcriptions",
                    headers={"Authorization": f"Bearer {settings.openai_api_key}"},
                    files=files,
                    data=data,
                )
                if whisper_response.status_code != 200:
                    raise ValueError(f"Whisper API error: {whisper_response.text}")
                transcript = whisper_response.json()["text"]

        # 3. Update chunk with transcript
        sb.table("voice_chunks").update(
            {"transcript": transcript, "whisper_status": "done"}
        ).eq("id", chunk_id).execute()

        # 4. Get next message_order
        last_msg_result = (
            sb.table("context_messages")
            .select("message_order")
            .eq("session_id", chunk["session_id"])
            .order("message_order", desc=True)
            .limit(1)
            .maybe_single()
            .execute()
        )
        next_order = (
            last_msg_result.data.get("message_order", 0) if last_msg_result.data else 0
        ) + 1

        # 5. Insert user message into context_messages
        sb.table("context_messages").insert(
            {
                "session_id": chunk["session_id"],
                "role": "user",
                "content": transcript,
                "chunk_id": chunk_id,
                "message_order": next_order,
            }
        ).execute()

        # 6. Audit log
        await log_event(
            "transcription_complete",
            session_id=chunk["session_id"],
            chunk_id=chunk_id,
            data={"transcript_length": len(transcript)},
        )

        return {
            "success": True,
            "transcript": transcript,
            "session_id": chunk["session_id"],
        }

    except Exception as exc:
        # Mark as failed
        sb.table("voice_chunks").update({"whisper_status": "failed"}).eq(
            "id", chunk_id
        ).execute()
        logger.error("Transcription failed for chunk %s: %s", chunk_id, exc)
        raise
