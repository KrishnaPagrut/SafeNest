"""Critic: deterministic gate on SAM evidence, then a Spark review of each pixel-backed claim."""

import asyncio
import io
from pathlib import Path

from PIL import Image, ImageDraw

from app.llm.client import data_url, spark_json

SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["verdict", "reason"],
    "properties": {
        "verdict": {"type": "string", "enum": ["verified", "rejected"]},
        "reason": {"type": "string"},
    },
}

SYSTEM = (Path(__file__).parent.parent / "llm" / "prompts" / "critic.md").read_text()
MIN_SCORE = 0.3


def gate(h: dict) -> tuple[str, str] | None:
    """Returns (lane, reason) when the decision needs no LLM, else None."""
    if h["absence"]:
        return (
            "needs_check",
            f"Something is missing here ({h['title'].lower()}), which a camera can't prove. Please confirm in person.",
        )
    ev = [e for e in h["evidence"] if e["score"] is None or e["score"] >= MIN_SCORE]
    if not ev:
        frames = sorted({e["frame_idx"] for e in h["evidence"]}) or [h["frame_idx"]]
        return "rejected", f"SAM found no '{h['phrase']}' near frame {frames[0]}, so this claim was dropped."
    return None


def _evidence_image(h: dict, frame_dir: Path) -> bytes:
    e = h["evidence"][0]
    im = Image.open(frame_dir / f"{e['frame_idx']}.jpg").convert("RGB")
    ImageDraw.Draw(im).rectangle(e["box"], outline=(255, 40, 40), width=4)
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=85)
    return buf.getvalue()


async def judge(h: dict, frame_dir: Path) -> None:
    g = gate(h)
    if g:
        h["lane"], h["critic_reason"] = g
        return
    jpeg = _evidence_image(h, frame_dir)
    content = [
        {
            "type": "input_text",
            "text": f"Claimed hazard: {h['title']} (object: '{h['phrase']}', category {h['category']}). "
            f"Rationale given: {h['rationale']}. The red box is where the segmentation model found '{h['phrase']}'.",
        },
        {"type": "input_image", "image_url": data_url(jpeg)},
    ]
    try:
        out = await spark_json(
            name="critic", system=SYSTEM, content=content, schema=SCHEMA, images=[jpeg], effort="low"
        )
        h["lane"], h["critic_reason"] = out["verdict"], out["reason"]
    except Exception as e:  # LLM failure must not lose a pixel-verified hazard
        h["lane"], h["critic_reason"] = (
            "verified",
            f"SAM located '{h['phrase']}' (critic unavailable: {type(e).__name__}).",
        )


async def judge_all(hazards: list[dict], frame_dir: Path, on_done=None) -> None:
    async def one(h):
        await judge(h, frame_dir)
        if on_done:
            await on_done(h)

    await asyncio.gather(*(one(h) for h in hazards))
