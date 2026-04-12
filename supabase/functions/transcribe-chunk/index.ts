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
    const openaiKey = Deno.env.get("OPENAI_API_KEY")!;

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

    // 3. Get signed URL for the audio file
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

    // 4. Download audio
    const audioResponse = await fetch(signedData.signedUrl);
    const audioBlob = await audioResponse.blob();

    // 5. Send to Whisper API — no language param (auto-detect Hindi/English mix)
    const formData = new FormData();
    formData.append("file", audioBlob, "audio.m4a");
    formData.append("model", "whisper-1");

    const whisperResponse = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
        },
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
    const transcript = whisperResult.text;

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
