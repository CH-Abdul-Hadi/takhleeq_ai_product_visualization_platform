from __future__ import annotations

import base64
import io

from PIL import Image


def _decode_image(image_b64: str) -> Image.Image:
    if image_b64.startswith("data:"):
        image_b64 = image_b64.split("base64,", 1)[-1]
    image_bytes = base64.b64decode(image_b64)
    return Image.open(io.BytesIO(image_bytes)).convert("RGBA")


def _encode_png(image: Image.Image) -> str:
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def _remove_white_background(image: Image.Image, threshold: int = 245) -> Image.Image:
    """Make near-white pixels transparent so design can be layered."""
    rgba = image.convert("RGBA")
    pixels = list(rgba.getdata())
    cleaned = []
    for r, g, b, a in pixels:
        if r >= threshold and g >= threshold and b >= threshold:
            cleaned.append((r, g, b, 0))
        else:
            cleaned.append((r, g, b, a))
    rgba.putdata(cleaned)
    return rgba


def blend_design_onto_product(
    product_image_b64: str,
    design_image_b64: str,
    *,
    width_ratio: float = 0.45,
    center_y_ratio: float = 0.42,
) -> str:
    """Overlay the design onto the product while preserving original product image."""
    product = _decode_image(product_image_b64)
    design = _remove_white_background(_decode_image(design_image_b64))

    target_width = max(1, int(product.width * width_ratio))
    scale = target_width / max(1, design.width)
    target_height = max(1, int(design.height * scale))
    design = design.resize((target_width, target_height), Image.Resampling.LANCZOS)

    x = (product.width - target_width) // 2
    y = int(product.height * center_y_ratio) - (target_height // 2)
    y = max(0, min(y, product.height - target_height))

    product.alpha_composite(design, (x, y))
    return _encode_png(product)
