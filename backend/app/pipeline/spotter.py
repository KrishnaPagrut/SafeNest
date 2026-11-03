"""Spotter agent: Muse Spark looks at the walkthrough keyframes and proposes fall hazards as strict JSON."""

from pathlib import Path

from app.llm.client import spark_json

CATEGORIES = [
    "floors_rugs",
    "cords_clutter",
    "stairs_steps",
    "lighting",
    "bathroom",
    "furniture",
    "reach_storage",
    "other",
]

SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["title", "summary", "hazards"],
    "properties": {
        "title": {"type": "string"},
        "summary": {"type": "string"},
        "hazards": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": [
                    "phrase",
                    "title",
                    "category",
                    "room",
                    "severity",
                    "rationale",
                    "absence",
                    "fix_action",
                    "fix_cost_low",
                    "fix_cost_high",
                    "frame_idx",
                ],
                "properties": {
                    "phrase": {"type": "string"},
                    "title": {"type": "string"},
                    "category": {"type": "string", "enum": CATEGORIES},
                    "room": {"type": "string"},
                    "severity": {"type": "integer", "enum": [1, 2, 3]},
                    "rationale": {"type": "string"},
                    "absence": {"type": "boolean"},
                    "fix_action": {"type": "string"},
                    "fix_cost_low": {"type": "number"},
                    "fix_cost_high": {"type": "number"},
                    "frame_idx": {"type": "integer"},
                },
            },
        },
    },
}

SYSTEM = (Path(__file__).parent.parent / "llm" / "prompts" / "spotter.md").read_text()


async def spot(frames: list[dict], frame_dir: Path, notes: str = "") -> dict:
    content: list[dict] = [
        {
            "type": "input_text",
            "text": f"Walkthrough with {len(frames)} keyframes, in order."
            + (f"\nFamily notes: {notes}" if notes else ""),
        }
    ]
    images = []
    for f in frames:
        jpeg = (frame_dir / f"{f['frame_idx']}.jpg").read_bytes()
        images.append(jpeg)
        content.append({"type": "input_text", "text": f"Frame {f['frame_idx']} (t={f['t_sec']}s):"})
        content.append({"type": "input_image", "image_url": _url(jpeg)})
    out = await spark_json(name="spotter", system=SYSTEM, content=content, schema=SCHEMA, images=images)
    n = len(frames)
    for h in out["hazards"]:
        h["frame_idx"] = max(0, min(n - 1, int(h["frame_idx"])))
    return out


def _url(jpeg: bytes) -> str:
    from app.llm.client import data_url

    return data_url(jpeg)
