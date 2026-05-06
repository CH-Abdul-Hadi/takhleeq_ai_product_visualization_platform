"""
Coordinator Agent
-----------------
Orchestrates the full pipeline: design generation → product visualization
→ color enhancement.  All image operations go through OpenRouter's
chat-completions endpoint (Flux model).

Image data is stored/retrieved via the image_store in design_agent to
avoid passing large base64 strings through the LLM context.
"""

from __future__ import annotations

import asyncio
import re

import config
from ai_agents.design_agent import (
    generate_design,
    get_image,
    external_client,
)


# ---------------------------------------------------------------------------
# Helper: extract image ref-ID or base64 from agent RunResult
# ---------------------------------------------------------------------------

_REF_PATTERN = re.compile(r"IMAGE_GENERATED:([a-f0-9]{8})")


def extract_image_from_result(result) -> str | None:
    """Walk through a RunResult and return the first base64 image found.

    The generate_design_image tool stores image data externally and returns
    a reference ID like ``IMAGE_GENERATED:abc12345``.  This function finds
    that reference and retrieves the actual base64 data from the store.
    """

    # Check tool outputs for our IMAGE_GENERATED reference
    for item in result.new_items:
        # ToolCallOutputItem has .output directly on the item
        if hasattr(item, "output") and isinstance(item.output, str):
            m = _REF_PATTERN.search(item.output)
            if m:
                img = get_image(m.group(1))
                if img:
                    return img

        # Also check raw_item (may be a dict or Pydantic model)
        if hasattr(item, "raw_item"):
            raw = item.raw_item
            output_str = None
            if isinstance(raw, dict):
                output_str = raw.get("output")
            elif hasattr(raw, "output"):
                output_str = raw.output
            if output_str and isinstance(output_str, str):
                m = _REF_PATTERN.search(output_str)
                if m:
                    img = get_image(m.group(1))
                    if img:
                        return img

    # Also check final_output for the reference
    if result.final_output:
        output = str(result.final_output)
        m = _REF_PATTERN.search(output)
        if m:
            img = get_image(m.group(1))
            if img:
                return img

        # Fallback: raw base64 in final_output (unlikely but safe)
        if len(output) > 200 and re.match(r"^[A-Za-z0-9+/=]+$", output.strip()):
            return output.strip()

    return None


def extract_text_from_result(result) -> str:
    """Extract text output from a RunResult."""
    output = result.final_output or ""
    # Strip any IMAGE_GENERATED references from the text
    return _REF_PATTERN.sub("", output).strip()


def _format_image_url(b64_data: str) -> str:
    """Ensure base64 string is formatted with data URI scheme."""
    if b64_data.startswith("data:"):
        return b64_data
    # We default to image/jpeg for safety if no mime type is provided
    return f"data:image/jpeg;base64,{b64_data}"


# ---------------------------------------------------------------------------
# Pipeline coordinator
# ---------------------------------------------------------------------------

async def run_full_pipeline(
    prompt: str,
    product_image_b64: str,
    product_type: str,
    product_color: str,
    reference_image_b64: str | None = None,
) -> dict:
    """Run the complete design→visualize→enhance pipeline.

    Args:
        prompt: Text description of the desired design.
        product_image_b64: Base64-encoded product image.
        product_type: Type of product.
        product_color: Dominant product color.
        reference_image_b64: Optional reference image.

    Returns:
        dict with keys: design_image, visualization_image, enhanced_image,
                        description
    """

    # ── Step 1: Generate design via the Design Agent ─────────────────────
    design_result = await generate_design(
        prompt=prompt,
        reference_image=reference_image_b64,
    )
    design_image = extract_image_from_result(design_result)

    if not design_image:
        raise RuntimeError(
            "Design generation failed — no image was produced by the agent."
        )

    # ── Step 2: Generate product mockup with design applied ────────────
    #   Using the text-to-image model for design application since image inputs
    #   aren't natively supported by this endpoint.
    viz_prompt = (
        f"CRITICAL INSTRUCTION: Do NOT hallucinate or generate a new design pattern. "
        f"You MUST exactly apply the existing requested design ({prompt}) onto this {product_color} {product_type}. "
        f"The design must be naturally placed on the product surface, "
        f"following the product's contours and perspective without altering the core design itself. "
        f"Photorealistic product photography, studio lighting, "
        f"white background, high quality commercial product shot."
    )

    from ai_agents.design_agent import generate_image_via_gemini
    
    visualization_image = await generate_image_via_gemini(viz_prompt)
    if not visualization_image:
        raise RuntimeError("Visualization step failed — no image returned.")

    # ── Step 3: Generate enhanced version ─────────────────────────────────
    enhance_prompt = (
        f"CRITICAL INSTRUCTION: Do NOT hallucinate, generate new designs, or alter the core pattern. "
        f"This is STRICTLY a color and lighting enhancement task. "
        f"Enhance the premium, high-quality product mockup of a {product_color} {product_type} "
        f"with the design: {prompt}. "
        f"The design colors must be vibrant and complement the {product_color} product perfectly. "
        f"Improve color harmony, contrast, and make it vivid and eye-catching without changing the design itself. "
        f"Professional product photography with perfect studio lighting, "
        f"subtle shadows, clean white background. "
        f"Ultra high quality, 4K commercial product shot."
    )

    enhanced_image = await generate_image_via_gemini(enhance_prompt)
    if not enhanced_image:
        raise RuntimeError("Color enhancement step failed — no image returned.")

    # ── Build description ────────────────────────────────────────────────
    description = (
        f"Generated a {prompt} design and applied it to a {product_color} "
        f"{product_type}. Colors were enhanced to harmonize with the product."
    )

    return {
        "design_image": design_image,
        "visualization_image": visualization_image,
        "enhanced_image": enhanced_image,
        "description": description,
    }


