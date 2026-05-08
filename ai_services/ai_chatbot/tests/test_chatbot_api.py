from __future__ import annotations

from fastapi.testclient import TestClient

import app as chatbot_app


def test_chatbot_health():
    with TestClient(chatbot_app.app) as client:
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["service"] == "ai-chatbot"


def test_chat_returns_streamed_text(monkeypatch):
    async def fake_stream_agent_response(_session, _message):
        yield ("text", "Hello")
        yield ("text", " world")

    monkeypatch.setattr(chatbot_app, "stream_agent_response", fake_stream_agent_response)
    with TestClient(chatbot_app.app) as client:
        response = client.post("/chat", json={"message": "hi"})
        assert response.status_code == 200
        payload = response.json()
        assert payload["reply"] == "Hello world"
        assert payload["session_id"]
