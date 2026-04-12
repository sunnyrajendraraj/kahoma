import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EVALUATOR_SYSTEM_PROMPT = `You are the Evaluator Agent for Kahoma.
Score story understanding 0-100:
- Entity completeness: 25pts
- Relationship clarity: 20pts
- Sentiment confidence: 20pts
- Perspective accuracy: 20pts
- Story coherence: 15pts
Threshold: 80. Below 80 = ask ONE specific question. Above 80 = acknowledge.
If a key character's identity is ambiguous in a story-changing way: always ask regardless of score.
Respond with ONLY valid JSON:
{
  "overall_score": integer,
  "dimension_scores": { "entity_completeness": int, "relationship_clarity": int, "sentiment_confidence": int, "perspective_accuracy": int, "story_coherence": int },
  "decision": "acknowledge"|"ask",
  "gaps": string[],
  "question_to_ask": string or null,
  "catastrophic_gap": boolean,
  "new_characters_needing_photo": string[]
}`;

function parseClaudeJSON(text: string): Record<string, unknown> {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[\w]*\n?/, "").replace(/\n?```$/, "");
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(cleaned.substring(start, end + 1));
    }
    throw new Error(`Failed to parse JSON: ${cleaned.substring(0, 200)}`);
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
      // MOCK: Alternating acknowledge/ask to test both flows
      const { data: msgCount } = await supabase
        .from("context_messages")
        .select("id", { count: "exact", head: true })
        .eq("session_id", session_id);

      const count = msgCount ?? 0;
      // First chunk: ask a question. Subsequent: acknowledge.
      const shouldAsk = count <= 2;

      parsed = shouldAsk
        ? {
            overall_score: 65,
            dimension_scores: { entity_completeness: 15, relationship_clarity: 10, sentiment_confidence: 15, perspective_accuracy: 12, story_coherence: 13 },
            decision: "ask",
            gaps: ["Relationship between Dadi Savitri and Papa is unclear"],
            question_to_ask: "Was Savitri your father's mother or your mother's mother?",
            catastrophic_gap: false,
            new_characters_needing_photo: ["dadi-savitri"],
          }
        : {
            overall_score: 85,
            dimension_scores: { entity_completeness: 22, relationship_clarity: 17, sentiment_confidence: 18, perspective_accuracy: 16, story_coherence: 12 },
            decision: "acknowledge",
            gaps: [],
            question_to_ask: null,
            catastrophic_gap: false,
            new_characters_needing_photo: [],
          };
      console.log("[MOCK] Evaluator returning", parsed.decision, "with score", parsed.overall_score);
    } else {
      // REAL: Fetch stores and call Claude
      const [messagesResult, sentimentResult, entityResult] = await Promise.all([
        supabase
          .from("context_messages")
          .select("role, content, message_order")
          .eq("session_id", session_id)
          .order("message_order", { ascending: true }),
        supabase
          .from("sentiment_store")
          .select("*")
          .eq("session_id", session_id)
          .single(),
        supabase
          .from("entity_store")
          .select("*")
          .eq("session_id", session_id)
          .single(),
      ]);

      const messages = messagesResult.data ?? [];
      const sentiment = sentimentResult.data;
      const entities = entityResult.data;

      const contextString = messages
        .map((m: { role: string; content: string }) =>
          `[${m.role.toUpperCase()}]: ${m.content}`
        )
        .join("\n\n");

      let userMessage = `Evaluate how well we understand this story:\n\n--- TRANSCRIPT ---\n${contextString}`;
      if (sentiment) {
        userMessage += `\n\n--- S-AGENT OUTPUT ---\n${JSON.stringify(sentiment.raw_output ?? sentiment, null, 2)}`;
      }
      if (entities) {
        userMessage += `\n\n--- E-AGENT OUTPUT ---\nEntities: ${JSON.stringify(entities.entities, null, 2)}\nRelationships: ${JSON.stringify(entities.relationships, null, 2)}`;
      }

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
          system: EVALUATOR_SYSTEM_PROMPT,
          messages: [{ role: "user", content: userMessage }],
        }),
      });

      if (!claudeResponse.ok) {
        const errText = await claudeResponse.text();
        throw new Error(`Claude API error: ${errText}`);
      }

      const claudeResult = await claudeResponse.json();
      parsed = parseClaudeJSON(claudeResult.content[0].text);
    }

    // Log
    await supabase.from("processing_log").insert({
      session_id,
      event: "evaluator_complete",
      data: { score: parsed.overall_score, decision: parsed.decision },
    });

    return new Response(
      JSON.stringify({ success: true, result: parsed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("run-evaluator error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
