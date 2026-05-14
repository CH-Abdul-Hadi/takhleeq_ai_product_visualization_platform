"""
Design Generation Agent
-----------------------
Uses OpenAI Agents SDK with OpenRouter for reasoning and
image generation via the chat completions API (Flux model).

Image data is stored in a module-level dict to avoid passing
large base64 strings through the LLM context window.
"""

from __future__ import annotations

import uuid
import asyncio
import base64
import os
import sys
from openai import AsyncOpenAI
from agents import Agent, Runner, function_tool, set_tracing_disabled
from agents.models.openai_chatcompletions import OpenAIChatCompletionsModel
from google import genai
import re
from dataclasses import dataclass
import random
import urllib.parse
import aiohttp
import config

# Disable tracing (no direct OpenAI key for trace uploading)
set_tracing_disabled(True)

# ---------------------------------------------------------------------------
# Shared OpenRouter client & model (imported by other agents)
# ---------------------------------------------------------------------------

external_client = AsyncOpenAI(
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
    api_key=config.GEMINI_API_KEY,
)

model = OpenAIChatCompletionsModel(
    model="gemini-1.5-flash",
    openai_client=external_client,
)


# ---------------------------------------------------------------------------
# Image store — avoids sending base64 through the LLM context
# ---------------------------------------------------------------------------

_image_store: dict[str, str] = {}


def store_image(b64_data: str) -> str:
    """Store base64 image data and return a short reference ID."""
    ref_id = str(uuid.uuid4())[:8]
    _image_store[ref_id] = b64_data
    return ref_id


def get_image(ref_id: str) -> str | None:
    """Retrieve stored image data by reference ID."""
    return _image_store.pop(ref_id, None)

def peek_image(ref_id: str) -> str | None:
    """Check stored image data by reference ID without removing it."""
    return _image_store.get(ref_id)


# ---------------------------------------------------------------------------
# Helper — generate image via Pollinations.ai (Free, No API Key)
# ---------------------------------------------------------------------------

async def generate_image_via_gemini(prompt: str, image_b64: str | None = None) -> str | None:
    """Generate image using Pollinations.ai.
    
    We are keeping the function name `generate_image_via_gemini` so that we 
    don't have to update all imports in coordinator.py, but this now uses Pollinations.
    
    Returns:
        Base64-encoded image string, or None.
    """
    try:
        # We append a random seed so it generates a fresh image even for identical prompts
        seed = random.randint(1, 9999999)
        encoded_prompt = urllib.parse.quote(prompt)
        url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1024&height=1024&nologo=true&seed={seed}"
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as resp:
                if resp.status == 200:
                    image_bytes = await resp.read()
                    return base64.b64encode(image_bytes).decode('utf-8')
                else:
                    print(f"Pollinations Error: Status {resp.status}")
                    return None
    except Exception as e:
        import traceback
        traceback.print_exc()
        return None


# ---------------------------------------------------------------------------
# Custom tool — generate design image
# ---------------------------------------------------------------------------

@function_tool
async def generate_design_image(prompt: str, reference_image_id: str | None = None) -> str:
    """Generate a design image based on a text prompt.

    Uses an image-generation model to create a high-quality design.

    Args:
        prompt: Detailed description of the design to generate, including
                style, colors, patterns, and any specific elements.
        reference_image_id: Optional reference ID for guiding the design if provided by the user.

    Returns:
        A short reference ID for the generated image.
    """
    full_prompt = (
        f"CRITICAL INSTRUCTION: You must strictly follow the user's design description. "
        f"Do NOT hallucinate or add structural elements, subjects, or themes that are not explicitly requested. "
        f"Create a high-quality, production-ready design suitable for printing "
        f"on physical products. The design should be clean, isolated on a white "
        f"or transparent background, detailed, and vibrant. "
        f"Design description: {prompt}"
    )

    image_b64 = None
    if reference_image_id:
        ref_id = reference_image_id.split(':')[-1]
        image_b64 = peek_image(ref_id)

    result = await generate_image_via_gemini(full_prompt, image_b64=image_b64)
    if not result:
        return "ERROR: Image generation failed — no image data was returned."

    ref_id = store_image(result)
    return f"IMAGE_GENERATED:{ref_id}"


