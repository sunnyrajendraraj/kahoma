"""
Kahoma Backend Configuration.
Loads all settings from environment variables with validation.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Supabase
    supabase_url: str
    supabase_service_role_key: str
    supabase_anon_key: str = ""
    supabase_jwt_secret: str = ""

    # Gemini AI
    gemini_api_key: str = ""

    # Mode
    mock_mode: bool = True

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = True

    # App
    app_name: str = "Kahoma Backend"
    app_version: str = "1.0.0"
    api_prefix: str = "/api/v1"

    # Storage buckets
    audio_bucket: str = "audio"
    photos_bucket: str = "photos"
    books_bucket: str = "books"

    # Gemini model
    gemini_model: str = "gemini-2.0-flash"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
    }


@lru_cache()
def get_settings() -> Settings:
    """Cached settings singleton."""
    return Settings()
