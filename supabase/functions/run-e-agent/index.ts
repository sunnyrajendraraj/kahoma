import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const E_AGENT_SYSTEM_PROMPT = `You are the Entity Extraction Agent for Kahoma.
Extract ALL entities and capture THE NARRATOR'S PERSPECTIVE on each — not objective reality.
A grandmother can be loving OR cruel. A success can feel like failure.
Always capture what entities MEAN to THIS narrator.
Respond with ONLY valid JSON:
{
  "entities": [{
    "entity_id": string (slug e.g. "dadi-1"),
    "type": "character"|"event"|"place"|"era"|"object",
    "name": string,
    "user_perspective": string (MOST IMPORTANT FIELD),
    "emotional_charge": "positive"|"negative"|"complex"|"neutral",
    "attributes": {},
    "mentioned_in_chunks": number[]
  }],
  "relationships": [{
    "from": string,
    "to": string,
    "type": string,
    "narrator_framing": string
  }],
  "new_characters_this_chunk": string[]
}
Merge with existing entities — enrich, never duplicate.`;

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
      // MOCK: Return realistic entity extraction
      parsed = {
        entities: [
          { entity_id: "dadi-savitri", type: "character", name: "Dadi Savitri", user_perspective: "The anchor of the family. A woman of quiet, immovable strength who made the narrator feel that the world was safe.", emotional_charge: "positive", attributes: { birth_era: "1930s", city: "Lucknow" }, mentioned_in_chunks: [1] },
          { entity_id: "papa", type: "character", name: "Papa", user_perspective: "A government servant by day but a dreamer at heart. His harmonium evenings were sacred — he taught the narrator to dream beyond the practical.", emotional_charge: "complex", attributes: { occupation: "government job", passion: "music" }, mentioned_in_chunks: [2] },
          { entity_id: "maa", type: "character", name: "Maa", user_perspective: "The practical one. Slightly disapproving of Papa's dreaming but deeply caring. She held the family together during the Bombay move.", emotional_charge: "positive", attributes: {}, mentioned_in_chunks: [2, 3] },
          { entity_id: "haveli-lucknow", type: "place", name: "The Haveli in Lucknow", user_perspective: "Home. The smell of life. A place that meant safety and belonging.", emotional_charge: "positive", attributes: { city: "Lucknow", type: "ancestral home" }, mentioned_in_chunks: [1] },
          { entity_id: "bombay-move", type: "event", name: "The Move to Bombay", user_perspective: "A rupture. Exciting but terrifying. Leaving behind everything familiar for the unknown.", emotional_charge: "complex", attributes: { year: "1992" }, mentioned_in_chunks: [3] },
        ],
        relationships: [
          { from: "dadi-savitri", to: "papa", type: "mother-son", narrator_framing: "Dadi raised Papa with values but also expectations he quietly rebelled against through music" },
          { from: "papa", to: "maa", type: "husband-wife", narrator_framing: "A loving but contrasting pair — he the dreamer, she the realist" },
        ],
        new_characters_this_chunk: ["dadi-savitri", "papa", "maa"],
      };
      console.log("[MOCK] E-Agent returning mock entities");
    } else {
      // REAL: Fetch context + call Claude
      const [messagesResult, entityResult] = await Promise.all([
        supabase
          .from("context_messages")
          .select("role, content, message_order")
          .eq("session_id", session_id)
          .order("message_order", { ascending: true }),
        supabase
          .from("entity_store")
          .select("*")
          .eq("session_id", session_id)
          .single(),
      ]);

      const messages = messagesResult.data ?? [];
      const existingEntities = entityResult.data;

      const contextString = messages
        .map((m: { role: string; content: string }) =>
          `[${m.role.toUpperCase()}]: ${m.content}`
        )
        .join("\n\n");

      let userMessage = `Analyze this story transcript and extract all entities:\n\n${contextString}`;
      if (existingEntities) {
        userMessage += `\n\n--- EXISTING ENTITIES (enrich these, don't duplicate) ---\n${JSON.stringify(existingEntities.entities, null, 2)}`;
        userMessage += `\n\n--- EXISTING RELATIONSHIPS ---\n${JSON.stringify(existingEntities.relationships, null, 2)}`;
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
          max_tokens: 2048,
          system: E_AGENT_SYSTEM_PROMPT,
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

    // UPSERT entity_store
    const { error: upsertError } = await supabase
      .from("entity_store")
      .upsert(
        {
          session_id,
          entities: parsed.entities,
          relationships: parsed.relationships,
          raw_output: parsed,
        },
        { onConflict: "session_id" }
      );

    if (upsertError) throw new Error(`Upsert failed: ${upsertError.message}`);

    // 4. Insert new characters
    const newCharacterIds = (parsed.new_characters_this_chunk as string[]) ?? [];
    const entities = (parsed.entities as Array<{
      entity_id: string;
      type: string;
      name: string;
      user_perspective: string;
      attributes?: Record<string, unknown>;
    }>) ?? [];

    const newCharacters: string[] = [];
    for (const charId of newCharacterIds) {
      const entity = entities.find(
        (e) => e.entity_id === charId && e.type === "character"
      );
      if (entity) {
        // Check if character already exists
        const { data: existing } = await supabase
          .from("characters")
          .select("id")
          .eq("session_id", session_id)
          .eq("name", entity.name)
          .single();

        if (!existing) {
          await supabase.from("characters").insert({
            session_id,
            name: entity.name,
            relationship_to_narrator: entity.user_perspective,
            birth_era: (entity.attributes?.birth_era as string) ?? "",
            photo_requested: false,
          });
          newCharacters.push(entity.name);
        }
      }
    }

    // Log
    await supabase.from("processing_log").insert({
      session_id,
      event: "e_agent_complete",
      data: {
        entity_count: entities.length,
        new_characters: newCharacters,
      },
    });

    return new Response(
      JSON.stringify({ success: true, output: parsed, new_characters: newCharacters }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("run-e-agent error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