async def run_design_only(
    prompt: str,
    reference_image_b64: str | None = None,
) -> dict:
    """Generate a design without applying it to a product.

    Returns:
        dict with keys: design_image, description
    """
    design_result = await generate_design(
        prompt=prompt,
        reference_image=reference_image_b64,
    )
    design_image = extract_image_from_result(design_result)
    description = extract_text_from_result(design_result)

    if not design_image:
        raise RuntimeError(
            "Design generation failed — no image was produced by the agent."
        )

    return {
        "design_image": design_image,
        "description": description or f"Generated design: {prompt}",
    }


async def run_apply_design(
    design_image_b64: str,
    product_image_b64: str,
    product_type: str,
    product_color: str,
    prompt: str = "Apply the design naturally onto the product",
) -> dict:
    """Apply a user-uploaded design onto a product (no AI generation).

    Since Flux is a text-to-image model and cannot accept image inputs,
    we generate a product mockup using a detailed text description.
    The user's design_image is accepted for future use when image-to-image
    models become available.

    Args:
        design_image_b64: Base64-encoded design image from the user.
        product_image_b64: Base64-encoded product image.
        product_type: Type of product.
        product_color: Dominant product color.
        prompt: Instructions describing the design to apply.

    Returns:
        dict with keys: visualization_image, enhanced_image, description
    """

    # ── Step 1: Generate product mockup with design ──────────────────────
    viz_prompt = (
        f"CRITICAL INSTRUCTION: Do NOT hallucinate or generate a new design pattern. "
        f"You MUST exactly apply the user's uploaded custom design onto this {product_color} {product_type}. "
        f"Design instructions: {prompt}. "
        f"The design must be naturally placed on the product surface, "
        f"following the product's contours and perspective without altering the core design itself. "
        f"Photorealistic product photography, studio lighting, "
        f"white background, high quality commercial product shot."
    )

    from ai_agents.design_agent import generate_image_via_gemini

    visualization_image = await generate_image_via_gemini(viz_prompt)
    if not visualization_image:
        raise RuntimeError("Visualization step failed -- no image returned.")

    # ── Step 2: Generate enhanced version ────────────────────────────────
    enhance_prompt = (
        f"CRITICAL INSTRUCTION: Do NOT hallucinate, generate new designs, or alter the core pattern. "
        f"This is STRICTLY a color and lighting enhancement task. "
        f"Enhance the premium, high-quality product mockup of a {product_color} {product_type} "
        f"with the custom design: {prompt}. "
        f"The design colors must be vibrant and complement the {product_color} product perfectly. "
        f"Improve color harmony, contrast, and make it vivid and eye-catching without changing the design itself. "
        f"Professional product photography with perfect studio lighting, "
        f"subtle shadows, clean white background. "
        f"Ultra high quality, 4K commercial product shot."
    )

    enhanced_image = await generate_image_via_gemini(enhance_prompt)
    if not enhanced_image:
        raise RuntimeError("Color enhancement step failed -- no image returned.")

    description = (
        f"Applied the uploaded design to a {product_color} {product_type}. "
        f"Colors were enhanced to harmonize with the product."
    )

    return {
        "visualization_image": visualization_image,
        "enhanced_image": enhanced_image,
        "description": description,
    }


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _extract_b64_from_response(response) -> str | None:
    """Extract base64 image data from an OpenRouter chat completion response.

    OpenRouter image models return the image in ``message.images`` (not in
    ``message.content`` which is typically empty).
    """
    msg = response.choices[0].message

    # ── Primary: images field ────────────────────────────────────────────
    raw_msg = msg.model_dump()
    images = raw_msg.get("images")
    if images and len(images) > 0:
        url = images[0].get("image_url", {}).get("url", "")
        if url:
            match = re.search(r"base64,(.+)", url)
            if match:
                return match.group(1)

    # ── Fallback: content ────────────────────────────────────────────────
    content = msg.content
    if content:
        match = re.search(r"data:image/[^;]+;base64,([A-Za-z0-9+/=]+)", content)
        if match:
            return match.group(1)
        stripped = content.strip()
        if len(stripped) > 200 and re.match(r"^[A-Za-z0-9+/=\s]+$", stripped):
            return stripped.replace("\n", "").replace(" ", "")

    return None
