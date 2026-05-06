"""
Product Visualization Agent
----------------------------
Takes a generated design and a product image, then composites the design
onto the product using OpenRouter's image model via chat completions.
"""

from __future__ import annotations

from agents import Agent, function_tool, AsyncOpenAI , OpenAIChatCompletionsModel

import config
from ai_agents.design_agent import openrouter_client, model as openrouter_model, generate_image_via_openrouter


# ---------------------------------------------------------------------------
# Custom tool — apply design to product
# ---------------------------------------------------------------------------


# openrouter_client = AsyncOpenAI(
#     base_url=config.OPENROUTER_BASE_URL,
#     api_key=config.OPENROUTER_API_KEY,
# )

# openrouter_image_model = OpenAIChatCompletionsModel(
#     model=config.OPENROUTER_IMAGE_MODEL,
#     openai_client=openrouter_client,
# )



external_client = AsyncOpenAI(
    base_url=config.GEMINI_BASE_URL,
    api_key=config.GEMINI_API_KEY,
)

model = OpenAIChatCompletionsModel(
    model="gemini-2.5-flash-image",
    openai_client=external_client,
)

@function_tool
async def apply_design_to_product(
    design_image_b64: str,
    product_image_b64: str,
    product_type: str,
    prompt: str,
) -> str:
    """Apply a design onto a product image.

    Args:
        design_image_b64: Base64-encoded design image to apply.
        product_image_b64: Base64-encoded product image.
        product_type: The type of product (e.g. 't-shirt', 'mug').
        prompt: Description of how the design should be applied.

    Returns:
        Base64-encoded visualization image with the design on the product.
    """
    edit_prompt = (
        f"CRITICAL INSTRUCTION: Do NOT hallucinate or generate your own design. "
        f"You MUST exactly apply the provided design onto this {product_type}. "
        f"The user's specific design should be naturally placed on the product surface, "
        f"following the product's contours and perspective without changing the core pattern. "
        f"Make it look like a real, professional product mockup. "
        f"Additional instructions: {prompt}"
    )

    result = await generate_image_via_openrouter(edit_prompt)
    if not result:
        return "ERROR: Visualization failed — no image data was returned."
    return result


# ---------------------------------------------------------------------------
# Agent definition
# ---------------------------------------------------------------------------

visualization_agent = Agent(
    name="Product Visualizer",
    instructions=(
        "You are an exact product visualization specialist. "
        "Your STRICT and ONLY task is to composite a specific user-provided 'design_image' onto a specific user-provided 'product_image'. "
        "CRITICAL INSTRUCTION: You MUST explicitly use the exact design provided by the user. "
        "Do NOT hallucinate, do NOT generate your own designs, and do NOT alter the core design itself. "
        "Your only job is to realistically apply the existing design onto the product surface, ensuring proper perspective, lighting, and contours."
    ),
    tools=[apply_design_to_product],
    model= model,
)
