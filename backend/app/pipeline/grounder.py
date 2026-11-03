"""Grounder: SAM 3.1 looks for each Spotter phrase in the keyframes around its timestamp.
Pixels found = evidence; nothing found = the claim gets rejected by the critic gate."""

import asyncio
import logging
import re
from pathlib import Path

from meta_sam_parser import CompletedOutcome, decode_mask_to_svg_path, image_segmentation_format

from app import config
from app.llm.client import sam_image

log = logging.getLogger("safenest.grounder")
_NUM = re.compile(r"-?\d+(?:\.\d+)?")


def parse_sam(text: str) -> list[dict]:
    """SAM special-token text → [{box, mask_path, score}] in frame pixels."""
    if not text.strip():
        return []
    parser = image_segmentation_format().create_parser()
    parser.push(text if text.endswith("\n") else text + "\n")
    result = parser.finish(CompletedOutcome()).result
    boxes, masks = {}, {}
    for rec in result.records:
        if rec.kind == "box":
            boxes[rec.object_id] = rec
        elif rec.kind == "mask":
            masks[rec.object_id] = rec
    out = []
    for oid, b in boxes.items():
        box = [float(b.left), float(b.top), float(b.right), float(b.bottom)]
        m = masks.get(oid)
        path = None
        score = b.confidence
        if m is not None:
            score = m.confidence if m.confidence is not None else score
            try:
                path = _place_path(decode_mask_to_svg_path(m.mask), m.bounds, m.mask.width, m.mask.height)
            except Exception as e:  # malformed mask → fall back to the box outline
                log.warning("mask decode failed for %s: %s", oid, e)
        if path is None:
            x1, y1, x2, y2 = box
            path = f"M{x1} {y1}L{x2} {y1}L{x2} {y2}L{x1} {y2}Z"
        out.append({"box": box, "mask_path": path, "score": score})
    return out


def _place_path(path: str, bounds, mw: int, mh: int) -> str:
    """Mask rasters are box-local; scale/offset the path's (x, y) pairs into frame pixels."""
    sx = (bounds.right - bounds.left) / mw if mw else 1.0
    sy = (bounds.bottom - bounds.top) / mh if mh else 1.0
    nums = iter(_NUM.findall(path))
    toks = re.split(r"(-?\d+(?:\.\d+)?)", path)
    out, is_x = [], True
    for t in toks:
        if _NUM.fullmatch(t):
            v = float(next(nums))
            v = bounds.left + v * sx if is_x else bounds.top + v * sy
            out.append(f"{v:.1f}")
            is_x = not is_x
        else:
            out.append(t)
    return "".join(out)


async def ground(hazards: list[dict], frames: list[dict], frame_dir: Path, on_done=None) -> None:
    """Fills hazard['evidence'] in place. Absence hazards are still grounded (on their location phrase) so the UI
    can point at where the missing thing should be, but they never count as verification."""
    sem = asyncio.Semaphore(config.SAM_CONCURRENCY)
    n = len(frames)

    async def one(h: dict):
        idxs = range(
            max(0, h["frame_idx"] - config.GROUND_WINDOW), min(n, h["frame_idx"] + config.GROUND_WINDOW + 1)
        )
        evidence = []
        for i in idxs:
            jpeg = (frame_dir / f"{i}.jpg").read_bytes()
            async with sem:
                try:
                    text = await sam_image(h["phrase"], jpeg)
                except Exception as e:
                    log.warning("sam failed %s frame %s: %s", h["phrase"], i, e)
                    continue
            for d in parse_sam(text):
                evidence.append({"frame_idx": i, "t_sec": frames[i]["t_sec"], **d})
        # Best frame first: the Spotter's frame if it matched, then highest score.
        evidence.sort(key=lambda e: (e["frame_idx"] != h["frame_idx"], -(e["score"] or 0)))
        h["evidence"] = evidence
        if on_done:
            await on_done(h)

    await asyncio.gather(*(one(h) for h in hazards))
