import os
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env")

DATA_DIR = Path(os.environ.get("SAFENEST_DATA_DIR", ROOT / "data"))
SCANS_DIR = DATA_DIR / "scans"
MEDIA_DIR = DATA_DIR / "media"
CACHE_DB = DATA_DIR / "cache.sqlite"

API_KEY = os.environ.get("MODEL_API_KEY", "")
BASE_URL = os.environ.get("META_BASE_URL", "https://api.meta.ai/v1")
SPARK_MODEL = os.environ.get("SAFENEST_SPARK_MODEL", "muse-spark-1.3")
SAM_MODEL = os.environ.get("SAFENEST_SAM_MODEL", "sam-3.1")
IMAGE_MODEL = os.environ.get("SAFENEST_IMAGE_MODEL", "muse-image-1.0")
CACHE_ONLY = os.environ.get("SAFENEST_CACHE_ONLY", "0") == "1"
REASONING_EFFORT = os.environ.get("SAFENEST_REASONING", "low")

# Keyframe sampling: 1 fps keeps a 30 s walkthrough at ~30 frames, cheap for SAM ($2.50/1k images).
FPS = float(os.environ.get("SAFENEST_FPS", "1"))
MAX_FRAMES = int(os.environ.get("SAFENEST_MAX_FRAMES", "45"))
FRAME_WIDTH = int(os.environ.get("SAFENEST_FRAME_WIDTH", "960"))
# Frames each side of the Spotter's timestamp that SAM searches for a hazard.
GROUND_WINDOW = int(os.environ.get("SAFENEST_GROUND_WINDOW", "1"))
SAM_CONCURRENCY = int(os.environ.get("SAFENEST_SAM_CONCURRENCY", "8"))

for d in (SCANS_DIR, MEDIA_DIR):
    d.mkdir(parents=True, exist_ok=True)
