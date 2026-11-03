"""Keyframe extraction with ffmpeg. Frames are the unit both Spark and SAM work on, and what the UI overlays."""

import json
import subprocess
from pathlib import Path

from PIL import Image

from app import config


def probe_duration(video: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", str(video)],
        capture_output=True,
        text=True,
        check=True,
    )
    return float(json.loads(out.stdout)["format"]["duration"])


def extract(video: Path, out_dir: Path) -> tuple[list[dict], float]:
    """Writes out_dir/{i}.jpg at config.FPS (capped at MAX_FRAMES by lowering fps) and returns Frame dicts
    without `url` (the API layer fills that in)."""
    out_dir.mkdir(parents=True, exist_ok=True)
    duration = probe_duration(video)
    fps = min(config.FPS, config.MAX_FRAMES / max(duration, 0.1))
    subprocess.run(
        [
            "ffmpeg",
            "-v",
            "error",
            "-y",
            "-i",
            str(video),
            "-vf",
            f"fps={fps},scale='min({config.FRAME_WIDTH},iw)':-2",
            "-q:v",
            "3",
            str(out_dir / "%d.jpg"),
        ],
        check=True,
    )
    frames = []
    for p in sorted(out_dir.glob("*.jpg"), key=lambda p: int(p.stem)):
        i = int(p.stem) - 1  # ffmpeg numbers from 1
        p.rename(out_dir / f"{i}.jpg")
    for i in range(len(list(out_dir.glob("*.jpg")))):
        with Image.open(out_dir / f"{i}.jpg") as im:
            w, h = im.size
        # fps filter emits the frame nearest each 1/fps tick starting at t=0.
        frames.append({"frame_idx": i, "t_sec": round(i / fps, 2), "w": w, "h": h})
    return frames, duration
