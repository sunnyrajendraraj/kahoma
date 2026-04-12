import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Poll Replicate prediction until complete or timeout.
 */
async function pollReplicate(
  predictionUrl: string,
  apiKey: string,
  timeoutMs: number = 300000
): Promise<string | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const response = await fetch(predictionUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const prediction = await response.json();

    if (prediction.status === "succeeded") {
      // Output is typically an array of URLs or a single URL
      const output = prediction.output;
      if (Array.isArray(output)) return output[0];
      if (typeof output === "string") return output;
      return null;
    }

    if (prediction.status === "failed" || prediction.status === "canceled") {
      console.error("Replicate prediction failed:", prediction.error);
      return null;
    }

    // Wait 5 seconds before polling again
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  console.error("Replicate prediction timed out");
  return null;
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
    const replicateKey = Deno.env.get("REPLICATE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all chapters
    const { data: chapters, error: chapError } = await supabase
      .from("chapters")
      .select("*")
      .eq("session_id", session_id)
      .order("chapter_number", { ascending: true });

    if (chapError || !chapters) {
      throw new Error("Failed to fetch chapters");
    }

    // Fetch characters with photos
    const { data: characters } = await supabase
      .from("characters")
      .select("*")
      .eq("session_id", session_id);

    let imagesGenerated = 0;
    let imagesFailed = 0;

    for (const chapter of chapters) {
      try {
        // Check if primary character has a photo (WORKFLOW A — era transform)
        const primaryChar = (characters ?? []).find(
          (c: { name: string; photo_url: string | null }) =>
            c.photo_url && chapter.emotional_arc?.includes(c.name)
        );

        let imageUrl: string | null = null;

        if (primaryChar?.photo_url) {
          // WORKFLOW A: Era-transform user photo
          const { data: signedData } = await supabase.storage
            .from("photos")
            .createSignedUrl(primaryChar.photo_url, 600);

          if (signedData?.signedUrl) {
            const prompt = `Portrait photograph from ${chapter.era || "mid-20th century"}, ${chapter.location || "India"}, authentic period photography style, warm film grain, natural lighting, preserve facial identity and expression, soft focus background`;
            const negativePrompt =
              "modern, contemporary, digital photography, 2020s, 2010s, cartoon, anime";

            const predictionResponse = await fetch(
              "https://api.replicate.com/v1/predictions",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${replicateKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  version:
                    "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
                  input: {
                    image: signedData.signedUrl,
                    prompt,
                    negative_prompt: negativePrompt,
                    strength: 0.55,
                    num_inference_steps: 30,
                    guidance_scale: 7.5,
                  },
                }),
              }
            );

            if (predictionResponse.ok) {
              const prediction = await predictionResponse.json();
              const resultUrl = await pollReplicate(
                prediction.urls.get,
                replicateKey
              );

              if (resultUrl) {
                // Download and upload to Supabase storage
                const imgResponse = await fetch(resultUrl);
                const imgBlob = await imgResponse.blob();
                const storagePath = `${session_id}/char_${primaryChar.id}_era.jpg`;

                await supabase.storage
                  .from("photos")
                  .upload(storagePath, imgBlob, {
                    contentType: "image/jpeg",
                    upsert: true,
                  });

                // Update character
                await supabase
                  .from("characters")
                  .update({ photo_era_transformed_url: storagePath })
                  .eq("id", primaryChar.id);

                // Also set as chapter image
                imageUrl = storagePath;
              }
            }
          }
        }

        if (!imageUrl) {
          // WORKFLOW B: Generate illustration from image_concept
          const concept = chapter.image_prompt || chapter.emotional_arc || chapter.title;
          const prompt = `${concept}, photorealistic, film photography, warm tones, ${chapter.era || "vintage"} visual grammar, book chapter opener, ${chapter.location || "India"}, atmospheric, cinematic lighting`;
          const negativePrompt =
            "illustration, digital art, modern, contemporary, cartoon, anime, text, watermark";

          const predictionResponse = await fetch(
            "https://api.replicate.com/v1/predictions",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${replicateKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                version:
                  "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
                input: {
                  prompt,
                  negative_prompt: negativePrompt,
                  num_inference_steps: 30,
                  guidance_scale: 7.5,
                  width: 1024,
                  height: 768,
                },
              }),
            }
          );

          if (predictionResponse.ok) {
            const prediction = await predictionResponse.json();
            const resultUrl = await pollReplicate(
              prediction.urls.get,
              replicateKey
            );

            if (resultUrl) {
              const imgResponse = await fetch(resultUrl);
              const imgBlob = await imgResponse.blob();
              const storagePath = `${session_id}/chapter_${chapter.id}.jpg`;

              await supabase.storage
                .from("photos")
                .upload(storagePath, imgBlob, {
                  contentType: "image/jpeg",
                  upsert: true,
                });

              imageUrl = storagePath;
            }
          }
        }

        if (imageUrl) {
          await supabase
            .from("chapters")
            .update({ image_url: imageUrl })
            .eq("id", chapter.id);
          imagesGenerated++;
        } else {
          imagesFailed++;
        }
      } catch (chapterErr) {
        console.error(
          `Image generation failed for chapter ${chapter.chapter_number}:`,
          chapterErr
        );
        imagesFailed++;
        // Continue — never abort on single image failure
      }
    }

    // Log
    await supabase.from("processing_log").insert({
      session_id,
      event: "picasso_complete",
      data: { images_generated: imagesGenerated, images_failed: imagesFailed },
    });

    return new Response(
      JSON.stringify({
        success: true,
        images_generated: imagesGenerated,
        images_failed: imagesFailed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("run-picasso error:", err);
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
