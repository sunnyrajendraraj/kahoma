import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { chunk_id } = await req.json();
    if (!chunk_id) {
      return new Response(JSON.stringify({ error: "chunk_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
    const MOCK_MODE = Deno.env.get("MOCK_MODE") === "true";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch the voice chunk
    const { data: chunk, error: chunkError } = await supabase
      .from("voice_chunks")
      .select("*")
      .eq("id", chunk_id)
      .single();

    if (chunkError || !chunk) {
      return new Response(JSON.stringify({ error: "Chunk not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (chunk.whisper_status !== "pending") {
      return new Response(JSON.stringify({ error: "Chunk already processed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Update status to transcribing
    await supabase
      .from("voice_chunks")
      .update({ whisper_status: "transcribing" })
      .eq("id", chunk_id);

    let transcript: string;

    if (MOCK_MODE) {
      // MOCK: Return a realistic Hindi-English transcript instead of calling Whisper
      const mockTranscripts = [
        "Meri dadi ka naam Savitri tha. Woh Lucknow ke purane shehar mein rehti thi, ek haveli mein jismein zindagi ki khushbu basi rehti thi. She was the strongest woman I've ever known. Har subah woh tulsi ke paas khadi hoti thi, aur mujhe lagta tha ki duniya mein sab kuch theek hai.",
        "Papa government job mein the, but unka asli pyaar music tha. Har raat ko woh harmonium bajate the, aur main unke paas baithkar sunta tha. Those evenings shaped everything I became. Maa kehti thi ki woh sapne zyada dekhte hain, lekin unhone mujhe sapne dekhna sikhaya.",
        "1992 mein hum Bombay shift hue. Nayi jagah, naye log, sab kuch alag. I remember the smell of the sea, the sound of local trains. Papa ko naya kaam mil gaya tha aur Maa ne school dhoondna shuru kiya. It was scary but exciting — like starting a completely new chapter of life.",
      ];
      const chunkIndex = (chunk.chunk_order ?? 1) - 1;
      transcript = mockTranscripts[chunkIndex % mockTranscripts.length];
      console.log("[MOCK] Using mock transcript for chunk", chunk_id);
    } else {
      // REAL: Call Whisper API
      const { data: signedData, error: signError } = await supabase.storage
        .from("audio")
        .createSignedUrl(chunk.audio_url, 600);

      if (signError || !signedData?.signedUrl) {
        await supabase
          .from("voice_chunks")
          .update({ whisper_status: "failed" })
          .eq("id", chunk_id);
        return new Response(JSON.stringify({ error: "Failed to get audio URL" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const audioResponse = await fetch(signedData.signedUrl);
      const audioBlob = await audioResponse.blob();

      const formData = new FormData();
      formData.append("file", audioBlob, "audio.m4a");
      formData.append("model", "whisper-1");

      const whisperResponse = await fetch(
        "https://api.openai.com/v1/audio/transcriptions",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${openaiKey}` },
          body: formData,
        }
      );

      if (!whisperResponse.ok) {
        const errText = await whisperResponse.text();
        console.error("Whisper API error:", errText);
        await supabase
          .from("voice_chunks")
          .update({ whisper_status: "failed" })
          .eq("id", chunk_id);
        return new Response(JSON.stringify({ error: "Whisper transcription failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const whisperResult = await whisperResponse.json();
      transcript = whisperResult.text;
    }

    // 6. Update chunk with transcript
    await supabase
      .from("voice_chunks")
      .update({ transcript, whisper_status: "done" })
      .eq("id", chunk_id);

    // 7. Get next message_order
    const { data: lastMsg } = await supabase
      .from("context_messages")
      .select("message_order")
      .eq("session_id", chunk.session_id)
      .order("message_order", { ascending: false })
      .limit(1)
      .single();

    const nextOrder = (lastMsg?.message_order ?? 0) + 1;

    // 8. Insert into context_messages
    await supabase.from("context_messages").insert({
      session_id: chunk.session_id,
      role: "user",
      content: transcript,
      chunk_id: chunk_id,
      message_order: nextOrder,
    });

    // 9. Fire-and-forget: invoke process-chunk
    fetch(`${supabaseUrl}/functions/v1/process-chunk`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session_id: chunk.session_id,
        chunk_id: chunk_id,
      }),
    }).catch((err) => console.error("Failed to invoke process-chunk:", err));

    // Log success
    await supabase.from("processing_log").insert({
      session_id: chunk.session_id,
      chunk_id: chunk_id,
      event: "transcription_complete",
      data: { transcript_length: transcript.length },
    });

    return new Response(
      JSON.stringify({ success: true, transcript }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("transcribe-chunk error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
