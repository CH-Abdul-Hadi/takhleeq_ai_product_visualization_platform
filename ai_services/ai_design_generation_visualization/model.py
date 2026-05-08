from __future__ import annotations

from pydantic import BaseModel, Field


class DesignRequest(BaseModel):
    """Request payload for product visualization."""

    prompt: str = Field(
        ...,
        description="Text prompt describing the desired design (e.g. 'floral pattern with gold accents').",
    )
    reference_image: str | None = Field(
        default=None,
        description="Optional base64-encoded reference image for style guidance.",
    )
    product_image: str = Field(
        ...,
        description="Base64-encoded image of the product to apply the design onto.",
    )
    product_type: str = Field(
        ...,
        description="Type of product (e.g. 't-shirt', 'mug', 'phone-case').",
    )
    product_color: str = Field(
        ...,
        description="Dominant color of the product (e.g. 'white', 'navy blue').",
    )


class DesignResponse(BaseModel):
    """Response payload containing all generated images."""

    design_image: str = Field(
        ..., description="Base64-encoded generated design image."
    )
    visualization_image: str = Field(
        ...,
        description="Base64-encoded image showing the design applied on the product.",
    )
    enhanced_image: str = Field(
        ...,
        description="Base64-encoded final image with color-enhanced design on the product.",
    )
    description: str = Field(
        ...,
        description="AI-generated description of the final visualization.",
    )


class GenerateDesignRequest(BaseModel):
    """Request payload for generating a design only (no product application)."""

    prompt: str = Field(
        ...,
        description="Text prompt describing the desired design.",
    )
    reference_image: str | None = Field(
        default=None,
        description="Optional base64-encoded reference image for style guidance.",
    )


class GenerateDesignResponse(BaseModel):
    """Response payload for design-only generation."""

    design_image: str = Field(
        ..., description="Base64-encoded generated design image."
    )
    description: str = Field(
        ..., description="AI-generated description of the design."
    )
    image_url: str = Field(
        ..., description="URL path to view the saved design image (e.g. /output/design_abc123.png)."
    )


class ApplyDesignRequest(BaseModel):
    """Request payload for applying a user-uploaded design onto a product."""

    design_image: str = Field(
        ..., description="Base64-encoded design image to apply onto the product."
    )
    product_image: str = Field(
        ..., description="Base64-encoded image of the product."
    )
    product_type: str = Field(
        ..., description="Type of product (e.g. 't-shirt', 'mug', 'phone-case')."
    )
    product_color: str = Field(
        ..., description="Dominant color of the product (e.g. 'white', 'navy blue')."
    )
    prompt: str = Field(
        default="Apply the design naturally onto the product",
        description="Optional instructions for how to apply the design.",
    )


class ApplyDesignResponse(BaseModel):
    """Response payload with the design applied onto the product."""

    visualization_image: str = Field(
        ..., description="Base64-encoded image with the design applied on the product."
    )
    enhanced_image: str = Field(
        ..., description="Base64-encoded color-enhanced final image."
    )
    description: str = Field(
        ..., description="Description of the result."
    )
    image_url: str = Field(
        ..., description="URL path to view the final image."
    )


# ---------------------------------------------------------------------------
# AI Center models
# ---------------------------------------------------------------------------


class AICenterCreateRequest(BaseModel):
    """Request to create a new AI Center design from a user idea."""

    user_idea: str = Field(
        ...,
        description="The user's design idea / text prompt.",
    )
    user_id: int = Field(
        ...,
        description="ID of the user creating this design.",
    )
    product_id: int = Field(
        ...,
        description="ID of the product in the Product Service to apply the design onto.",
    )
    product_image: str | None = Field(
        default=None,
        description="Optional base64-encoded product image. If not provided, the service will try to fetch it from the Product Service.",
    )
    product_type: str = Field(
        default="t-shirt",
        description="Type of product (e.g. 't-shirt', 'mug', 'phone-case').",
    )
    product_color: str = Field(
        default="white",
        description="Dominant color of the product.",
    )


class AICenterResponse(BaseModel):
    """Response containing an AI Center record."""

    id: int
    user_id: int
    user_idea: str
    design_from_gemini: str | None = None
    product_id: int
    final_product: str | None = None
    status: str

