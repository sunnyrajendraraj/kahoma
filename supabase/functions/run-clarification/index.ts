import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CLARIFICATION_SYSTEM_PROMPT = `You are Kahoma's story companion. Warm, patient, genuinely interested.
Acknowledgements: max 2 sentences. Questions: max 1 sentence.
Never clinical. Never formal. Speak like a caring friend.
Good acknowledgement: "That's a remarkable memory. Please continue."
Good question: "Just to hold the story clearly — he's your father, yes?"
If requesting a photo: explain warmly how it will help bring the story to life. Make clear it's optional. Max 2 sentences.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { session_id, evaluator_result } = await req.json();
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

    // Determine what kind of message to generate
    const decision = evaluator_result?.decision ?? "acknowledge";
    const questionToAsk = evaluator_result?.question_to_ask ?? null;
    const newCharsNeedingPhoto = (evaluator_result?.new_characters_needing_photo as string[]) ?? [];

    let generatedMessage: string;
    let photoCharacterName: string | null = null;

    if (MOCK_MODE) {
      // MOCK: Return warm realistic messages
      const mockAcknowledgements = [
        "That's a beautiful memory — the way you describe your dadi and the tulsi plant, I can almost smell the mornings. Please, continue whenever you're ready.",
        "I can feel the warmth of those harmonium evenings. Your father sounds like a remarkable man. Tell me more whenever you'd like.",
        "The move to Bombay sounds like it changed everything. Thank you for sharing something so deeply personal. Take your time.",
      ];
      const mockQuestions = [
        "Just to make sure I have the family right — was Savitri your father's mother or your mother's mother?",
        "I want to hold this story clearly — when you mention 'home,' are you thinking of the haveli in Lucknow or somewhere else?",
      ];

      if (decision === "ask" && questionToAsk) {
        generatedMessage = mockQuestions[Math.floor(Math.random() * mockQuestions.length)];
      } else {
        generatedMessage = mockAcknowledgements[Math.floor(Math.random() * mockAcknowledgements.length)];
      }

      // Handle mock photo request
      if (newCharsNeedingPhoto.length > 0) {
        const { data: chars } = await supabase
          .from("characters")
          .select("id, name, photo_requested")
          .eq("session_id", session_id)
          .eq("photo_requested", false)
          .limit(1);

        if (chars && chars.length > 0) {
          photoCharacterName = chars[0].name;
          generatedMessage += `\n\nIf you happen to have a photo of ${photoCharacterName}, we'd love to include it in your book — but only if you'd like to.`;
        }
      }
      console.log("[MOCK] Clarification returning", decision, "message");
    } else {
      // REAL: Call Claude

      // Fetch latest context for tone matching
      const { data: recentMessages } = await supabase
        .from("context_messages")
        .select("role, content")
        .eq("session_id", session_id)
        .order("message_order", { ascending: false })
        .limit(3);

      const recentContext = (recentMessages ?? [])
        .reverse()
        .map((m: { role: string; content: string }) =>
          `[${m.role.toUpperCase()}]: ${m.content}`
        )
        .join("\n");

      let userPrompt = "";
      if (decision === "acknowledge") {
        userPrompt = `The narrator just shared this part of their story. Generate a warm, genuine 1-2 sentence acknowledgement that invites them to continue.\n\nRecent context:\n${recentContext}`;
      } else {
        userPrompt = `The narrator just shared their story but we need clarification. Rephrase this question into warm, friendly language (max 1 sentence):\n\nQuestion: ${questionToAsk}\n\nRecent context:\n${recentContext}`;
      }

      if (newCharsNeedingPhoto.length > 0) {
        const { data: chars } = await supabase
          .from("characters")
          .select("id, name, photo_requested")
          .eq("session_id", session_id)
          .eq("photo_requested", false)
          .limit(1);

        if (chars && chars.length > 0) {
          photoCharacterName = chars[0].name;
          userPrompt += `\n\nAlso, gently ask if the narrator has a photo of ${photoCharacterName} they'd like to include. Make it feel optional and warm. Append this as a second part of your response.`;
        }
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
          max_tokens: 512,
          system: CLARIFICATION_SYSTEM_PROMPT,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });

      if (!claudeResponse.ok) {
        const errText = await claudeResponse.text();
        throw new Error(`Claude API error: ${errText}`);
      }

      const claudeResult = await claudeResponse.json();
      generatedMessage = claudeResult.content[0].text;
    }

    // Mark character as photo_requested if we asked
    if (photoCharacterName) {
      await supabase
        .from("characters")
        .update({ photo_requested: true })
        .eq("session_id", session_id)
        .eq("name", photoCharacterName);
    }

    // Get next message_order
    const { data: lastMsg } = await supabase
      .from("context_messages")
      .select("message_order")
      .eq("session_id", session_id)
      .order("message_order", { ascending: false })
      .limit(1)
      .single();

    const nextOrder = (lastMsg?.message_order ?? 0) + 1;

    // Insert assistant message into context_messages
    await supabase.from("context_messages").insert({
      session_id,
      role: "assistant",
      content: generatedMessage,
      message_order: nextOrder,
    });

    // Update session status
    await supabase
      .from("sessions")
      .update({ status: "awaiting_user" })
      .eq("id", session_id);

    // Log
    await supabase.from("processing_log").insert({
      session_id,
      event: "clarification_complete",
      data: { decision, photo_requested: photoCharacterName },
    });

    return new Response(
      JSON.stringify({ success: true, message: generatedMessage, decision }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("run-clarification error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
