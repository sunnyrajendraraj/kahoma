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
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
    const MOCK_MODE = Deno.env.get("MOCK_MODE") === "true";

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

    let writtenContent: string;

    if (MOCK_MODE) {
      console.log(`[MOCK] Proxy Writer returning literary prose for chapter ${chapter.chapter_number}`);
      const mockChapters: Record<number, string> = {
        1: `The tulsi plant stood in the centre of the courtyard like a small green priest, faithful to its post long before anyone else had risen. Dadi Savitri's bare feet made no sound on the cool stone as she crossed from the kitchen door to the brass lota beside the well. She poured water with the same unhurried certainty with which she did everything — as though time were something that answered to her, not the other way around.

The haveli on Residency Road had been built by her father-in-law, a man whose name I never learned but whose tastes announced themselves in every archway and carved bracket. The walls were thick enough to hold secrets; the ceilings high enough that voices floated upward and lost their edges. I remember the light best — the way it fell through the jali screens in the afternoon, printing pale lattice-work on Dadi's white sari as she sat sorting rice.

She rarely spoke of the past, but the past lived in her hands. In the way she folded betel leaves — precise, unhesitating, three folds and a tuck — you could read fifty years of mornings just like this one. Lucknow was not a city to her. It was a set of textures: the grain of the wooden chakki, the rough edge of the brass thali, the particular coolness of the courtyard stone at five in the morning.

I was seven, perhaps eight, the summer I understood she would not live forever.`,
        2: `The harmonium arrived in our house the year Papa was transferred back from Allahabad — 1971, the year of the war, though the war felt very far away from Residency Road. It was a battered thing, the bellows patched with bicycle-tube rubber, two keys permanently silent. Papa paid eighty rupees for it from a music teacher who was leaving for Kanpur, and he carried it home on the back of a cycle-rickshaw, holding it steady with both hands as though it were a sleeping child.

Every evening after the six o'clock news on All India Radio, he would pull the harmonium onto the verandah and play. Not performances — conversations. His fingers moved with the particular confidence of a man who had taught himself, discovering the instrument's logic note by note over solitary afternoons. He played Begum Akhtar's ghazals mostly, and sometimes Mukesh, and on rare nights when the mood took him, a bhajan that made Dadi close her eyes and rock very slightly on her charpai.

The neighbours knew his repertoire. Sharma-ji from next door would appear with a steel glass of chai, saying nothing, settling into the cane chair as though he had been summoned. Children gathered on the low wall. The evening unwound itself around the music like thread from a spindle.

I did not know then that I was living in the last years of something.`,
        3: `Maa packed the steel trunks three days before we left. She did it at night, after we were supposed to be sleeping, and I know this because I could hear the particular sound of her folding — the soft, deliberate compression of fabric, the click of trunk latches tested and re-tested. She was not a woman who cried easily, and she did not cry during those three days.

The morning of our departure, the auto-rickshaw came at five. The haveli was dark except for the kitchen, where Dadi sat with a single lamp, making parathas no one had asked for. Four, wrapped in a cloth. She pressed them into Maa's hands at the door and said nothing I could hear.

Lucknow in the grey light of a winter morning is a city trying to hold you. The fog sat low over the road, and the Residency — the real one, the ruin — appeared for a moment through the auto's window like a photograph left out in the rain. I did not know I was looking at it for the last real time. You never do.

The train was the Lucknow Mail. We were in sleeper class, berth 47 and 48. Papa had reserved a window seat for me, and I pressed my face against the glass as the city slid away — the river, the bridge, the last minaret — until the fields began.

Maa did not cry until we crossed the bridge. Then she turned toward the window and made no sound at all, and I understood that leaving was something that happened inside you, long after the train had gone.`,
      };
      writtenContent = mockChapters[chapter.chapter_number] ?? mockChapters[1];
    } else {
      // REAL: Fetch context and call Claude
      const { data: characters } = await supabase
        .from("characters")
        .select("name, relationship_to_narrator, birth_era")
        .eq("session_id", session_id);

      const { data: sentiment } = await supabase
        .from("sentiment_store")
        .select("sentiment, tonality")
        .eq("session_id", session_id)
        .single();

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
      writtenContent = claudeResult.content[0].text;
    }

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
