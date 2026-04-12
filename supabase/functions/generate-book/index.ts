import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * generate-book: Phase 2 orchestrator.
 * Breaker → Proxy Writer (sequential per chapter) → Picasso → Binder
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let sessionId: string | undefined;

  try {
    const body = await req.json();
    sessionId = body.session_id;

    if (!sessionId) {
      return new Response(JSON.stringify({ error: "session_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // 1. Update session to Phase 2
    await supabase
      .from("sessions")
      .update({ phase: 2, status: "generating_book" })
      .eq("id", sessionId);

    await supabase.from("processing_log").insert({
      session_id: sessionId,
      event: "generate_book_start",
      data: {},
    });

    // 2. Run Breaker Agent — structures the book
    const breakerResult = await callFunction("run-breaker", {
      session_id: sessionId,
    });

    // 3. Run Proxy Writer for each chapter sequentially
    const { data: chapters } = await supabase
      .from("chapters")
      .select("id, chapter_number")
      .eq("session_id", sessionId)
      .order("chapter_number", { ascending: true });

    if (chapters) {
      for (const chapter of chapters) {
        try {
          await callFunction("run-proxy-writer", {
            session_id: sessionId,
            chapter_id: chapter.id,
          });
        } catch (err) {
          console.error(
            `Proxy writer failed for chapter ${chapter.chapter_number}:`,
            err
          );
          // Continue with remaining chapters
        }
      }
    }

    // 4. Run Picasso Agent — generate all images
    try {
      await callFunction("run-picasso", { session_id: sessionId });
    } catch (err) {
      console.error("Picasso agent failed:", err);
      // Continue to binder — chapters without images still generate
    }

    // 5. Run Binder Agent — assemble final PDF
    const binderResult = await callFunction("run-binder", {
      session_id: sessionId,
    });

    // Log completion
    await supabase.from("processing_log").insert({
      session_id: sessionId,
      event: "generate_book_complete",
      data: {
        book_title: breakerResult.book_title,
        pdf_url: binderResult.pdf_url,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        book_title: breakerResult.book_title,
        pdf_url: binderResult.pdf_url,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("generate-book error:", err);

    // Mark session as failed
    if (sessionId) {
      await supabase
        .from("sessions")
        .update({
          status: "failed",
          error_message: err instanceof Error ? err.message : "Book generation failed",
        })
        .eq("id", sessionId)
        .catch(() => {});

      await supabase
        .from("processing_log")
        .insert({
          session_id: sessionId,
          event: "generate_book_error",
          data: {
            error: err instanceof Error ? err.message : "Unknown error",
          },
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
