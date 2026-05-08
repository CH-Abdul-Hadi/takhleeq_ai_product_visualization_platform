from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine

from product_services.database import Product
from product_services.main import app, get_session


def test_product_health_endpoint():
    @asynccontextmanager
    async def no_lifespan(_app):
        yield

    app.router.lifespan_context = no_lifespan
    with TestClient(app) as client:
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"


def test_get_products_returns_records():
    engine = create_engine("sqlite://")
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        session.add(
            Product(
                Product_name="Test Hoodie",
                Product_details="Warm fleece",
                product_quantity=4,
                price=2500.0,
                category="hoodie",
            )
        )
        session.commit()

    def override_get_session():
        with Session(engine) as session:
            yield session

    @asynccontextmanager
    async def no_lifespan(_app):
        yield

    app.router.lifespan_context = no_lifespan
    app.dependency_overrides[get_session] = override_get_session
    with TestClient(app) as client:
        response = client.get("/product/")
        assert response.status_code == 200
        payload = response.json()
        assert len(payload) == 1
        assert payload[0]["Product_name"] == "Test Hoodie"
    app.dependency_overrides.clear()


def test_get_product_image_not_found():
    engine = create_engine("sqlite://")
    SQLModel.metadata.create_all(engine)

    def override_get_session():
        with Session(engine) as session:
            yield session

    @asynccontextmanager
    async def no_lifespan(_app):
        yield

    app.router.lifespan_context = no_lifespan
    app.dependency_overrides[get_session] = override_get_session
    with TestClient(app) as client:
        response = client.get("/product/999/image")
        assert response.status_code == 404
    app.dependency_overrides.clear()
