"""
Processing Service.
Phase 1 orchestrator: runs S-Agent + E-Agent in parallel, then Evaluator, then Clarification.
Mirrors process-chunk edge function logic — user ALWAYS gets a response.
"""

import asyncio
import logging
from typing import Any

from core.supabase_client import get_supabase
from core.audit import log_event
from agents.s_agent import run_s_agent
from agents.e_agent import run_e_agent
from agents.evaluator import run_evaluator
from agents.clarification import run_clarification

logger = logging.getLogger(__name__)


async def process_chunk(session_id: str, chunk_id: str | None = None) -> dict[str, Any]:
    """
    Phase 1 orchestrator.
    1. Set session status to processing_chunk
    2. Run S-Agent + E-Agent in parallel
    3. Run Evaluator
    4. Run Clarification (ALWAYS — even if upstream agents fail)

    Returns dict with success, evaluator_score, and agent_errors.
    """
    sb = get_supabase()
    agent_errors: list[str] = []

    try:
        # 1. Update session status
        sb.table("sessions").update({"status": "processing_chunk"}).eq(
            "id", session_id
        ).execute()

        await log_event(
            "process_chunk_start",
            session_id=session_id,
            chunk_id=chunk_id,
            data={},
        )

        # 2. Run S-Agent + E-Agent in PARALLEL
        s_agent_result = None
        e_agent_result = None

        s_task = asyncio.create_task(_safe_run(run_s_agent, session_id, "S-Agent"))
        e_task = asyncio.create_task(_safe_run(run_e_agent, session_id, "E-Agent"))

        s_outcome, e_outcome = await asyncio.gather(s_task, e_task)

        if s_outcome["success"]:
            s_agent_result = s_outcome["result"]
        else:
            agent_errors.append(f"S-Agent: {s_outcome['error']}")

        if e_outcome["success"]:
            e_agent_result = e_outcome["result"]
        else:
            agent_errors.append(f"E-Agent: {e_outcome['error']}")

        # 3. Run Evaluator
        evaluator_result = None
        try:
            evaluator_result = await run_evaluator(session_id)
        except Exception as exc:
            agent_errors.append(f"Evaluator: {exc}")
            logger.error("Evaluator failed: %s", exc)

        # 4. Run Clarification Agent — ALWAYS runs
        fallback_result = {
            "decision": "acknowledge",
            "question_to_ask": None,
            "new_characters_needing_photo": (
                e_agent_result.get("new_characters", []) if e_agent_result else []
            ),
            "gaps": [],
            "overall_score": 0,
            "catastrophic_gap": False,
        }

        try:
            await run_clarification(
                session_id,
                evaluator_result if evaluator_result else fallback_result,
            )
        except Exception as exc:
            logger.error("Clarification agent failed: %s", exc)

            # Absolute fallback: insert a generic warm message directly
            _insert_fallback_message(sb, session_id)

        # Log completion
        await log_event(
            "process_chunk_complete",
            session_id=session_id,
            chunk_id=chunk_id,
            data={
                "agent_errors": agent_errors,
                "evaluator_score": (
                    evaluator_result.get("overall_score") if evaluator_result else None
                ),
            },
        )

        return {
            "success": True,
            "evaluator_score": (
                evaluator_result.get("overall_score") if evaluator_result else None
            ),
            "agent_errors": agent_errors,
        }

    except Exception as exc:
        logger.error("process_chunk error: %s", exc)

        # Even on catastrophic error, leave session in usable state
        try:
            sb.table("sessions").update({"status": "awaiting_user"}).eq(
                "id", session_id
            ).execute()
        except Exception:
            pass

        await log_event(
            "process_chunk_error",
            session_id=session_id,
            chunk_id=chunk_id,
            data={"error": str(exc)},
        )

        raise


async def _safe_run(fn, session_id: str, agent_name: str) -> dict[str, Any]:
    """Run an agent function safely, catching exceptions."""
    try:
        result = await fn(session_id)
        return {"success": True, "result": result}
    except Exception as exc:
        logger.error("%s failed: %s", agent_name, exc)
        return {"success": False, "error": str(exc), "result": None}


def _insert_fallback_message(sb, session_id: str) -> None:
    """Insert a generic warm message when all agents fail."""
    try:
        last_msg_result = (
            sb.table("context_messages")
            .select("message_order")
            .eq("session_id", session_id)
            .order("message_order", desc=True)
            .limit(1)
            .maybe_single()
            .execute()
        )
        next_order = (
            last_msg_result.data.get("message_order", 0) if last_msg_result.data else 0
        ) + 1

        sb.table("context_messages").insert(
            {
                "session_id": session_id,
                "role": "assistant",
                "content": "Thank you for sharing that. I'm listening closely — please continue whenever you're ready.",
                "message_order": next_order,
            }
        ).execute()

        sb.table("sessions").update({"status": "awaiting_user"}).eq(
            "id", session_id
        ).execute()
    except Exception as exc:
        logger.error("Fallback message insertion failed: %s", exc)
