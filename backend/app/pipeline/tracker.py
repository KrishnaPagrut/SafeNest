"""SAM 3.1 video tracking for one hazard: the mask follows the object as the camera walks past it.
The scan video is re-encoded once to TRACK_FPS so a 30 s walkthrough is ~300 frames (~$0.06 per hazard)."""

import asyncio
import subprocess
from pathlib import Path

from meta_sam_parser import CompletedOutcome, video_segmentation_format

from app.llm.client import sam_video
from app.pipeline.grounder import _mask_path

TRACK_FPS = 10


def tracking_clip(video: Path, out: Path) -> Path:
    if not out.exists():
        subprocess.run(
            [
                "ffmpeg",
                "-v",
                "error",
                "-y",
                "-i",
                str(video),
                "-vf",
                f"fps={TRACK_FPS},scale='min(960,iw)':-2",
                "-c:v",
                "libx264",
                "-preset",
                "veryfast",
                "-crf",
                "28",
                "-an",
                "-pix_fmt",
                "yuv420p",
                str(out),
            ],
            check=True,
        )
    return out


def parse_video(text: str) -> dict[str, list[dict]]:
    """→ {object_id: [{frame_index, t_sec, box, mask_path, score}]} sorted by frame."""
    parser = video_segmentation_format().create_parser()
    parser.push(text if text.endswith("\n") else text + "\n")
    result = parser.finish(CompletedOutcome()).result
    boxes, tracks = {}, {}
    for rec in result.records:
        if rec.kind not in ("box", "mask") or rec.frame is None:
            continue
        k = (rec.object_id, rec.frame.frame_index)
        if rec.kind == "box":
            boxes[k] = rec
        else:
            tracks.setdefault(rec.object_id, {})[rec.frame.frame_index] = rec
    out: dict[str, list[dict]] = {}
    for (oid, fi), b in boxes.items():
        m = tracks.get(oid, {}).get(fi)
        box = [float(b.left), float(b.top), float(b.right), float(b.bottom)]
        out.setdefault(oid, []).append(
            {
                "frame_index": fi,
                "t_sec": round(fi / TRACK_FPS, 2),
                "box": box,
                "mask_path": _mask_path(m, box),
                "score": (m.confidence if m else None) or b.confidence,
            }
        )
    for v in out.values():
        v.sort(key=lambda d: d["frame_index"])
    return out


def _count_frames(clip: Path) -> int:
    out = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-count_packets",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=nb_read_packets",
            "-of",
            "csv=p=0",
            str(clip),
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    return int(out.stdout.strip() or 0)


async def track(phrase: str, video: Path, work_dir: Path) -> dict:
    # ffmpeg/ffprobe block; keep them off the event loop so SSE streams stay live.
    clip = await asyncio.to_thread(tracking_clip, video, work_dir / f"track_{TRACK_FPS}fps.mp4")
    n = await asyncio.to_thread(_count_frames, clip)
    tracks = parse_video(await sam_video(phrase, clip.read_bytes(), n))
    return {
        "fps": TRACK_FPS,
        "frames": n,
        "objects": [{"object_id": k, "track": v} for k, v in tracks.items()],
    }
