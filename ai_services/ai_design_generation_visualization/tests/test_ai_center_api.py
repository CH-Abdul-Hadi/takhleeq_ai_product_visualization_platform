from __future__ import annotations

from contextlib import asynccontextmanager

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine

import main
from database import AICenter


_ONE_PIXEL_PNG_B64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)


@pytest.fixture()
def client():
    engine = create_engine("sqlite://")
    SQLModel.metadata.create_all(engine)

    def override_get_session():
        with Session(engine) as session:
            yield session

    @asynccontextmanager
    async def no_lifespan(_app):
        yield

    main.app.router.lifespan_context = no_lifespan
    main.app.dependency_overrides[main.get_session] = override_get_session

    class FakeProducer:
        def __init__(self):
            self.messages = []

        async def send_and_wait(self, topic, value):
            self.messages.append((topic, value))

    fake_producer = FakeProducer()

    async def override_kafka_producer():
        yield fake_producer

    main.app.dependency_overrides[main.kafka_producer] = override_kafka_producer

    with TestClient(main.app) as test_client:
        yield test_client, engine, fake_producer

    main.app.dependency_overrides.clear()


def test_create_ai_center_persists_user_id(client, monkeypatch):
    test_client, _, _ = client

    async def fake_run_design_only(prompt: str, reference_image_b64=None):
        return {"design_image": _ONE_PIXEL_PNG_B64, "description": f"Generated: {prompt}"}

    async def fake_run_apply_design(**kwargs):
        return {
            "visualization_image": _ONE_PIXEL_PNG_B64,
            "enhanced_image": _ONE_PIXEL_PNG_B64,
            "description": "applied",
        }

    monkeypatch.setattr(main, "run_design_only", fake_run_design_only)
    monkeypatch.setattr(main, "run_apply_design", fake_run_apply_design)

    payload = {
        "user_id": 101,
        "user_idea": "Floral sleeves design",
        "product_id": 501,
        "product_image": _ONE_PIXEL_PNG_B64,
        "product_type": "hoodie",
        "product_color": "black",
    }
    response = test_client.post("/ai-center/create", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == 101
    assert data["product_id"] == 501
    assert data["status"] == "pending"


def test_ai_center_list_filters_by_user_id(client):
    test_client, engine, _ = client
    with Session(engine) as session:
        session.add(
            AICenter(
                user_id=9,
                user_idea="design A",
                design_from_gemini=_ONE_PIXEL_PNG_B64,
                product_id=1,
                final_product=_ONE_PIXEL_PNG_B64,
                status="pending",
            )
        )
        session.add(
            AICenter(
                user_id=99,
                user_idea="design B",
                design_from_gemini=_ONE_PIXEL_PNG_B64,
                product_id=2,
                final_product=_ONE_PIXEL_PNG_B64,
                status="approved",
            )
        )
        session.commit()

    response = test_client.get("/ai-center/", params={"user_id": 9})
    assert response.status_code == 200
    records = response.json()
    assert len(records) == 1
    assert records[0]["user_id"] == 9
    assert records[0]["user_idea"] == "design A"


def test_health_endpoint(client):
    test_client, _, _ = client
    response = test_client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_get_ai_center_record_success(client):
    test_client, engine, _ = client
    with Session(engine) as session:
        rec = AICenter(
            user_id=5,
            user_idea="single lookup",
            design_from_gemini=_ONE_PIXEL_PNG_B64,
            product_id=11,
            final_product=_ONE_PIXEL_PNG_B64,
            status="pending",
        )
        session.add(rec)
        session.commit()
        session.refresh(rec)
        rec_id = rec.id

    response = test_client.get(f"/ai-center/{rec_id}")
    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == rec_id
    assert payload["user_id"] == 5


def test_get_ai_center_record_not_found(client):
    test_client, _, _ = client
    response = test_client.get("/ai-center/9999")
    assert response.status_code == 404
    assert response.json()["detail"] == "AI Center record not found"


def test_ai_center_list_without_filter_returns_all(client):
    test_client, engine, _ = client
    with Session(engine) as session:
        session.add(
            AICenter(
                user_id=1,
                user_idea="design one",
                design_from_gemini=_ONE_PIXEL_PNG_B64,
                product_id=1,
                final_product=_ONE_PIXEL_PNG_B64,
                status="pending",
            )
        )
        session.add(
            AICenter(
                user_id=2,
                user_idea="design two",
                design_from_gemini=_ONE_PIXEL_PNG_B64,
                product_id=2,
                final_product=_ONE_PIXEL_PNG_B64,
                status="approved",
            )
        )
        session.commit()

    response = test_client.get("/ai-center/")
    assert response.status_code == 200
    assert len(response.json()) == 2


def test_approve_design_success_and_emits_event(client):
    test_client, engine, fake_producer = client
    with Session(engine) as session:
        rec = AICenter(
            user_id=88,
            user_idea="approve me",
            design_from_gemini=_ONE_PIXEL_PNG_B64,
            product_id=777,
            final_product=_ONE_PIXEL_PNG_B64,
            status="pending",
        )
        session.add(rec)
        session.commit()
        session.refresh(rec)
        rec_id = rec.id

    response = test_client.post(f"/ai-center/{rec_id}/approve")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "approved"
    assert payload["user_id"] == 88
    assert len(fake_producer.messages) == 1


def test_approve_design_not_found(client):
    test_client, _, _ = client
    response = test_client.post("/ai-center/9999/approve")
    assert response.status_code == 404
    assert response.json()["detail"] == "AI Center record not found"


def test_approve_design_already_approved(client):
    test_client, engine, _ = client
    with Session(engine) as session:
        rec = AICenter(
            user_id=7,
            user_idea="already approved",
            design_from_gemini=_ONE_PIXEL_PNG_B64,
            product_id=90,
            final_product=_ONE_PIXEL_PNG_B64,
            status="approved",
        )
        session.add(rec)
        session.commit()
        session.refresh(rec)
        rec_id = rec.id

    response = test_client.post(f"/ai-center/{rec_id}/approve")
    assert response.status_code == 400
    assert response.json()["detail"] == "Design already approved"


def test_reject_design_success(client):
    test_client, engine, _ = client
    with Session(engine) as session:
        rec = AICenter(
            user_id=6,
            user_idea="reject me",
            design_from_gemini=_ONE_PIXEL_PNG_B64,
            product_id=901,
            final_product=_ONE_PIXEL_PNG_B64,
            status="pending",
        )
        session.add(rec)
        session.commit()
        session.refresh(rec)
        rec_id = rec.id

    response = test_client.post(f"/ai-center/{rec_id}/reject")
    assert response.status_code == 200
    assert response.json()["status"] == "rejected"


def test_reject_design_not_found(client):
    test_client, _, _ = client
    response = test_client.post("/ai-center/9999/reject")
    assert response.status_code == 404
    assert response.json()["detail"] == "AI Center record not found"


def test_create_ai_center_handles_filtered_prompt_as_400(client, monkeypatch):
    test_client, _, _ = client

    async def fake_run_design_only(prompt: str, reference_image_b64=None):
        raise Exception("'tuple' object has no attribute 'choices'")

    monkeypatch.setattr(main, "run_design_only", fake_run_design_only)

    payload = {
        "user_id": 12,
        "user_idea": "blocked prompt",
        "product_id": 5,
        "product_image": _ONE_PIXEL_PNG_B64,
        "product_type": "t-shirt",
        "product_color": "white",
    }
    response = test_client.post("/ai-center/create", json=payload)
    assert response.status_code == 400


def test_create_ai_center_handles_rate_limit_as_429(client, monkeypatch):
    test_client, _, _ = client

    async def fake_run_design_only(prompt: str, reference_image_b64=None):
        raise Exception("RESOURCE_EXHAUSTED: 429 Quota exceeded")

    monkeypatch.setattr(main, "run_design_only", fake_run_design_only)

    payload = {
        "user_id": 14,
        "user_idea": "prompt",
        "product_id": 2,
        "product_image": _ONE_PIXEL_PNG_B64,
        "product_type": "t-shirt",
        "product_color": "white",
    }
    response = test_client.post("/ai-center/create", json=payload)
    assert response.status_code == 429
