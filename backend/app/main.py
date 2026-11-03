"""SafeNest API. See CONTRACT.md for the shapes; this file is the only place routes live."""

import asyncio
import json
import logging

from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from app import config, store
from app.pipeline import compare as compare_mod
from app.pipeline import fix_preview, report
from app.pipeline.run import run_scan

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
app = FastAPI(title="SafeNest")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

_comparisons: dict[str, dict] = {}


def _get_scan(scan_id: str) -> dict:
    s = store.load(scan_id)
    if not s:
        raise HTTPException(404, "scan not found")
    return s


def _counts(s: dict) -> dict:
    return {k: sum(h["lane"] == k for h in s["hazards"]) for k in ("verified", "rejected", "needs_check")}


@app.get("/api/health")
def health():
    return {
        "ok": True,
        "cache_only": config.CACHE_ONLY,
        "model": config.SPARK_MODEL,
        "has_key": bool(config.API_KEY),
    }


@app.post("/api/scans", status_code=201)
async def create_scan(
    background: BackgroundTasks,
    video: UploadFile = File(...),
    label: str = Form("before"),
    baseline_scan_id: str | None = Form(None),
    notes: str = Form(""),
):
    sid = store.new_id("scan")
    d = store.scan_dir(sid)
    d.mkdir(parents=True)
    suffix = ".mov" if (video.filename or "").lower().endswith(".mov") else ".mp4"
    path = d / f"video{suffix}"
    path.write_bytes(await video.read())
    scan = {
        "scan_id": sid,
        "label": label,
        "baseline_scan_id": baseline_scan_id,
        "status": "processing",
        "title": video.filename or "Walkthrough",
        "summary": "",
        "created_at": store.now(),
        "video_url": f"/api/scans/{sid}/video",
        "duration_sec": 0,
        "frames": [],
        "hazards": [],
        "timings_ms": {},
        "notes": notes,
    }
    store.save(scan)
    background.add_task(run_scan, scan, path, notes)
    return {"scan_id": sid, "status": "processing"}


@app.get("/api/scans")
def list_scans():
    return [
        {
            "scan_id": s["scan_id"],
            "label": s["label"],
            "status": s["status"],
            "created_at": s["created_at"],
            "title": s["title"],
            "hazard_counts": _counts(s),
        }
        for s in store.all_scans()
    ]


@app.get("/api/scans/{scan_id}")
def get_scan(scan_id: str):
    return _get_scan(scan_id)


@app.get("/api/scans/{scan_id}/events")
async def scan_events(scan_id: str):
    _get_scan(scan_id)

    async def gen():
        q = store.subscribe(scan_id)
        try:
            past = store.events(scan_id)
            for m in past:
                yield {"event": m["event"], "data": json.dumps(m["data"])}
                if m["event"] == "complete":
                    return
            while True:
                m = await asyncio.wait_for(q.get(), timeout=600)
                yield {"event": m["event"], "data": json.dumps(m["data"])}
                if m["event"] == "complete":
                    return
        finally:
            store.unsubscribe(scan_id, q)

    return EventSourceResponse(gen())


@app.get("/api/scans/{scan_id}/video")
def scan_video(scan_id: str):
    d = store.scan_dir(scan_id)
    for name in ("video.mp4", "video.mov"):
        if (d / name).exists():
            return FileResponse(d / name)
    raise HTTPException(404)


@app.get("/api/scans/{scan_id}/frames/{frame_idx}.jpg")
def scan_frame(scan_id: str, frame_idx: int):
    p = store.frame_dir(scan_id) / f"{frame_idx}.jpg"
    if not p.exists():
        raise HTTPException(404)
    return FileResponse(p, media_type="image/jpeg")


class FixBody(BaseModel):
    instruction: str | None = None


@app.post("/api/hazards/{hazard_id}/fix_preview")
async def hazard_fix_preview(hazard_id: str, body: FixBody | None = None):
    found = store.find_hazard(hazard_id)
    if not found:
        raise HTTPException(404, "hazard not found")
    scan, h = found
    name, instruction = await fix_preview.preview(
        h, store.frame_dir(scan["scan_id"]), body.instruction if body else None
    )
    h["fix_preview_url"] = f"/api/media/{name}"
    store.save(scan)
    idx = h["evidence"][0]["frame_idx"] if h["evidence"] else h["frame_idx"]
    return {
        "hazard_id": hazard_id,
        "before_url": f"/api/scans/{scan['scan_id']}/frames/{idx}.jpg",
        "after_url": h["fix_preview_url"],
        "instruction": instruction,
    }


@app.post("/api/scans/{after_id}/compare/{before_id}")
async def compare_scans(after_id: str, before_id: str):
    after, before = _get_scan(after_id), _get_scan(before_id)
    if after["status"] != "complete" or before["status"] != "complete":
        raise HTTPException(409, "both scans must be complete")
    c = await compare_mod.compare(before, after, store.frame_dir(after_id))
    _comparisons[after_id] = _comparisons[before_id] = c
    (store.scan_dir(after_id) / "comparison.json").write_text(json.dumps(c, indent=1))
    return c


@app.get("/api/scans/{scan_id}/report.pdf")
def scan_report(scan_id: str):
    s = _get_scan(scan_id)
    c = _comparisons.get(scan_id)
    p = store.scan_dir(scan_id) / "comparison.json"
    if c is None and p.exists():
        c = json.loads(p.read_text())
    return Response(
        report.build(s, c),
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="safenest-{scan_id}.pdf"'},
    )


@app.get("/api/media/{name}")
def media(name: str):
    p = config.MEDIA_DIR / name
    if not p.exists() or "/" in name:
        raise HTTPException(404)
    return FileResponse(p)
