from __future__ import annotations

import pytest
from pydantic import ValidationError

from model import AICenterCreateRequest, AICenterResponse


def test_ai_center_create_request_requires_user_id():
    with pytest.raises(ValidationError):
        AICenterCreateRequest(
            user_idea="minimal floral print",
            product_id=1,
            product_type="t-shirt",
            product_color="black",
        )


def test_ai_center_create_request_accepts_user_id():
    payload = AICenterCreateRequest(
        user_id=11,
        user_idea="minimal floral print",
        product_id=1,
        product_type="t-shirt",
        product_color="black",
    )
    assert payload.user_id == 11


def test_ai_center_response_contains_user_id():
    response = AICenterResponse(
        id=7,
        user_id=42,
        user_idea="geometric pattern",
        design_from_gemini=None,
        product_id=9,
        final_product=None,
        status="pending",
    )
    assert response.user_id == 42
