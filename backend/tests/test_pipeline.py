"""Offline end-to-end test: real ffmpeg + FastAPI, model calls stubbed. Proves the plumbing before an API key exists."""

import os
import subprocess
import time
from types import SimpleNamespace

import pytest

os.environ["SAFENEST_DATA_DIR"] = "/tmp/safenest_test_data"

from fastapi.testclient import TestClient

from app import main
from app.pipeline import critic, grounder, spotter

SPOT = {
    "title": "Hallway",
    "summary": "Two things to fix.",
    "hazards": [
        {
            "phrase": "throw rug",
            "title": "Loose throw rug",
            "category": "floors_rugs",
            "room": "hallway",
            "severity": 3,
            "rationale": "Trips.",
            "absence": False,
            "fix_action": "Remove rug",
            "fix_cost_low": 0,
            "fix_cost_high": 10,
            "frame_idx": 1,
        },
        {
            "phrase": "loose handrail",
            "title": "Loose handrail",
            "category": "stairs_steps",
            "room": "stairs",
            "severity": 2,
            "rationale": "Grip.",
            "absence": False,
            "fix_action": "Tighten",
            "fix_cost_low": 0,
            "fix_cost_high": 5,
            "frame_idx": 2,
        },
        {
            "phrase": "bathtub",
            "title": "No grab bar by tub",
            "category": "bathroom",
            "room": "bathroom",
            "severity": 3,
            "rationale": "Slips.",
            "absence": True,
            "fix_action": "Install grab bar",
            "fix_cost_low": 20,
            "fix_cost_high": 60,
            "frame_idx": 0,
        },
    ],
}


def _sam_line(x1, y1, x2, y2):
    from meta_sam_parser._mask_codec import _encode_raster

    w, h = x2 - x1 + 1, y2 - y1 + 1  # parser boxes are half-open
    bits = [1 if 2 <= x < w - 2 and 2 <= y < h - 2 else 0 for y in range(h) for x in range(w)]
    return f"<0f>0<|box;x1={x1};y1={y1};x2={x2};y2={y2};w=320;h=240|><|mask;x=0;y=0;data={h},{w},{_encode_raster(bits, w, h)}|>\n"


BOX_ONLY = _sam_line(10, 20, 110, 90)


@pytest.fixture
def video(tmp_path):
    p = tmp_path / "walk.mp4"
    subprocess.run(
        [
            "ffmpeg",
            "-v",
            "error",
            "-f",
            "lavfi",
            "-i",
            "testsrc=duration=4:size=320x240:rate=10",
            "-pix_fmt",
            "yuv420p",
            str(p),
        ],
        check=True,
    )
    return p


def test_parse_sam_box_fallback():
    [d] = grounder.parse_sam(BOX_ONLY)
    assert d["box"][:2] == [10.0, 20.0]
    assert d["mask_path"].startswith("M") and d["mask_path"] != "M10.0 20.0L111.0 20.0L111.0 91.0L10.0 91.0Z"
    xs = [float(v) for v in d["mask_path"].replace("M", " ").replace("L", " ").replace("Z", " ").split()[::2]]
    assert 10 <= min(xs) and max(xs) <= 111  # mask lands inside its box, in frame pixels
    assert grounder.parse_sam("") == []


def test_place_path_offsets_into_frame():
    b = SimpleNamespace(left=100, top=50, right=120, bottom=60)
    assert grounder._place_path("M0 0L10 0L10 5Z", b, 10, 5) == "M100.0 50.0L120.0 50.0L120.0 60.0Z"


def test_end_to_end(video, monkeypatch):
    async def fake_spark(*, name, **kw):
        return SPOT if name == "spotter" else {"verdict": "verified", "reason": "Rug edge is curled."}

    async def fake_sam(phrase, jpeg):
        return BOX_ONLY if phrase in ("throw rug", "bathtub") else ""

    monkeypatch.setattr(spotter, "spark_json", fake_spark)
    monkeypatch.setattr(critic, "spark_json", fake_spark)
    monkeypatch.setattr(grounder, "sam_image", fake_sam)
    c = TestClient(main.app)
    r = c.post(
        "/api/scans", files={"video": ("walk.mp4", video.read_bytes(), "video/mp4")}, data={"label": "before"}
    )
    assert r.status_code == 201
    sid = r.json()["scan_id"]
    for _ in range(50):
        s = c.get(f"/api/scans/{sid}").json()
        if s["status"] != "processing":
            break
        time.sleep(0.1)
    assert s["status"] == "complete", s
    lanes = {h["phrase"]: h["lane"] for h in s["hazards"]}
    assert lanes == {"throw rug": "verified", "loose handrail": "rejected", "bathtub": "needs_check"}
    assert s["frames"] and s["frames"][0]["url"].endswith("/frames/0.jpg")
    assert c.get(s["frames"][0]["url"]).status_code == 200
    ev = c.get(f"/api/scans/{sid}/events").text
    assert "hazard_judged" in ev and "event: complete" in ev
    pdf = c.get(f"/api/scans/{sid}/report.pdf")
    assert pdf.content[:4] == b"%PDF"
