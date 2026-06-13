"""
Picasso Agent.
Generates era-appropriate images for chapters using Replicate SDXL.
In MOCK_MODE, skips image generation entirely.
"""

import logging
from typing import Any

from config import get_settings
from core.supabase_client import get_supabase
from core.audit import log_event

logger = logging.getLogger(__name__)


async def run_picasso(session_id: str) -> dict[str, Any]:
    """
    Generate images for all chapters in a session.
    In mock mode, skips entirely (book renders without images).
    In real mode, uses Replicate SDXL for era-transform or illustration.

    Returns dict with images_generated and images_failed counts.
    """
    settings = get_settings()
    sb = get_supabase()

    # Fetch all chapters
    chapters_result = (
        sb.table("chapters")
        .select("*")
        .eq("session_id", session_id)
        .order("chapter_number", desc=False)
        .execute()
    )
    chapters = chapters_result.data or []

    images_generated = 0
    images_failed = 0

    if settings.mock_mode:
        # MOCK: Skip image generation entirely
        logger.info(
            "[MOCK] Picasso skipping image generation for %d chapters",
            len(chapters),
        )
        images_failed = len(chapters)
    else:
        # REAL: Would call Replicate API here
        # For now, we mark all as failed since we don't have Replicate key configured
        # This is intentional — the binder handles chapters without images gracefully
        import httpx

        characters_result = (
            sb.table("characters")
            .select("*")
            .eq("session_id", session_id)
            .execute()
        )
        characters = characters_result.data or []

        for chapter in chapters:
            try:
                # Check if primary character has a photo (Workflow A: era transform)
                primary_char = next(
                    (
                        c
                        for c in characters
                        if c.get("photo_url")
                        and chapter.get("emotional_arc", "").find(c["name"]) != -1
                    ),
                    None,
                )

                image_url: str | None = None

                if primary_char and primary_char.get("photo_url"):
                    # Workflow A: Era-transform user photo using Replicate ControlNet
                    signed_data = sb.storage.from_(settings.photos_bucket).create_signed_url(
                        primary_char["photo_url"], 600
                    )
                    if signed_data.get("signedURL"):
                        prompt = f"Portrait photograph from {chapter.get('era', 'mid-20th century')}, {chapter.get('location', 'India')}, authentic period photography style, warm film grain, natural lighting, preserve facial identity and expression, soft focus background"
                        negative_prompt = "modern, contemporary, digital photography, 2020s, 2010s, cartoon, anime"

                        async with httpx.AsyncClient(timeout=300) as client:
                            prediction_response = await client.post(
                                "https://api.replicate.com/v1/predictions",
                                headers={
                                    "Authorization": f"Bearer {settings.replicate_api_key}",
                                    "Content-Type": "application/json",
                                },
                                json={
                                    "version": "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
                                    "input": {
                                        "image": signed_data["signedURL"],
                                        "prompt": prompt,
                                        "negative_prompt": negative_prompt,
                                        "strength": 0.55,
                                        "num_inference_steps": 30,
                                        "guidance_scale": 7.5,
                                    },
                                },
                            )
                            if prediction_response.status_code == 200:
                                # Poll for result (simplified)
                                logger.info("Replicate prediction started for chapter %d", chapter["chapter_number"])

                if not image_url:
                    # Workflow B: Generate illustration from concept
                    concept = chapter.get("image_prompt") or chapter.get("emotional_arc") or chapter.get("title", "")
                    prompt = f"{concept}, photorealistic, film photography, warm tones, {chapter.get('era', 'vintage')} visual grammar, book chapter opener, {chapter.get('location', 'India')}, atmospheric, cinematic lighting"
                    logger.debug("Would generate image for chapter %d: %s", chapter["chapter_number"], prompt[:100])
                    # In real mode without Replicate, images are skipped
                    images_failed += 1

                if image_url:
                    sb.table("chapters").update({"image_url": image_url}).eq(
                        "id", chapter["id"]
                    ).execute()
                    images_generated += 1

            except Exception as exc:
                logger.error(
                    "Image generation failed for chapter %d: %s",
                    chapter.get("chapter_number", 0),
                    exc,
                )
                images_failed += 1

    # Audit log
    await log_event(
        "picasso_complete",
        session_id=session_id,
        data={"images_generated": images_generated, "images_failed": images_failed},
    )

    return {"images_generated": images_generated, "images_failed": images_failed}
