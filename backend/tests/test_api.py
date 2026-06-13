"""
Unit tests for Kahoma Backend REST API endpoints.
Uses a globally mocked Supabase client for fast and offline execution.
"""

import pytest
from httpx import AsyncClient
from tests.conftest import mock_supabase_client


@pytest.mark.asyncio
async def test_root_endpoint(client: AsyncClient):
    """Test the root health check endpoint."""
    response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["app"] == "Kahoma Backend"
    assert data["status"] == "running"


@pytest.mark.asyncio
async def test_health_check_degraded(client: AsyncClient):
    """Test detailed health check when Supabase fails connection."""
    # Temporarily force the mock client to throw an exception on table access
    def raise_err(name):
        raise Exception("Connection Refused")
    
    original_table = mock_supabase_client.table
    mock_supabase_client.table = raise_err

    try:
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "degraded"
        assert "error" in data["supabase"]
    finally:
        mock_supabase_client.table = original_table


@pytest.mark.asyncio
async def test_health_check_healthy(client: AsyncClient):
    """Test detailed health check when Supabase is connected."""
    mock_supabase_client.mock_data["sessions"] = [{"id": "session-1"}]

    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["supabase"] == "connected"


@pytest.mark.asyncio
async def test_cors_headers(client: AsyncClient):
    """Verify that CORS middleware headers are present in response when Origin is passed."""
    response = await client.get("/", headers={"Origin": "http://localhost:3000"})
    assert response.status_code == 200
    assert "access-control-allow-origin" in response.headers
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000" or response.headers["access-control-allow-origin"] == "*"


@pytest.mark.asyncio
async def test_create_session(client: AsyncClient):
    """Test session creation endpoint."""
    mock_session_row = {
        "id": "new-session-uuid-12345",
        "user_id": "mock-user-uuid",
        "title": "My Lucknow Memoirs",
        "status": "recording",
        "phase": 1,
        "created_at": "2026-06-13T12:00:00Z",
    }

    mock_supabase_client.mock_data["sessions"] = mock_session_row

    # Mock authentication header bypass
    headers = {"Authorization": "Bearer 00000000-0000-0000-0000-000000000001"}
    response = await client.post(
        "/api/v1/sessions/",
        json={"title": "My Lucknow Memoirs"},
        headers=headers,
    )

    assert response.status_code == 201
    data = response.json()
    assert data["id"] == "new-session-uuid-12345"
    assert data["title"] == "My Lucknow Memoirs"
    assert data["status"] == "recording"


@pytest.mark.asyncio
async def test_list_sessions(client: AsyncClient):
    """Test listing user sessions endpoint."""
    mock_sessions = [
        {"id": "session-1", "user_id": "user-1", "title": "Story 1", "status": "recording", "phase": 1, "created_at": "2026-06-13T11:00:00Z"},
        {"id": "session-2", "user_id": "user-1", "title": "Story 2", "status": "book_ready", "phase": 2, "created_at": "2026-06-13T12:00:00Z"},
    ]

    mock_supabase_client.mock_data["sessions"] = mock_sessions

    headers = {"Authorization": "Bearer 00000000-0000-0000-0000-000000000001"}
    response = await client.get("/api/v1/sessions/", headers=headers)

    assert response.status_code == 200
    data = response.json()
    assert len(data["sessions"]) == 2
    assert data["sessions"][0]["title"] == "Story 1"
    assert data["sessions"][1]["title"] == "Story 2"
