"""Pydantic schemas for books and chapters."""

from datetime import datetime
from pydantic import BaseModel


class ChapterResponse(BaseModel):
    """Chapter data returned to the client."""
    id: str
    session_id: str
    chapter_number: int
    title: str | None = None
    era: str | None = None
    location: str | None = None
    content_written: str | None = None
    image_url: str | None = None
    emotional_arc: str | None = None
    status: str = "pending"
    created_at: datetime | None = None


class BookResponse(BaseModel):
    """Book data returned to the client."""
    id: str
    session_id: str
    user_id: str
    pdf_url: str | None = None
    cover_title: str | None = None
    author_name: str | None = None
    status: str = "pending"
    page_count: int | None = None
    created_at: datetime | None = None


class BookStatusResponse(BaseModel):
    """Combined book + chapters progress for the client."""
    book: BookResponse | None = None
    chapters: list[ChapterResponse] = []
    session_status: str = "recording"
    chapters_written: int = 0
    total_chapters: int = 0


class BookGenerateResponse(BaseModel):
    """Response when book generation is triggered."""
    success: bool = True
    message: str = "Book generation started in background."
    session_id: str


class BookDownloadResponse(BaseModel):
    """Response with a signed download URL."""
    success: bool = True
    download_url: str
    filename: str = "kahoma_book.html"
