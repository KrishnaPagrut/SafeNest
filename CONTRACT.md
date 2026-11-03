# SafeNest — API & data contract

Source of truth for backend (meta_dev) and frontend (meta_krishna). Change it in the same PR as the code that
needs the change, and tell the other side. Never silently diverge.

- Backend: FastAPI on `http://localhost:8000`, all routes under `/api`.
- Frontend: Vite on `http://localhost:5173`, proxies `/api` → `:8000`.
- Coordinates: every box / mask is in **source-frame pixels** of the frame it belongs to (`frame.w × frame.h`).
  Scale to the rendered video size on the client.
- Times: seconds as float (`t_sec`), from the start of the video.
- URLs (`Frame.url`, `Scan.video_url`, `fix_preview_url`, …) are root-relative (`/api/...`); use them verbatim.
- One `Evidence` entry = one SAM instance in one frame. A hazard can have several per frame (two rugs):
  draw every entry whose `frame_idx` matches the frame on screen.
- IDs: short strings (`scan_…`, `hz_…`). Treat as opaque.

---

## 1. Pipeline (what the backend does per scan)

```
upload video ──► extract keyframes (ffmpeg, 1 fps, max 45) 
            ──► SPOTTER   muse-spark-1.3, keyframes as images → candidate hazards (strict JSON, §4.1)
            ──► GROUNDER  sam-3.1, one call per (hazard.phrase × nearby keyframe) → masks
            ──► CRITIC    deterministic gate on SAM evidence + muse-spark-1.3 review (§4.2) → lane
            ──► complete
on demand:  FIX PREVIEW  muse-image-1.0 edit of the best evidence frame → "after" image
on demand:  COMPARE      after-scan vs before-scan → per-hazard fixed / still_present / new
on demand:  REPORT       one-page PDF
```

Lanes (the three columns in the Review UI):

| lane          | meaning                                                                 |
|---------------|-------------------------------------------------------------------------|
| `verified`    | Spotter claimed it AND SAM found pixels for it. Draw the mask.          |
| `rejected`    | Spotter claimed it, SAM found nothing (or Critic overruled). Show the reason — this is a feature, not an error. |
| `needs_check` | Absence hazard (no grab bar, no night light, no handrail). Not pixel-verifiable; human must confirm. |

---

## 2. REST endpoints

### `POST /api/scans` — upload a walkthrough
`multipart/form-data`: `video` (mp4/mov, ≤ 200 MB), `label` (`"before"` | `"after"`, default `"before"`),
`baseline_scan_id` (optional, for an after-scan), `notes` (optional free text, e.g. "Mom uses a walker").

```json
201 { "scan_id": "scan_8f2a", "status": "processing" }
```

### `GET /api/scans/{scan_id}/events` — SSE progress stream
`text/event-stream`. Each message: `event: <type>` + `data: <json>`. Types:

| event              | data                                                              |
|--------------------|-------------------------------------------------------------------|
| `stage`            | `{ "stage": "frames" | "spotter" | "grounder" | "critic", "status": "start" | "done", "detail": "…" }` |
| `hazard_proposed`  | `Hazard` (lane = `"pending"`)                                     |
| `hazard_grounded`  | `Hazard` (evidence filled, lane = `"pending"`)                    |
| `hazard_judged`    | `Hazard` (final lane + `critic_reason`)                           |
| `complete`         | `Scan`                                                            |
| `error`            | `{ "message": "…", "stage": "…" }` (scan may still complete partially) |

If the scan is already complete, the stream immediately replays all events then `complete`. (So the demo can
"play back" a cached scan with the same animation.)

### `GET /api/scans` — list
```json
200 [ { "scan_id": "scan_8f2a", "label": "before", "status": "complete", "created_at": "2026-11-03T22:10:00Z",
        "title": "Mom's hallway + bathroom", "hazard_counts": { "verified": 6, "rejected": 2, "needs_check": 2 } } ]
```

### `GET /api/scans/{scan_id}` — full scan → `Scan` (§3)

### `GET /api/scans/{scan_id}/video` — original video (supports range requests)
### `GET /api/scans/{scan_id}/frames/{frame_idx}.jpg` — keyframe image

### `POST /api/hazards/{hazard_id}/fix_preview` — generate "what it looks like fixed"
Body: `{}` (optional `{ "instruction": "replace the rug with non-slip flooring" }`).
```json
200 { "hazard_id": "hz_31", "before_url": "/api/scans/scan_8f2a/frames/4.jpg",
      "after_url": "/api/media/fix_hz_31.png", "instruction": "Remove the throw rug; keep everything else identical." }
```
Cached; calling again returns the same image unless `instruction` changes.

