"""Re-film diff: which before-hazards are gone in the after walkthrough. A 'fixed' claim needs SAM to come up
empty for that phrase across the after frames — the real verification (Muse Image previews are only persuasion)."""

import asyncio
from pathlib import Path

from app.llm.client import sam_image
from app.pipeline.grounder import parse_sam

ACTIVE = ("verified", "needs_check")


def _match(bh: dict, after: list[dict]) -> dict | None:
    p = bh["phrase"].lower()
    for ah in after:
        if ah["lane"] in ACTIVE and ah["phrase"].lower() == p:
            return ah
    for ah in after:
        if (
            ah["lane"] in ACTIVE
            and ah["category"] == bh["category"]
            and ah["room"].lower() == bh["room"].lower()
        ):
            return ah
    return None


async def _still_seen(phrase: str, after_frames: list[dict], frame_dir: Path) -> int:
    """Number of after-frames where SAM still finds the phrase."""
    hits = 0
    for f in after_frames:
        text = await sam_image(phrase, (frame_dir / f"{f['frame_idx']}.jpg").read_bytes())
        hits += bool(parse_sam(text))
    return hits


def risk_score(hazards: list[dict]) -> int:
    return sum(h["severity"] for h in hazards if h["lane"] in ACTIVE)


async def compare(before: dict, after: dict, after_frame_dir: Path) -> dict:
    items, used = [], set()
    pending = []
    for bh in before["hazards"]:
        if bh["lane"] not in ACTIVE:
            continue
        ah = _match(bh, after["hazards"])
        if ah:
            used.add(ah["hazard_id"])
            items.append(
                {
                    "before_hazard_id": bh["hazard_id"],
                    "after_hazard_id": ah["hazard_id"],
                    "status": "still_present",
                    "title": bh["title"],
                    "note": f"Still visible in the {ah['room']}."
                    if not bh["absence"]
                    else "Still needs an in-person check.",
                }
            )
        elif bh["absence"]:
            items.append(
                {
                    "before_hazard_id": bh["hazard_id"],
                    "after_hazard_id": None,
                    "status": "fixed",
                    "title": bh["title"],
                    "note": "Not flagged in the new walkthrough. Confirm in person.",
                }
            )
        else:
            pending.append(bh)

    async def check(bh):
        hits = await _still_seen(bh["phrase"], after["frames"], after_frame_dir)
        status = "fixed" if hits == 0 else "still_present"
        note = (
            f"SAM no longer finds '{bh['phrase']}' in any of {len(after['frames'])} frames."
            if hits == 0
            else f"SAM still sees '{bh['phrase']}' in {hits} frame(s)."
        )
        return {
            "before_hazard_id": bh["hazard_id"],
            "after_hazard_id": None,
            "status": status,
            "title": bh["title"],
            "note": note,
        }

    items += await asyncio.gather(*(check(bh) for bh in pending))
    for ah in after["hazards"]:
        if ah["lane"] == "verified" and ah["hazard_id"] not in used:
            items.append(
                {
                    "before_hazard_id": None,
                    "after_hazard_id": ah["hazard_id"],
                    "status": "new",
                    "title": ah["title"],
                    "note": f"New in the {ah['room']}.",
                }
            )
    after_active = [h for h in after["hazards"] if h["hazard_id"] in used or h["lane"] == "verified"]
    return {
        "before_id": before["scan_id"],
        "after_id": after["scan_id"],
        "items": items,
        "score_before": risk_score(before["hazards"]),
        "score_after": risk_score(after_active),
    }
