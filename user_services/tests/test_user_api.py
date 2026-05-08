from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi.testclient import TestClient

from user_services.main import app


def test_get_access_token_returns_token():
    @asynccontextmanager
    async def no_lifespan(_app):
        yield

    app.router.lifespan_context = no_lifespan
    with TestClient(app) as client:
        response = client.get(
            "/get_access_token",
            params={"email": "qa@example.com", "role": "buyer", "user_id": 19},
        )
        assert response.status_code == 200
        assert "access_token" in response.json()


def test_decode_token_invalid_token_returns_error_message():
    @asynccontextmanager
    async def no_lifespan(_app):
        yield

    app.router.lifespan_context = no_lifespan
    with TestClient(app) as client:
        response = client.get("/decode_token", params={"access_token": "invalid.jwt.token"})
        assert response.status_code == 200
        assert "error" in response.json()