### `POST /api/hazards/{hazard_id}/track` — SAM 3.1 video tracking of one hazard through the walkthrough
Slow-ish (one SAM video call, ~300 frames at 10 fps; cached after first call). Overlay on the `<video>`: at time
`t`, draw the track entry with the largest `t_sec ≤ t`. Box/mask are in the tracking clip's pixels, which equal the
keyframe size (both are scaled to ≤960 px wide), so reuse `frames[0].w/h` as the coordinate space.
```json
200 { "hazard_id": "hz_8f2a_0", "phrase": "throw rug", "fps": 10, "frames": 300,
      "objects": [ { "object_id": "0", "track": [ { "frame_index": 0, "t_sec": 0.0, "box": [..], "mask_path": "M..Z", "score": 0.91 } ] } ] }
```

### `POST /api/scans/{after_id}/compare/{before_id}` — re-film diff → `Comparison` (§3)

### `GET /api/scans/{scan_id}/report.pdf` — one-page PDF (if a comparison exists for this scan, it is included)

### `GET /api/media/{name}` — generated images

### `GET /api/health` → `{ "ok": true, "cache_only": false, "model": "muse-spark-1.3" }`

---

## 3. Types

```ts
type Lane = "pending" | "verified" | "rejected" | "needs_check";

interface Frame { frame_idx: number; t_sec: number; w: number; h: number; url: string }

interface Evidence {
  frame_idx: number;
  t_sec: number;
  box: [number, number, number, number];   // x1, y1, x2, y2 in frame px
  mask_path: string;                       // SVG path in FRAME px (already offset by box), may contain several
                                           // "M..Z" subpaths for one object — use ctx.fill(new Path2D(mask_path), "evenodd")
  score: number | null;                    // SAM confidence if available
}

interface Hazard {
  hazard_id: string;
  phrase: string;          // short noun phrase sent to SAM, e.g. "throw rug"
  title: string;           // human label, e.g. "Loose throw rug in hallway"
  category: string;        // STEADI-style category, see §5
  room: string;            // "hallway", "bathroom", "stairs", ...
  severity: 1 | 2 | 3;     // 3 = fix today
  rationale: string;       // why it's a fall risk, 1 sentence
  fix: { action: string; est_cost_usd: [number, number] };   // e.g. ["Remove rug or add non-slip backing", [0, 15]]
  absence: boolean;        // true for "missing X" hazards → needs_check lane
  t_sec: number;           // Spotter's best timestamp
  frame_idx: number;       // nearest keyframe
  lane: Lane;
  critic_reason: string | null;   // why rejected / why verified, shown in UI
  evidence: Evidence[];    // empty unless SAM matched
  fix_preview_url: string | null;
}

interface Scan {
  scan_id: string;
  label: "before" | "after";
  baseline_scan_id: string | null;
  status: "processing" | "complete" | "error";
  title: string;           // Spotter-generated, e.g. "Hallway, bathroom and stairs"
  summary: string;         // 2–3 sentence plain-English summary for the family
  created_at: string;
  video_url: string;
  duration_sec: number;
  frames: Frame[];
  hazards: Hazard[];
  timings_ms: Record<string, number>;   // per stage, for the README/demo
}

interface Comparison {
  before_id: string;
  after_id: string;
  items: {
    before_hazard_id: string | null;
    after_hazard_id: string | null;
    status: "fixed" | "still_present" | "new";
    title: string;
    note: string;           // e.g. "Rug no longer detected in hallway (SAM: 0 px)"
  }[];
  score_before: number;    // simple risk score = Σ severity of verified+needs_check hazards
  score_after: number;
}
```

---

## 4. Agent schemas (strict JSON via `response_format: json_schema`)

### 4.1 Spotter output
```json
{
  "title": "Hallway, bathroom and stairs",
  "summary": "…",
  "hazards": [
    { "phrase": "throw rug", "title": "Loose throw rug in hallway", "category": "floors_rugs",
      "room": "hallway", "severity": 3, "rationale": "…", "absence": false,
      "fix_action": "Remove the rug or add non-slip backing", "fix_cost_low": 0, "fix_cost_high": 15,
      "t_sec": 4.0 }
  ]
}
```
Rules given to the model: `phrase` must be a 1–3 word concrete noun phrase naming a visible object
("extension cord", "shoes on stairs"), never a description of a situation; absence hazards set `absence: true`
and `phrase` names the place ("bathtub") so we can still show where.

### 4.2 Critic output (per hazard, after SAM)
```json
{ "verdict": "verified | rejected | needs_check", "reason": "one sentence shown to the user" }
```
Deterministic gate runs first: `absence → needs_check`; no SAM pixels → `rejected`
("SAM found no 'loose handrail' in frames 3–5"). Only hazards with pixels go to the LLM Critic, which sees the
evidence crop and may still reject (e.g. "the rug has a rubber backing visible").

---

## 5. Categories (fixed list)
`floors_rugs`, `cords_clutter`, `stairs_steps`, `lighting`, `bathroom`, `furniture`, `reach_storage`, `other`.

---

## 6. Demo / cache
- Every model call is cached in SQLite keyed by `sha256(model, request-json, input-file hashes)`.
- `SAFENEST_CACHE_ONLY=1` → never hit the network; a cache miss is an `error` event, not a crash.
- `demo/` holds the before/after walkthrough videos; `make demo` replays them from cache with zero network.
