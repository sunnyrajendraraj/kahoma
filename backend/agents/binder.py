"""
Binder Agent.
Assembles the final book HTML/PDF from chapters, cover, and typography.
Uses Cormorant Garamond font, A5 page size, literary styling.
"""

import logging
from typing import Any
from html import escape as html_escape

from config import get_settings
from core.supabase_client import get_supabase
from core.audit import log_event

logger = logging.getLogger(__name__)


def _to_roman(num: int) -> str:
    """Convert integer to Roman numeral."""
    vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1]
    syms = ["M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"]
    result = ""
    for i, val in enumerate(vals):
        while num >= val:
            result += syms[i]
            num -= val
    return result


def _build_book_html(
    book_title: str,
    author_name: str,
    chapters: list[dict[str, Any]],
    image_urls: dict[str, str],
) -> str:
    """Build the complete book HTML with cover, TOC, chapters, and colophon."""
    from datetime import datetime

    current_year = datetime.now().year

    # Build TOC items
    toc_items = ""
    for ch in chapters:
        ch_num = ch.get("chapter_number", 0)
        ch_title = html_escape(ch.get("title", f"Chapter {ch_num}"))
        toc_items += f"""
  <div class="toc-item">
    <span class="toc-num">{_to_roman(ch_num)}</span>
    <span class="toc-title">{ch_title}</span>
  </div>"""

    # Build chapter sections
    chapter_sections = ""
    for ch in chapters:
        ch_num = ch.get("chapter_number", 0)
        ch_title = html_escape(ch.get("title", f"Chapter {ch_num}"))
        ch_era = html_escape(ch.get("era", ""))
        ch_location = html_escape(ch.get("location", ""))
        ch_meta = f"{ch_era}{' · ' if ch_era and ch_location else ''}{ch_location}"

        img_url = image_urls.get(ch.get("id", ""))
        img_html = f'<img class="chapter-image" src="{img_url}" />' if img_url else ""

        # Convert prose to paragraphs
        content = ch.get("content_written", "") or ""
        prose_html = "".join(
            f"<p>{html_escape(p.strip())}</p>"
            for p in content.split("\n\n")
            if p.strip()
        )

        chapter_sections += f"""
<div class="chapter">
  <div class="chapter-number">Chapter {_to_roman(ch_num)}</div>
  <div class="chapter-title">{ch_title}</div>
  <div class="chapter-meta">{ch_meta}</div>
  {img_html}
  <div class="chapter-body">{prose_html}</div>
</div>"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,700;1,400&display=swap');
@page {{ size: 148mm 210mm; margin: 22mm 18mm 20mm 22mm; }}
body {{ font-family: 'Cormorant Garamond', Georgia, serif; font-size: 11.5pt; line-height: 1.75; color: #1a1410; margin: 0; padding: 0; }}
.cover {{ page-break-after: always; min-height: 85vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; border: 1px solid #8a7a6a; padding: 40px; box-sizing: border-box; }}
.cover-ornament {{ color: #8a7a6a; font-size: 24pt; margin-bottom: 24px; }}
.cover-title {{ font-size: 28pt; font-weight: 700; line-height: 1.1; margin-bottom: 16px; color: #1a1410; }}
.cover-subtitle {{ font-size: 14pt; font-style: italic; color: #6b5c4e; margin-bottom: 32px; }}
.cover-author {{ font-size: 13pt; font-style: italic; color: #6b5c4e; }}
.cover-year {{ font-size: 10pt; color: #8a7a6a; margin-top: 24px; }}
.toc {{ page-break-after: always; padding-top: 40px; }}
.toc h2 {{ font-size: 16pt; font-weight: 700; text-align: center; margin-bottom: 32px; letter-spacing: 0.2em; text-transform: uppercase; color: #8a7a6a; }}
.toc-item {{ display: flex; justify-content: space-between; align-items: baseline; padding: 8px 0; border-bottom: 1px dotted #d4c4b4; }}
.toc-item .toc-num {{ font-size: 9pt; color: #8a7a6a; min-width: 30px; }}
.toc-item .toc-title {{ font-size: 12pt; flex: 1; }}
.chapter {{ page-break-before: always; }}
.chapter-number {{ font-size: 9pt; letter-spacing: 0.3em; text-transform: uppercase; color: #8a7a6a; margin-bottom: 8px; }}
.chapter-title {{ font-size: 20pt; font-weight: 700; line-height: 1.1; margin-bottom: 8px; }}
.chapter-meta {{ font-size: 9pt; font-style: italic; color: #8a7a6a; margin-bottom: 32px; border-bottom: 1px solid #d4c4b4; padding-bottom: 12px; }}
.chapter-image {{ width: 100%; max-height: 200px; object-fit: cover; margin-bottom: 24px; display: block; }}
.chapter-body {{ text-align: justify; }}
.chapter-body p {{ margin-bottom: 1em; }}
.chapter-body p:first-child::first-letter {{ font-size: 3em; font-weight: 700; float: left; line-height: 0.7; padding-right: 8px; padding-top: 4px; }}
.colophon {{ page-break-before: always; text-align: center; padding-top: 40vh; color: #8a7a6a; font-style: italic; font-size: 10pt; }}
</style>
</head>
<body>

<!-- COVER PAGE -->
<div class="cover">
  <div class="cover-ornament">✦</div>
  <div class="cover-title">{html_escape(book_title)}</div>
  <div class="cover-author">By {html_escape(author_name)}</div>
  <div class="cover-year">{current_year}</div>
</div>

<!-- TABLE OF CONTENTS -->
<div class="toc">
  <h2>Contents</h2>
  {toc_items}
</div>

<!-- CHAPTERS -->
{chapter_sections}

<!-- COLOPHON -->
<div class="colophon">
  <p>Created with Kahoma</p>
  <p>Every life holds a story worth telling.</p>
</div>

</body>
</html>"""