# ---------------------------------------------------------------------------
# Agent definition
# ---------------------------------------------------------------------------

# Read instructions from the markdown file
_instruction_file = os.path.join(os.path.dirname(__file__), "dynamic_instruction.md")
with open(_instruction_file, "r", encoding="utf-8") as f:
    dynamic_instruction = f.read()

design_agent = Agent(
    name="Design Generator",
    instructions=dynamic_instruction,
    tools=[generate_design_image],
    model=model,
)

print("Loaded Instructions Length:", len(dynamic_instruction))

# ---------------------------------------------------------------------------
# Public helper with robust fallback
# ---------------------------------------------------------------------------

async def generate_design(prompt: str, reference_image: str | None = None):
    """Run the design agent with automatic fallback if AI reasoning is rate-limited.
    
    This ensures that even if Gemini hits a 429/quota limit, the user 
    still gets a high-quality design via Pollinations.
    """
    user_message = f"Generate a design based on this description: {prompt}"

    if reference_image:
        ref_id = store_image(reference_image)
        user_message += (
            f"\n\nI am also providing a reference image for style guidance. "
            f"Its reference ID is IMAGE_REFERENCE:{ref_id}. "
            f"Ensure you pass this reference ID to the generate_design_image tool."
        )

    try:
        # Attempt to run the full Agent reasoning (supports multiple turns/tools)
        # We use a 2-retry policy for 429s
        for attempt in range(2):
            try:
                result = await Runner.run(design_agent, input=user_message)
                return result
            except Exception as e:
                if ("429" in str(e) or "quota" in str(e).lower()) and attempt == 0:
                    print(f"Gemini Rate Limited. Waiting 2 seconds and retrying attempt {attempt+1}...")
                    await asyncio.sleep(2)
                    continue
                raise e
                
    except Exception as exc:
        # FALLBACK: If Gemini reasoning fails entirely (quota exhausted), 
        # we generate the image directly using a refined prompt template.
        print(f"CRITICAL: Gemini Agent failed ({exc}). Falling back to Direct Pollinations generation.")
        
        refined_prompt = (
            f"A professional, high-quality design of: {prompt}. "
            "Isolated on a clean background, vibrant colors, sharp detail, "
            "vector style, suitable for high-definition printing on apparel and products."
        )
        
        # Call the pollinations helper directly
        image_b64 = await generate_image_via_gemini(refined_prompt)
        
        if not image_b64:
            raise RuntimeError(f"Both Gemini Agent and Pollinations Fallback failed: {exc}")
            
        # Mock a RunResult-like object so the coordinator doesn't break
        @dataclass
        class MockToolOutput:
            output: str
        @dataclass
        class MockResult:
            final_output: str
            new_items: list
        
        ref_id = store_image(image_b64)
        return MockResult(
            final_output=f"IMAGE_GENERATED:{ref_id}",
            new_items=[MockToolOutput(output=f"IMAGE_GENERATED:{ref_id}")]
        )


if __name__ == "__main__":
    

    # Allow passing a prompt as a CLI argument
    prompt = " ".join(sys.argv[1:]) or "minimalist geometric pattern with blue and gold"

    async def _main():
        print(f"Generating design: {prompt!r} ...")
        result = await generate_design(prompt=prompt)

        # Find IMAGE_GENERATED reference in the result
        ref_pattern = re.compile(r"IMAGE_GENERATED:([a-f0-9]{8})")
        b64_data = None

        for item in result.new_items:
            if hasattr(item, "output") and isinstance(item.output, str):
                m = ref_pattern.search(item.output)
                if m:
                    b64_data = get_image(m.group(1))
                    break

        if not b64_data:
            print("ERROR: No image was generated.")
            return

        # Save the image
        os.makedirs("output", exist_ok=True)
        out_path = os.path.abspath("output/design_preview.png")
        with open(out_path, "wb") as f:
            f.write(base64.b64decode(b64_data))

        print(f"Design saved to: {out_path}")
        print(f"Description: {result.final_output}")

        # Open the image (Windows)
        os.startfile(out_path)

    asyncio.run(_main())