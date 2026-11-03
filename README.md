# SafeNest

**Film a 30-second walk through your parent's home. SafeNest finds the fall hazards, proves each one with pixels,
shows the family what the fixed room looks like, and confirms the fixes when you film again.**

Built for the Meta Global AI Developer Hackathon (Indie track, "Build for Your World").

## Why

- More than 1 in 4 Americans aged 65+ falls each year (CDC, 14M+ people). Falls are the leading cause of
  injury death in that age group.
- Fixing hazards at home measurably reduces falls (Cochrane review: home-safety interventions, larger effect for
  high-risk people). Today that takes an occupational-therapy home visit with a waitlist and a bill.
- The people who notice the loose rug are usually adult children on a weekend visit. SafeNest gives them an OT-style
  checklist in a couple of minutes, from a phone video.

## How it works

```
phone video ──► keyframes (ffmpeg, 1 fps)
           ──► SPOTTER   Muse Spark 1.3 (vision, strict JSON schema): candidate hazards, each named by a short
                         noun phrase, mapped to the CDC STEADI home-safety checklist
           ──► GROUNDER  SAM 3.1: one segmentation call per claimed hazard around its timestamp
           ──► CRITIC    gate: no pixels → claim REJECTED on screen; "missing grab bar" → NEEDS HUMAN CHECK;
                         pixel-backed claims get a second Muse Spark review of the evidence crop
           ──► FIX PREVIEW  Muse Image edit of the evidence frame: "this is the hallway without the rug"
           ──► TRACK     SAM 3.1 video tracking: the hazard's mask follows it through the walkthrough
           ──► RE-FILM DIFF  film again after fixing; SAM confirms each fixed hazard is gone (0 px)
           ──► one-page PDF for the family or an OT
```

**The key idea: one Meta model checks another.** Language models make things up, and a hazard checklist that
invents hazards is worse than none. SAM 3.1 takes a single short noun phrase and returns pixels or nothing, which
makes it a natural fact-checker for Spark's claims. Every hazard SafeNest shows is backed by a mask on a real frame.
Claims SAM can't find are dropped, and they stay visible in a "rejected" lane with the reason, so you can see the
system being honest.

### Meta models used
| Model | Role |
|---|---|
| `muse-spark-1.3` | Spotter: multimodal hazard finding with strict JSON-schema output. Critic: reviews each SAM evidence crop. |
| `sam-3.1` | Image segmentation as an anti-hallucination gate; video tracking for the playback overlay; "is it gone?" check on the re-film. |
| `muse-image-1.0` | Edits the real frame into the fixed room. This step persuades a parent who resists changes; it is not the proof. |

## Run it

```bash
cp .env.example .env          # add MODEL_API_KEY
cd backend && uv sync && uv run uvicorn app.main:app --port 8000
cd frontend && npm install && npm run dev     # http://localhost:5173
```

- `make test` runs the offline end-to-end test (real ffmpeg + API, model calls stubbed).
- `make demo` replays the recorded demo from the response cache with zero network
  (`SAFENEST_CACHE_ONLY=1`).
- **Cost safety:** every live call is priced and recorded. `SAFENEST_BUDGET_USD` (default $25) is a hard cap;
  past it the app serves only the cache. `/api/health` shows the running spend.

## Repo
- `CONTRACT.md`: API and data contract between backend and frontend.
- `backend/app/pipeline/`: one module per stage (frames, spotter, grounder, critic, tracker, compare, fix_preview, report).
- `backend/app/llm/`: Meta Model API adapter, content-hash cache, spend cap, prompts.
- `notes/`: status, journal, handoff, Meta API notes.

SafeNest is a checklist aid based on the CDC STEADI home-safety checklist. It is not a medical assessment.
