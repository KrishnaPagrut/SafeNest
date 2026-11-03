"""Scans persist as JSON on disk (data/scans/{id}/scan.json + events.jsonl) so a restart or demo replay keeps them."""

import asyncio
import json
import secrets
from datetime import UTC, datetime
from pathlib import Path

from app.config import SCANS_DIR

_subscribers: dict[str, list[asyncio.Queue]] = {}


def new_id(prefix: str) -> str:
    return f"{prefix}_{secrets.token_hex(3)}"


def scan_dir(scan_id: str) -> Path:
    return SCANS_DIR / scan_id


def frame_dir(scan_id: str) -> Path:
    return scan_dir(scan_id) / "frames"


def save(scan: dict) -> None:
    d = scan_dir(scan["scan_id"])
    d.mkdir(parents=True, exist_ok=True)
    tmp = d / "scan.json.tmp"
    tmp.write_text(json.dumps(scan, indent=1))
    tmp.replace(d / "scan.json")


def load(scan_id: str) -> dict | None:
    p = scan_dir(scan_id) / "scan.json"
    return json.loads(p.read_text()) if p.exists() else None


def all_scans() -> list[dict]:
    out = [json.loads(p.read_text()) for p in SCANS_DIR.glob("*/scan.json")]
    return sorted(out, key=lambda s: s["created_at"], reverse=True)


def find_hazard(hazard_id: str) -> tuple[dict, dict] | None:
    for s in all_scans():
        for h in s["hazards"]:
            if h["hazard_id"] == hazard_id:
                return s, h
    return None


def now() -> str:
    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def events(scan_id: str) -> list[dict]:
    p = scan_dir(scan_id) / "events.jsonl"
    return [json.loads(line) for line in p.read_text().splitlines()] if p.exists() else []


async def emit(scan_id: str, event: str, data: dict) -> None:
    msg = {"event": event, "data": data}
    with open(scan_dir(scan_id) / "events.jsonl", "a") as f:
        f.write(json.dumps(msg) + "\n")
    for q in _subscribers.get(scan_id, []):
        q.put_nowait(msg)


def subscribe(scan_id: str) -> asyncio.Queue:
    q: asyncio.Queue = asyncio.Queue()
    _subscribers.setdefault(scan_id, []).append(q)
    return q


def unsubscribe(scan_id: str, q: asyncio.Queue) -> None:
    _subscribers.get(scan_id, []).remove(q)
