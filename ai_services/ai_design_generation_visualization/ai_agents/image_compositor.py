from __future__ import annotations

import base64
import io
import cv2
import numpy as np

def _decode_image(image_b64: str) -> np.ndarray:
    """Decode base64 to OpenCV image (BGRA)."""
    if image_b64.startswith("data:"):
        image_b64 = image_b64.split("base64,", 1)[-1]
    image_bytes = base64.b64decode(image_b64)
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_UNCHANGED)
    if img is None:
        raise ValueError("Could not decode image")
    if img.shape[2] == 3:
        img = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
    return img

def _encode_png(image: np.ndarray) -> str:
    """Encode OpenCV image to base64 PNG."""
    _, buffer = cv2.imencode(".png", image)
    return base64.b64encode(buffer).decode("utf-8")

def _remove_background(img: np.ndarray) -> np.ndarray:
    """Intelligent background removal using FloodFill to preserve internal colors."""
    h, w = img.shape[:2]
    
    # 1. Create a BGR copy for floodFill
    bgr = cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)
    
    # 2. Generate background mask using floodFill from corners
    # This ensures only the CONNECTED background is removed
    total_mask = np.zeros((h + 2, w + 2), np.uint8)
    
    # Tolerance for background detection (30 is usually good)
    tol = (30, 30, 30)
    
    # Flood fill from all 4 corners
    for seed in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        cv2.floodFill(bgr, total_mask, seed, (0, 255, 0), tol, tol, cv2.FLOODFILL_FIXED_RANGE)
    
    # The mask contains 1s where the background was found
    bg_mask = total_mask[1:-1, 1:-1]
    
    # 3. Apply mask to Alpha channel
    result = img.copy()
    result[bg_mask == 1, 3] = 0
    
    # 4. Auto-crop
    alpha = result[:, :, 3]
    coords = cv2.findNonZero(alpha)
    if coords is not None:
        x, y, w_box, h_box = cv2.boundingRect(coords)
        cropped = result[y:y+h_box, x:x+w_box]
        
        # Professional padding (2%)
        pad = int(max(w_box, h_box) * 0.02)
        padded = cv2.copyMakeBorder(cropped, pad, pad, pad, pad, cv2.BORDER_CONSTANT, value=(0, 0, 0, 0))
        return padded
        
    return result

def blend_design_onto_product(
    product_image_b64: str,
    design_image_b64: str,
    *,
    width_ratio: float = 0.12,
    center_y_ratio: float = 0.48,
) -> str:
    """Vectorized alpha blending with high-quality resizing."""
    product = _decode_image(product_image_b64)
    design = _remove_background(_decode_image(design_image_b64))
    
    ph, pw = product.shape[:2]
    
    # Resize with Lanczos4 for high quality
    tw = max(1, int(pw * width_ratio))
    th = max(1, int(tw * (design.shape[0] / design.shape[1])))
    design_res = cv2.resize(design, (tw, th), interpolation=cv2.INTER_LANCZOS4)
    
    # Placement
    x_off = (pw - tw) // 2
    y_off = int(ph * center_y_ratio) - (th // 2)
    y_off = max(0, min(y_off, ph - th))
    
    # Optimized Alpha Blending
    src_rgb = design_res[:, :, :3].astype(np.float32)
    src_alpha = (design_res[:, :, 3:4] / 255.0).astype(np.float32)
    
    dst_roi = product[y_off:y_off+th, x_off:x_off+tw, :3].astype(np.float32)
    
    # result = src * alpha + dst * (1 - alpha)
    blended = src_rgb * src_alpha + dst_roi * (1.0 - src_alpha)
    
    product[y_off:y_off+th, x_off:x_off+tw, :3] = blended.astype(np.uint8)
    
    return _encode_png(product)
