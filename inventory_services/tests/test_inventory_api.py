from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from jose import jwt
from sqlmodel import Session, SQLModel, create_engine

from inventory_services.main import app, get_db
from inventory_services.model import Stock_update
from inventory_services import setting


def _make_token(role: str = "buyer", user_id: int = 1) -> str:
    payload = {
        "sub": "test-user",
        "id": user_id,
        "role": role,
        "exp": int((datetime.now(timezone.utc) + timedelta(hours=1)).timestamp()),
    }
    return jwt.encode(payload, setting.SECRET_KEY, algorithm=setting.ALGORITHMS)


def test_check_inventory_available():
    engine = create_engine("sqlite://")
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        session.add(
            Stock_update(
                product_id=10,
                product_name="Tee",
                product_quantity=8,
                status="In Stock",
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
        response = client.get(
            "/check_inventory/10/3",
            headers={"Authorization": f"Bearer {_make_token('buyer')}"},
        )
        assert response.status_code == 200
        assert response.json()["available"] is True
    app.dependency_overrides.clear()


def test_get_single_stock_not_found():
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
        response = client.get(
            "/get_single_stock_update?product_id=1234",
            headers={"Authorization": f"Bearer {_make_token('admin')}"},
        )
        assert response.status_code == 404
    app.dependency_overrides.clear()
