"""Pytest fixtures for GRIMLOCK API tests."""

import pytest
from httpx import ASGITransport, AsyncClient

from grimlock_api.main import app


@pytest.fixture
async def client():
    """Async HTTP client for testing."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac
