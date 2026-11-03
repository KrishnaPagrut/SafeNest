"""Muse Image 'what it looks like fixed' preview for one hazard. Persuasion for the parent, not proof."""

import hashlib
from pathlib import Path

from app import config
from app.llm.client import image_edit


def default_instruction(h: dict) -> str:
    return (
        f"Photorealistic edit of this exact room. Apply this home-safety fix: {h['fix_action']} "
        f"(the hazard: {h['title'].lower()}). Keep everything else identical: same camera angle, lighting, "
        f"walls, furniture and colors. No people, no text."
    )


async def preview(h: dict, frame_dir: Path, instruction: str | None = None) -> tuple[str, str]:
    idx = h["evidence"][0]["frame_idx"] if h["evidence"] else h["frame_idx"]
    instruction = instruction or default_instruction(h)
    img = await image_edit((frame_dir / f"{idx}.jpg").read_bytes(), instruction)
    name = f"fix_{h['hazard_id']}_{hashlib.sha1(instruction.encode()).hexdigest()[:8]}.webp"
    (config.MEDIA_DIR / name).write_bytes(img)
    return name, instruction
