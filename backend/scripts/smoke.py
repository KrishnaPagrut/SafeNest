"""Live smoke test: one Spark JSON call, one SAM call, one Muse Image edit, with latencies.
Run: cd backend && uv run python scripts/smoke.py path/to/photo.jpg "throw rug"."""

import asyncio
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import config
from app.llm import client
from app.pipeline.grounder import parse_sam


async def main(img: Path, phrase: str) -> None:
    assert config.API_KEY, "set MODEL_API_KEY in .env"
    jpeg = img.read_bytes()
    t = time.monotonic()
    out = await client.spark_json(
        name="smoke",
        system="List up to 3 objects in the image.",
        content=[
            {"type": "input_text", "text": "What objects are here?"},
            {"type": "input_image", "image_url": client.data_url(jpeg)},
        ],
        schema={
            "type": "object",
            "additionalProperties": False,
            "required": ["objects"],
            "properties": {"objects": {"type": "array", "items": {"type": "string"}}},
        },
        images=[jpeg],
    )
    print(f"spark  {time.monotonic() - t:5.1f}s  {out}")
    t = time.monotonic()
    text = await client.sam_image(phrase, jpeg)
    dets = parse_sam(text)
    print(f"sam    {time.monotonic() - t:5.1f}s  {len(dets)} match(es) for '{phrase}'  raw={text[:120]!r}")
    t = time.monotonic()
    png = await client.image_edit(jpeg, f"Remove the {phrase}; keep everything else identical.")
    Path("/tmp/smoke_edit.webp").write_bytes(png)
    print(f"image  {time.monotonic() - t:5.1f}s  {len(png)} bytes → /tmp/smoke_edit.webp")


if __name__ == "__main__":
    asyncio.run(main(Path(sys.argv[1]), sys.argv[2] if len(sys.argv) > 2 else "chair"))
