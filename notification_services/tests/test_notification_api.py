from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi.testclient import TestClient

from notification_services.main import app
from notification_services.notification_store import record_email_notification


def test_notification_root_endpoint():
    @asynccontextmanager
    async def no_lifespan(_app):
        yield

    app.router.lifespan_context = no_lifespan
    with TestClient(app) as client:
        response = client.get("/")
        assert response.status_code == 200
        assert "Welcome To Notification Service" in response.json()["message"]


def test_notification_endpoint_returns_email_notifications_for_user():
    @asynccontextmanager
    async def no_lifespan(_app):
        yield

    app.router.lifespan_context = no_lifespan
    record_email_notification(
        user_email="buyer@example.com",
        subject="Order Confirmation",
        body="Your order has been created successfully.",
    )

    with TestClient(app) as client:
        response = client.get(
            "/get_notification",
            params={"user_email": "buyer@example.com"},
        )

        assert response.status_code == 200
        notifications = response.json()["notifications"]
        assert notifications[0]["title"] == "Order Confirmation"
        assert notifications[0]["type"] == "order"


def test_contact_endpoint_sends_to_fixed_recipient(monkeypatch):
    @asynccontextmanager
    async def no_lifespan(_app):
        yield

    sent_messages = []

    async def fake_send_email(user_email: str, subject: str, body: str):
        sent_messages.append(
            {"user_email": user_email, "subject": subject, "body": body}
        )

    monkeypatch.setattr("notification_services.main.send_email", fake_send_email)

    app.router.lifespan_context = no_lifespan
    with TestClient(app) as client:
        response = client.post(
            "/contact",
            json={
                "first_name": "Hassan",
                "last_name": "Qurashi",
                "email": "sender@example.com",
                "subject": "Need help",
                "message": "Please contact me.",
            },
        )

        assert response.status_code == 200
        assert sent_messages[0]["user_email"] == "hasaanqurashi150@gmail.com"
        assert "sender@example.com" in sent_messages[0]["body"]
