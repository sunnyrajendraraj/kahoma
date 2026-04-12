import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const S_AGENT_SYSTEM_PROMPT = `You are the Sentiment Analysis Agent for Kahoma, a memoir platform.
Analyze the narrator's full transcript and extract the emotional landscape.
Respond with ONLY valid JSON, no other text:
{
  "sentiment": string,
  "tonality": string,
  "story_direction": string,
  "political_social_lens": string or null,
  "predicted_future": string,
  "confidence": integer (0-100),
  "key_emotional_moments": string[],
  "narrator_current_emotional_state": string
}
The narrator is the supreme authority on their own story. Never judge. Always understand.`;

/**
 * Parse JSON from Claude response, stripping markdown fences if present.
 */
function parseClaudeJSON(text: string): Record<string, unknown> {
  let cleaned = text.trim();
  // Strip markdown code fences
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[\w]*\n?/, "").replace(/\n?```$/, "");
  }
  // Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch {
    // Extract content between first { and last }
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(cleaned.substring(start, end + 1));
    }
    throw new Error(`Failed to parse JSON from Claude response: ${cleaned.substring(0, 200)}`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { session_id } = await req.json();
    if (!session_id) {
      return new Response(JSON.stringify({ error: "session_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
    const MOCK_MODE = Deno.env.get("MOCK_MODE") === "true";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let parsed: Record<string, unknown>;

    if (MOCK_MODE) {
      // MOCK: Return realistic sentiment analysis
      parsed = {
        sentiment: "nostalgic",
        tonality: "warm with undercurrents of loss",
        story_direction: "A family saga spanning generations, rooted in the narrator's deep love for their grandmother and the old haveli in Lucknow",
        political_social_lens: "Post-partition India, middle-class family navigating modernization",
        predicted_future: "The narrator will likely reveal a pivotal loss or separation that shaped their adult identity",
        confidence: 78,
        key_emotional_moments: [
          "The description of grandmother Savitri standing near tulsi every morning",
          "Father's harmonium evenings — a sacred ritual",
          "The family's move to Bombay — loss of the familiar",
        ],
        narrator_current_emotional_state: "Reflective and tender, revisiting memories with love and a slight ache",
      };
      console.log("[MOCK] S-Agent returning mock sentiment");
    } else {
      // Fetch all context messages
      const { data: messages, error: msgError } = await supabase
        .from("context_messages")
        .select("role, content, message_order")
        .eq("session_id", session_id)
        .order("message_order", { ascending: true });

      if (msgError) throw new Error(`Failed to fetch messages: ${msgError.message}`);

      const contextString = (messages ?? [])
        .map((m: { role: string; content: string }) =>
          `[${m.role.toUpperCase()}]: ${m.content}`
        )
        .join("\n\n");

      const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5-20250514",
          max_tokens: 1024,
          system: S_AGENT_SYSTEM_PROMPT,
          messages: [{ role: "user", content: `Analyze this story transcript:\n\n${contextString}` }],
        }),
      });

      if (!claudeResponse.ok) {
        const errText = await claudeResponse.text();
        throw new Error(`Claude API error: ${errText}`);
      }

      const claudeResult = await claudeResponse.json();
      parsed = parseClaudeJSON(claudeResult.content[0].text);
    }

    // 4. UPSERT to sentiment_store
    const { error: upsertError } = await supabase
      .from("sentiment_store")
      .upsert(
        {
          session_id,
          sentiment: parsed.sentiment as string,
          tonality: parsed.tonality as string,
          story_direction: parsed.story_direction as string,
          predicted_future: parsed.predicted_future as string,
          confidence_score: parsed.confidence as number,
          raw_output: parsed,
        },
        { onConflict: "session_id" }
      );

    if (upsertError) throw new Error(`Upsert failed: ${upsertError.message}`);

    // Log
    await supabase.from("processing_log").insert({
      session_id,
      event: "s_agent_complete",
      data: { confidence: parsed.confidence },
    });

    return new Response(
      JSON.stringify({ success: true, output: parsed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("run-s-agent error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
