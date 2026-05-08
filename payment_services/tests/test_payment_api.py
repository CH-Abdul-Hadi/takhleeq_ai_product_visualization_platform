from __future__ import annotations

from contextlib import asynccontextmanager

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine

from payment_services.main import app, get_db, kafka_producer
from payment_services.model import Payment


@pytest.fixture()
def client():
    engine = create_engine("sqlite://")
    SQLModel.metadata.create_all(engine)

    def override_get_db():
        with Session(engine) as session:
            yield session

    class FakeProducer:
        async def send_and_wait(self, _topic, _value):
            return None

    async def override_kafka():
        yield FakeProducer()

    @asynccontextmanager
    async def no_lifespan(_app):
        yield

    app.router.lifespan_context = no_lifespan
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[kafka_producer] = override_kafka
    with TestClient(app) as test_client:
        yield test_client, engine
    app.dependency_overrides.clear()


def test_create_payment_success(client):
    test_client, _ = client
    payload = {"order_id": 5, "amount": 1299.99, "status": "Pending"}
    response = test_client.post("/create_payment/", json=payload)
    assert response.status_code == 200
    assert response.json()["order_id"] == 5


def test_get_single_payment_not_found(client):
    test_client, _ = client
    response = test_client.get("/get_single_payment?payment_id=111")
    assert response.status_code == 404
    assert response.json()["detail"] == "Payment not found"
