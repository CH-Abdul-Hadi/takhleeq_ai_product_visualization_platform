from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine

from order_services.main import app, get_db
from order_services.database import Order


def test_get_order_returns_all_records():
    engine = create_engine("sqlite://")
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        session.add(
            Order(
                user_id=1,
                user_email="buyer1@example.com",
                product_id=10,
                total_amount=5000,
                product_quantity=2,
                product_price=2500,
                payment_status="Pending",
            )
        )
        session.commit()

    def override_get_db():
        with Session(engine) as session:
            yield session

    @asynccontextmanager
    async def no_lifespan(_app):
        yield

    app.router.lifespan_context = no_lifespan
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as client:
        response = client.get("/get_order")
        assert response.status_code == 200
        records = response.json()
        assert len(records) == 1
        assert records[0]["user_email"] == "buyer1@example.com"
    app.dependency_overrides.clear()


def test_get_single_order_not_found():
    engine = create_engine("sqlite://")
    SQLModel.metadata.create_all(engine)

    def override_get_db():
        with Session(engine) as session:
            yield session

    @asynccontextmanager
    async def no_lifespan(_app):
        yield

    app.router.lifespan_context = no_lifespan
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as client:
        response = client.get("/get_single_order?order_id=404")
        assert response.status_code == 404
        assert response.json()["detail"] == "order not found"
    app.dependency_overrides.clear()
