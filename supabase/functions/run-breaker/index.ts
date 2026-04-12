import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BREAKER_SYSTEM_PROMPT = `You are the Breaker Agent. Think like India's greatest storytellers:
Premchand, Amrita Pritam, Dharmveer Bharati.
You receive the full Bible (sentiment + entities + transcript).
Divide the story into optimal chapters — NOT necessarily chronological.
Find the order that creates the most emotionally resonant book.
Respond with ONLY valid JSON:
{
  "book_title": string (evocative, 4-6 words),
  "book_subtitle": string or null,
  "narrative_structure": string,
  "chapters": [{
    "chapter_number": integer,
    "title": string (literary, not descriptive),
    "era": string,
    "primary_location": string,
    "primary_character": string,
    "emotional_arc": string,
    "relevant_transcript_sections": string[],
    "image_concept": string
  }],
  "total_chapters": integer
}
Each chapter title should make a reader stop at a bookshop.`;

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

    // Get user_id from session
    const { data: sessionData } = await supabase
      .from("sessions")
      .select("user_id")
      .eq("id", session_id)
      .single();
    const userId = sessionData?.user_id;

    let parsed: Record<string, unknown>;

    if (MOCK_MODE) {
      console.log("[MOCK] Breaker returning hardcoded 3-chapter structure");
      parsed = {
        book_title: "The Haveli on Residency Road",
        book_subtitle: "A memoir of mornings, migrations, and memory",
        narrative_structure: "thematic-emotional",
        total_chapters: 3,
        chapters: [
          {
            chapter_number: 1,
            title: "The Smell of Tulsi at Dawn",
            era: "1960s",
            primary_location: "Lucknow",
            primary_character: "Dadi Savitri",
            emotional_arc: "warmth → longing",
            relevant_transcript_sections: ["Dadi would wake before anyone. The tulsi plant was the first thing she touched."],
            image_concept: "Elderly Indian woman tending a tulsi plant in a sunlit courtyard, 1960s film grain",
          },
          {
            chapter_number: 2,
            title: "Harmonium Evenings",
            era: "1970s",
            primary_location: "Lucknow",
            primary_character: "Papa",
            emotional_arc: "joy → bittersweetness",
            relevant_transcript_sections: ["Papa played the harmonium every evening after work. The neighbours gathered."],
            image_concept: "Man playing harmonium on a verandah at dusk, warm lamp light, 1970s India",
          },
          {
            chapter_number: 3,
            title: "Train to Bombay",
            era: "1982",
            primary_location: "Bombay",
            primary_character: "Narrator",
            emotional_arc: "anticipation → displacement",
            relevant_transcript_sections: ["The day we left Lucknow, Maa didn't cry until the train crossed the bridge."],
            image_concept: "Indian family on a crowded railway platform, suitcases and farewells, early 1980s",
          },
        ],
      };
    } else {
      // Fetch the Bible: sentiment + entities + all context messages
      const [sentimentResult, entityResult, messagesResult] =
        await Promise.all([
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
          supabase
            .from("context_messages")
            .select("role, content, message_order")
            .eq("session_id", session_id)
            .order("message_order", { ascending: true }),
        ]);

      const sentiment = sentimentResult.data;
      const entities = entityResult.data;
      const messages = messagesResult.data ?? [];

      // Serialize the Bible
      const contextString = messages
        .map(
          (m: { role: string; content: string }) =>
            `[${m.role.toUpperCase()}]: ${m.content}`
        )
        .join("\n\n");

      let bibleText = `--- FULL TRANSCRIPT ---\n${contextString}`;
      if (sentiment) {
        bibleText += `\n\n--- SENTIMENT ANALYSIS ---\n${JSON.stringify(sentiment.raw_output ?? sentiment, null, 2)}`;
      }
      if (entities) {
        bibleText += `\n\n--- ENTITIES ---\n${JSON.stringify(entities.entities, null, 2)}`;
        bibleText += `\n\n--- RELATIONSHIPS ---\n${JSON.stringify(entities.relationships, null, 2)}`;
      }

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
          max_tokens: 4096,
          system: BREAKER_SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: `Here is the complete Bible for this story. Structure the optimal book:\n\n${bibleText}`,
            },
          ],
        }),
      });

      if (!claudeResponse.ok) {
        const errText = await claudeResponse.text();
        throw new Error(`Claude API error: ${errText}`);
      }

      const claudeResult = await claudeResponse.json();
      const rawText = claudeResult.content[0].text;
      parsed = parseClaudeJSON(rawText);
    }

    const chapters = parsed.chapters as Array<{
      chapter_number: number;
      title: string;
      era: string;
      primary_location: string;
      primary_character: string;
      emotional_arc: string;
      relevant_transcript_sections: string[];
      image_concept: string;
    }>;

    // Insert chapters
    for (const chapter of chapters) {
      await supabase.from("chapters").insert({
        session_id,
        chapter_number: chapter.chapter_number,
        title: chapter.title,
        era: chapter.era,
        location: chapter.primary_location,
        transcript_segments: chapter.relevant_transcript_sections,
        emotional_arc: chapter.emotional_arc,
        image_prompt: chapter.image_concept,
        status: "pending",
      });
    }

    // Insert book record
    const { data: book, error: bookError } = await supabase
      .from("books")
      .insert({
        session_id,
        user_id: userId,
        cover_title: parsed.book_title as string,
        author_name: "", // Will be set by binder or from user profile
        status: "generating",
      })
      .select()
      .single();

    if (bookError) throw new Error(`Book insert failed: ${bookError.message}`);

    // Log
    await supabase.from("processing_log").insert({
      session_id,
      event: "breaker_complete",
      data: {
        book_title: parsed.book_title,
        total_chapters: parsed.total_chapters,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        chapters: parsed.chapters,
        book_id: book.id,
        book_title: parsed.book_title,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("run-breaker error:", err);
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
