from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi.testclient import TestClient

from notification_services.main import app


def test_notification_root_endpoint():
    @asynccontextmanager
    async def no_lifespan(_app):
        yield

    app.router.lifespan_context = no_lifespan
    with TestClient(app) as client:
        response = client.get("/")
        assert response.status_code == 200
        assert "Welcome To Notification Service" in response.json()["message"]
