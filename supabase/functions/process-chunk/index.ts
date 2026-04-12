import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * process-chunk: Phase 1 orchestrator.
 * Runs S-Agent + E-Agent in parallel, then Evaluator, then Clarification Agent.
 * CRITICAL: user ALWAYS gets a response even if agents fail.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let sessionId: string | undefined;
  let chunkId: string | undefined;

  try {
    const body = await req.json();
    sessionId = body.session_id;
    chunkId = body.chunk_id;

    if (!sessionId) {
      return new Response(JSON.stringify({ error: "session_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Update session status
    await supabase
      .from("sessions")
      .update({ status: "processing_chunk" })
      .eq("id", sessionId);

    await supabase.from("processing_log").insert({
      session_id: sessionId,
      chunk_id: chunkId,
      event: "process_chunk_start",
      data: {},
    });

    // Helper to call edge functions
    const callFunction = async (name: string, payload: Record<string, unknown>) => {
      const response = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`${name} failed: ${errText}`);
      }
      return response.json();
    };

    // 2. Run S-Agent + E-Agent in PARALLEL
    let sAgentResult = null;
    let eAgentResult = null;
    const agentErrors: string[] = [];

    const [sResult, eResult] = await Promise.allSettled([
      callFunction("run-s-agent", { session_id: sessionId }),
      callFunction("run-e-agent", { session_id: sessionId }),
    ]);

    if (sResult.status === "fulfilled") {
      sAgentResult = sResult.value;
    } else {
      agentErrors.push(`S-Agent: ${sResult.reason}`);
      console.error("S-Agent failed:", sResult.reason);
    }

    if (eResult.status === "fulfilled") {
      eAgentResult = eResult.value;
    } else {
      agentErrors.push(`E-Agent: ${eResult.reason}`);
      console.error("E-Agent failed:", eResult.reason);
    }

    // 3. Run Evaluator (only if at least one agent succeeded)
    let evaluatorResult = null;
    try {
      const evalResponse = await callFunction("run-evaluator", {
        session_id: sessionId,
      });
      evaluatorResult = evalResponse.result;
    } catch (err) {
      agentErrors.push(`Evaluator: ${err instanceof Error ? err.message : "Unknown"}`);
      console.error("Evaluator failed:", err);
    }

    // 4. Run Clarification Agent — ALWAYS runs, even on failure
    // If evaluator failed, default to acknowledge
    const fallbackResult = {
      decision: "acknowledge" as const,
      question_to_ask: null,
      new_characters_needing_photo: eAgentResult?.new_characters ?? [],
      gaps: [],
      overall_score: 0,
      catastrophic_gap: false,
    };

    try {
      await callFunction("run-clarification", {
        session_id: sessionId,
        evaluator_result: evaluatorResult ?? fallbackResult,
      });
    } catch (err) {
      console.error("Clarification agent failed:", err);

      // Absolute fallback: insert a generic warm message directly
      const { data: lastMsg } = await supabase
        .from("context_messages")
        .select("message_order")
        .eq("session_id", sessionId)
        .order("message_order", { ascending: false })
        .limit(1)
        .single();

      const nextOrder = (lastMsg?.message_order ?? 0) + 1;

      await supabase.from("context_messages").insert({
        session_id: sessionId,
        role: "assistant",
        content:
          "Thank you for sharing that. I'm listening closely — please continue whenever you're ready.",
        message_order: nextOrder,
      });

      await supabase
        .from("sessions")
        .update({ status: "awaiting_user" })
        .eq("id", sessionId);
    }

    // Log completion
    await supabase.from("processing_log").insert({
      session_id: sessionId,
      chunk_id: chunkId,
      event: "process_chunk_complete",
      data: {
        agent_errors: agentErrors,
        evaluator_score: evaluatorResult?.overall_score ?? null,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        evaluator_score: evaluatorResult?.overall_score ?? null,
        agent_errors: agentErrors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("process-chunk error:", err);

    // Even on catastrophic error, try to leave session in usable state
    if (sessionId) {
      await supabase
        .from("sessions")
        .update({ status: "awaiting_user" })
        .eq("id", sessionId)
        .catch(() => {});

      await supabase
        .from("processing_log")
        .insert({
          session_id: sessionId,
          chunk_id: chunkId,
          event: "process_chunk_error",
          data: { error: err instanceof Error ? err.message : "Unknown" },
        })
        .catch(() => {});
    }

    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
