import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function toRoman(num: number): string {
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const syms = ["M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"];
  let result = "";
  for (let i = 0; i < vals.length; i++) {
    while (num >= vals[i]) {
      result += syms[i];
      num -= vals[i];
    }
  }
  return result;
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
    const pdfshiftKey = Deno.env.get("PDFSHIFT_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch book, chapters, and session
    const [bookResult, chaptersResult, sessionResult] = await Promise.all([
      supabase
        .from("books")
        .select("*")
        .eq("session_id", session_id)
        .single(),
      supabase
        .from("chapters")
        .select("*")
        .eq("session_id", session_id)
        .order("chapter_number", { ascending: true }),
      supabase
        .from("sessions")
        .select("title, user_id")
        .eq("id", session_id)
        .single(),
    ]);

    const book = bookResult.data;
    const chapters = chaptersResult.data ?? [];
    const session = sessionResult.data;

    if (!book) throw new Error("Book record not found");

    // Get the user's email for author name
    const { data: userData } = await supabase.auth.admin.getUserById(
      session?.user_id ?? ""
    );
    const authorName = book.author_name || userData?.user?.email || "Anonymous";

    // Get signed URLs for chapter images
    const imageUrls: Record<string, string> = {};
    for (const chapter of chapters) {
      if (chapter.image_url) {
        const { data: signed } = await supabase.storage
          .from("photos")
          .createSignedUrl(chapter.image_url, 3600);
        if (signed?.signedUrl) {
          imageUrls[chapter.id] = signed.signedUrl;
        }
      }
    }

    const currentYear = new Date().getFullYear();

    // Build the book HTML
    const bookHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,700;1,400&display=swap');
@page { size: 148mm 210mm; margin: 22mm 18mm 20mm 22mm; }
body { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 11.5pt; line-height: 1.75; color: #1a1410; margin: 0; padding: 0; }
.cover { page-break-after: always; min-height: 85vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; border: 1px solid #8a7a6a; padding: 40px; box-sizing: border-box; }
.cover-ornament { color: #8a7a6a; font-size: 24pt; margin-bottom: 24px; }
.cover-title { font-size: 28pt; font-weight: 700; line-height: 1.1; margin-bottom: 16px; color: #1a1410; }
.cover-subtitle { font-size: 14pt; font-style: italic; color: #6b5c4e; margin-bottom: 32px; }
.cover-author { font-size: 13pt; font-style: italic; color: #6b5c4e; }
.cover-year { font-size: 10pt; color: #8a7a6a; margin-top: 24px; }
.toc { page-break-after: always; padding-top: 40px; }
.toc h2 { font-size: 16pt; font-weight: 700; text-align: center; margin-bottom: 32px; letter-spacing: 0.2em; text-transform: uppercase; color: #8a7a6a; }
.toc-item { display: flex; justify-content: space-between; align-items: baseline; padding: 8px 0; border-bottom: 1px dotted #d4c4b4; }
.toc-item .toc-num { font-size: 9pt; color: #8a7a6a; min-width: 30px; }
.toc-item .toc-title { font-size: 12pt; flex: 1; }
.chapter { page-break-before: always; }
.chapter-number { font-size: 9pt; letter-spacing: 0.3em; text-transform: uppercase; color: #8a7a6a; margin-bottom: 8px; }
.chapter-title { font-size: 20pt; font-weight: 700; line-height: 1.1; margin-bottom: 8px; }
.chapter-meta { font-size: 9pt; font-style: italic; color: #8a7a6a; margin-bottom: 32px; border-bottom: 1px solid #d4c4b4; padding-bottom: 12px; }
.chapter-image { width: 100%; max-height: 200px; object-fit: cover; margin-bottom: 24px; display: block; }
.chapter-body { text-align: justify; }
.chapter-body p { margin-bottom: 1em; }
.chapter-body p:first-child::first-letter { font-size: 3em; font-weight: 700; float: left; line-height: 0.7; padding-right: 8px; padding-top: 4px; }
.colophon { page-break-before: always; text-align: center; padding-top: 40vh; color: #8a7a6a; font-style: italic; font-size: 10pt; }
</style>
</head>
<body>

<!-- COVER PAGE -->
<div class="cover">
  <div class="cover-ornament">✦</div>
  <div class="cover-title">${escapeHtml(book.cover_title || session?.title || "My Story")}</div>
  <div class="cover-author">By ${escapeHtml(authorName)}</div>
  <div class="cover-year">${currentYear}</div>
</div>

<!-- TABLE OF CONTENTS -->
<div class="toc">
  <h2>Contents</h2>
  ${chapters
    .map(
      (ch: { chapter_number: number; title: string }) => `
  <div class="toc-item">
    <span class="toc-num">${toRoman(ch.chapter_number)}</span>
    <span class="toc-title">${escapeHtml(ch.title || `Chapter ${ch.chapter_number}`)}</span>
  </div>`
    )
    .join("")}
</div>

<!-- CHAPTERS -->
${chapters
  .map(
    (ch: {
      id: string;
      chapter_number: number;
      title: string;
      era: string;
      location: string;
      content_written: string | null;
    }) => {
      const imgUrl = imageUrls[ch.id];
      const proseHtml = (ch.content_written || "")
        .split("\n\n")
        .filter((p: string) => p.trim())
        .map((p: string) => `<p>${escapeHtml(p.trim())}</p>`)
        .join("");

      return `
<div class="chapter">
  <div class="chapter-number">Chapter ${toRoman(ch.chapter_number)}</div>
  <div class="chapter-title">${escapeHtml(ch.title || `Chapter ${ch.chapter_number}`)}</div>
  <div class="chapter-meta">${escapeHtml(ch.era || "")}${ch.era && ch.location ? " · " : ""}${escapeHtml(ch.location || "")}</div>
  ${imgUrl ? `<img class="chapter-image" src="${imgUrl}" />` : ""}
  <div class="chapter-body">${proseHtml}</div>
</div>`;
    }
  )
  .join("")}

<!-- COLOPHON -->
<div class="colophon">
  <p>Created with Kahoma</p>
  <p>Every life holds a story worth telling.</p>
</div>

</body>
</html>`;

    // Call PDFShift API
    const pdfshiftAuth = base64Encode(new TextEncoder().encode(`api:${pdfshiftKey}`));

    const pdfResponse = await fetch(
      "https://api.pdfshift.io/v3/convert/pdf",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${pdfshiftAuth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: bookHtml,
          sandbox: false,
        }),
      }
    );

    if (!pdfResponse.ok) {
      const errText = await pdfResponse.text();
      throw new Error(`PDFShift error: ${errText}`);
    }

    // Get PDF as ArrayBuffer
    const pdfBuffer = await pdfResponse.arrayBuffer();
    const pdfBlob = new Blob([pdfBuffer], { type: "application/pdf" });

    // Upload to Supabase storage
    const storagePath = `${session_id}/kahoma_book.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("books")
      .upload(storagePath, pdfBlob, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) throw new Error(`PDF upload failed: ${uploadError.message}`);

    // Estimate page count (~250 words per page)
    const totalWords = chapters.reduce((sum: number, ch: { content_written: string | null }) => {
      return sum + (ch.content_written?.split(/\s+/).length ?? 0);
    }, 0);
    const estimatedPages = Math.max(chapters.length + 2, Math.ceil(totalWords / 250));

    // Update book record
    await supabase
      .from("books")
      .update({
        pdf_url: storagePath,
        author_name: authorName,
        status: "ready",
        page_count: estimatedPages,
      })
      .eq("id", book.id);

    // Update session status
    await supabase
      .from("sessions")
      .update({ status: "book_ready" })
      .eq("id", session_id);

    // Log
    await supabase.from("processing_log").insert({
      session_id,
      event: "binder_complete",
      data: { pdf_url: storagePath, page_count: estimatedPages },
    });

    return new Response(
      JSON.stringify({ success: true, pdf_url: storagePath }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("run-binder error:", err);
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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
