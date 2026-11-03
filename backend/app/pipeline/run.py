"""One scan end to end: frames → Spotter → Grounder → Critic, emitting SSE events as it goes."""

import logging
import time
from pathlib import Path

from app import store
from app.pipeline import critic, frames, grounder, spotter

log = logging.getLogger("safenest.run")


async def run_scan(scan: dict, video: Path, notes: str = "") -> None:
    sid = scan["scan_id"]
    fdir = store.frame_dir(sid)
    timings = scan["timings_ms"]
    try:
        t = time.monotonic()
        await store.emit(
            sid, "stage", {"stage": "frames", "status": "start", "detail": "Extracting keyframes"}
        )
        fr, duration = frames.extract(video, fdir)
        scan["frames"] = [{**f, "url": f"/api/scans/{sid}/frames/{f['frame_idx']}.jpg"} for f in fr]
        scan["duration_sec"] = round(duration, 2)
        timings["frames"] = int((time.monotonic() - t) * 1000)
        await store.emit(
            sid, "stage", {"stage": "frames", "status": "done", "detail": f"{len(fr)} keyframes"}
        )

        t = time.monotonic()
        await store.emit(
            sid,
            "stage",
            {"stage": "spotter", "status": "start", "detail": "Muse Spark is looking for hazards"},
        )
        spot = await spotter.spot(fr, fdir, notes)
        scan["title"], scan["summary"] = spot["title"], spot["summary"]
        hazards = []
        for i, s in enumerate(spot["hazards"]):
            h = {
                "hazard_id": f"hz_{sid.split('_')[1]}_{i}",
                "phrase": s["phrase"].strip().lower(),
                "title": s["title"],
                "category": s["category"],
                "room": s["room"],
                "severity": s["severity"],
                "rationale": s["rationale"],
                "fix": {"action": s["fix_action"], "est_cost_usd": [s["fix_cost_low"], s["fix_cost_high"]]},
                "fix_action": s["fix_action"],
                "absence": s["absence"],
                "frame_idx": s["frame_idx"],
                "t_sec": fr[s["frame_idx"]]["t_sec"],
                "lane": "pending",
                "critic_reason": None,
                "evidence": [],
                "fix_preview_url": None,
            }
            hazards.append(h)
            await store.emit(sid, "hazard_proposed", h)
        scan["hazards"] = hazards
        timings["spotter"] = int((time.monotonic() - t) * 1000)
        await store.emit(
            sid,
            "stage",
            {"stage": "spotter", "status": "done", "detail": f"{len(hazards)} candidate hazards"},
        )
        store.save(scan)

        t = time.monotonic()
        await store.emit(
            sid,
            "stage",
            {"stage": "grounder", "status": "start", "detail": "SAM 3.1 is checking each claim for pixels"},
        )

        async def grounded(h):
            await store.emit(sid, "hazard_grounded", h)

        await grounder.ground(hazards, fr, fdir, on_done=grounded)
        timings["grounder"] = int((time.monotonic() - t) * 1000)
        await store.emit(
            sid,
            "stage",
            {
                "stage": "grounder",
                "status": "done",
                "detail": f"{sum(bool(h['evidence']) for h in hazards)}/{len(hazards)} found in pixels",
            },
        )

        t = time.monotonic()
        await store.emit(
            sid, "stage", {"stage": "critic", "status": "start", "detail": "Critic is reviewing the evidence"}
        )

        async def judged(h):
            await store.emit(sid, "hazard_judged", h)

        await critic.judge_all(hazards, fdir, on_done=judged)
        timings["critic"] = int((time.monotonic() - t) * 1000)
        lanes = {k: sum(h["lane"] == k for h in hazards) for k in ("verified", "rejected", "needs_check")}
        await store.emit(sid, "stage", {"stage": "critic", "status": "done", "detail": str(lanes)})
        scan["status"] = "complete"
    except Exception as e:
        log.exception("scan %s failed", sid)
        scan["status"] = "error"
        await store.emit(sid, "error", {"message": f"{type(e).__name__}: {e}", "stage": "pipeline"})
    store.save(scan)
    await store.emit(sid, "complete", scan)
