import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()



# --- Paths ---
BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "output"
OUTPUT_DIR.mkdir(exist_ok=True)

# --- Image defaults ---
IMAGE_SIZE = "1024x1024"
IMAGE_QUALITY = "high"
# IMAGE_MODEL = "gpt-image-1"
# IMAGE_MODEL = "black-forest-labs/flux.2-klein-4b"

# IMAGE_MODEL="black-forest-labs/flux.2-max"


GEMINI_API_KEY : str = os.getenv("GEMINI_API_KEY")
# GEMINI_MODEL : str = os.getenv("GEMINI_MODEL")
# GEMINI_IMAGE_MODEL : str = os.getenv("GEMINI_IMAGE_MODEL")
GEMINI_BASE_URL : str = os.getenv("GEMINI_BASE_URL")

FLUX_IMAGE_MODEL : str = os.getenv("FLUX_IMAGE_MODEL")
IMAGE_PROVIDER: str = os.getenv("IMAGE_PROVIDER", "pollinations").strip().lower()

# --- Kafka ---
KAFKA_BOOTSTRAP_SERVER: str = os.getenv("KAFKA_BOOTSTRAP_SERVER")
KAFKA_DESIGN_TOPIC: str = os.getenv("KAFKA_DESIGN_TOPIC")
KAFKA_PRODUCT_TOPIC: str = os.getenv("KAFKA_PRODUCT_TOPIC")
KAFKA_CONSUMER_GROUP_ID: str = os.getenv("KAFKA_CONSUMER_GROUP_ID")

# --- Database ---
AI_CENTER_DATABASE_URL: str = os.getenv("AI_CENTER_DATABASE_URL")

# --- Cloud image storage (same provider/path as product service) ---
CLOUDINARY_CLOUD_NAME: str = os.getenv("CLOUDINARY_CLOUD_NAME", "")
CLOUDINARY_API_KEY: str = os.getenv("CLOUDINARY_API_KEY", "")
CLOUDINARY_API_SECRET: str = os.getenv("CLOUDINARY_API_SECRET", "")