async def run_binder(session_id: str) -> dict[str, Any]:
    """
    Assemble the final book HTML/PDF.
    Uploads to Supabase Storage, updates book and session records.

    Returns dict with pdf_url.
    """
    settings = get_settings()
    sb = get_supabase()

    # Fetch book, chapters, and session
    book_result = (
        sb.table("books").select("*").eq("session_id", session_id).single().execute()
    )
    chapters_result = (
        sb.table("chapters")
        .select("*")
        .eq("session_id", session_id)
        .order("chapter_number", desc=False)
        .execute()
    )
    session_result = (
        sb.table("sessions")
        .select("title, user_id")
        .eq("id", session_id)
        .single()
        .execute()
    )

    book = book_result.data
    chapters = chapters_result.data or []
    session = session_result.data

    if not book:
        raise ValueError("Book record not found")

    # Get author name from user email
    author_name = book.get("author_name") or "Anonymous"
    if not book.get("author_name") and session and session.get("user_id"):
        try:
            user_response = sb.auth.admin.get_user_by_id(session["user_id"])
            if user_response and user_response.user:
                author_name = user_response.user.email or "Anonymous"
        except Exception:
            pass

    # Get signed URLs for chapter images
    image_urls: dict[str, str] = {}
    for chapter in chapters:
        if chapter.get("image_url"):
            try:
                signed = sb.storage.from_(settings.photos_bucket).create_signed_url(
                    chapter["image_url"], 3600
                )
                if signed.get("signedURL"):
                    image_urls[chapter["id"]] = signed["signedURL"]
            except Exception:
                pass

    # Build book HTML
    book_html = _build_book_html(
        book_title=book.get("cover_title") or session.get("title", "My Story"),
        author_name=author_name,
        chapters=chapters,
        image_urls=image_urls,
    )

    # Estimate page count (~250 words per page)
    total_words = sum(
        len((ch.get("content_written") or "").split()) for ch in chapters
    )
    estimated_pages = max(len(chapters) + 2, total_words // 250 + 1)

    if settings.mock_mode:
        # Upload HTML directly (skip PDF conversion)
        storage_path = f"{session_id}/kahoma_book.html"
        sb.storage.from_(settings.books_bucket).upload(
            storage_path,
            book_html.encode("utf-8"),
            {"content-type": "text/html", "upsert": "true"},
        )
        logger.info("[MOCK] Binder uploaded HTML book (skipping PDF conversion)")
    else:
        # Real mode: would call PDFShift API here
        # For now, still upload as HTML
        storage_path = f"{session_id}/kahoma_book.html"
        sb.storage.from_(settings.books_bucket).upload(
            storage_path,
            book_html.encode("utf-8"),
            {"content-type": "text/html", "upsert": "true"},
        )
        logger.info("Binder uploaded HTML book (PDF conversion not configured)")

    # Update book record
    sb.table("books").update(
        {
            "pdf_url": storage_path,
            "author_name": author_name,
            "status": "ready",
            "page_count": estimated_pages,
        }
    ).eq("id", book["id"]).execute()

    # Update session status
    sb.table("sessions").update({"status": "book_ready"}).eq(
        "id", session_id
    ).execute()

    # Audit log
    await log_event(
        "binder_complete",
        session_id=session_id,
        data={"pdf_url": storage_path, "page_count": estimated_pages},
    )

    return {"pdf_url": storage_path}
