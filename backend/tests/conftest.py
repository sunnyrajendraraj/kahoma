"""
Pytest configuration and shared fixtures for Kahoma Backend.
Sets up global mocking of the Supabase client to prevent any network calls during tests.
"""

import sys
from pathlib import Path
from unittest.mock import MagicMock

# Ensure the backend directory is in the Python search path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Global Mock of Supabase before importing main app or routes
class MockSupabaseTable:
    """Mock builder representing Supabase table query chain."""

    def __init__(self, data=None, count=0):
        self.data = data
        self.count = count

    def select(self, *args, **kwargs):
        return self

    def insert(self, *args, **kwargs):
        # If no data set, use the inserted dictionary
        if self.data is None:
            self.data = args[0] if args else {"id": "mock-uuid"}
        return self

    def update(self, *args, **kwargs):
        if self.data is None:
            self.data = args[0] if args else {}
        return self

    def eq(self, *args, **kwargs):
        return self

    def order(self, *args, **kwargs):
        return self

    def limit(self, *args, **kwargs):
        return self

    def single(self, *args, **kwargs):
        if isinstance(self.data, list) and self.data:
            self.data = self.data[0]
        return self

    def maybe_single(self, *args, **kwargs):
        if isinstance(self.data, list) and self.data:
            self.data = self.data[0]
        elif not self.data:
            self.data = None
        return self

    def execute(self, *args, **kwargs):
        res = MagicMock()
        res.data = self.data
        res.count = self.count
        return res

class MockSupabaseClient:
    """Mock client overriding the Supabase Client class methods."""

    def __init__(self):
        self.mock_data = {}
        self.mock_count = 0

    def table(self, table_name: str):
        return MockSupabaseTable(
            self.mock_data.get(table_name),
            self.mock_count
        )

# Instantiate the global mock client
mock_supabase_client = MockSupabaseClient()

# Override Supabase Client accessor methods in core.supabase_client
import core.supabase_client
core.supabase_client.get_supabase = lambda: mock_supabase_client
core.supabase_client.get_supabase_client = lambda: mock_supabase_client

# Now we can safely import fastapi app and pytest/httpx
import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from main import app as fastapi_app
from core.llm_cache import llm_cache


@pytest.fixture(autouse=True)
def clean_llm_cache():
    """Clear LLM cache between tests to prevent tests leaking state."""
    llm_cache.clear()
    yield
    llm_cache.clear()


@pytest.fixture(autouse=True)
def clean_supabase_mock():
    """Reset Supabase mock data before every test."""
    mock_supabase_client.mock_data.clear()
    mock_supabase_client.mock_count = 0
    yield
    mock_supabase_client.mock_data.clear()


@pytest.fixture
def app() -> FastAPI:
    """Fixture returning the FastAPI app instance."""
    return fastapi_app


@pytest_asyncio.fixture
async def client(app: FastAPI):
    """Fixture returning an AsyncClient for testing FastAPI routes."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
