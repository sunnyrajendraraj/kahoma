import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROXY_WRITER_SYSTEM_PROMPT = `You are the Proxy Writer — a literary author with 40 years experience.
RULES:
1. PRESERVE THE NARRATOR'S PERSPECTIVE ABSOLUTELY.
   If they say someone was cruel — they are cruel in your prose.
2. First person unless narrator told story in third person.
3. Vivid sensory details. Reconstruct what the air smelled like.
4. Show, don't tell.
5. 400-700 words. Flowing prose. No bullet points.
6. Open with a specific sensory moment. Close with quiet resonance.
7. Use Hindi terms naturally where appropriate.
8. DO NOT sanitize. DO NOT add false hope. DO NOT change what narrator felt.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { session_id, chapter_id } = await req.json();
    if (!session_id || !chapter_id) {
      return new Response(
        JSON.stringify({ error: "session_id and chapter_id required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch chapter
    const { data: chapter, error: chapterError } = await supabase
      .from("chapters")
      .select("*")
      .eq("id", chapter_id)
      .single();

    if (chapterError || !chapter) {
      throw new Error("Chapter not found");
    }

    // Fetch characters for this session
    const { data: characters } = await supabase
      .from("characters")
      .select("name, relationship_to_narrator, birth_era")
      .eq("session_id", session_id);

    // Fetch sentiment for tone
    const { data: sentiment } = await supabase
      .from("sentiment_store")
      .select("sentiment, tonality")
      .eq("session_id", session_id)
      .single();

    // Build user message
    const transcriptSections = (chapter.transcript_segments as string[]) ?? [];
    const characterInfo = (characters ?? [])
      .map(
        (c: { name: string; relationship_to_narrator: string; birth_era: string }) =>
          `${c.name} — ${c.relationship_to_narrator} (era: ${c.birth_era || "unknown"})`
      )
      .join("\n");

    const userMessage = `Chapter: ${chapter.title}
Era: ${chapter.era || "unspecified"}, ${chapter.location || "unspecified"}
Emotional arc: ${chapter.emotional_arc || ""}
Overall story tone: ${sentiment?.sentiment || "complex"}, ${sentiment?.tonality || "reflective"}

Characters:
${characterInfo || "No specific characters identified"}

Raw story fragments:
${transcriptSections.join("\n\n")}`;

    // Call Claude
    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250514",
        max_tokens: 2048,
        system: PROXY_WRITER_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!claudeResponse.ok) {
      const errText = await claudeResponse.text();
      throw new Error(`Claude API error: ${errText}`);
    }

    const claudeResult = await claudeResponse.json();
    const writtenContent = claudeResult.content[0].text;
    const wordCount = writtenContent.split(/\s+/).length;

    // Update chapter
    await supabase
      .from("chapters")
      .update({
        content_written: writtenContent,
        status: "written",
      })
      .eq("id", chapter_id);

    // Log
    await supabase.from("processing_log").insert({
      session_id,
      event: "proxy_writer_complete",
      data: { chapter_id, chapter_title: chapter.title, word_count: wordCount },
    });

    return new Response(
      JSON.stringify({ success: true, chapter_id, word_count: wordCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("run-proxy-writer error:", err);
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
