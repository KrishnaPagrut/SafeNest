# HANDOFF — read this first if you're picking this up cold

**What:** SafeNest — film a walkthrough of an aging parent's home → Muse Spark spots fall hazards → SAM 3.1
verifies each with pixels (no pixels = visibly rejected) → Muse Image previews the fixed room → re-film diff
turns fixed hazards green → one-page PDF for family / OT.

**Who owns what:** meta_dev = backend/pipeline/CONTRACT.md; meta_krishna = frontend/videos/demo video.
**Contract:** `CONTRACT.md` is the source of truth. **API notes:** `notes/meta_api.md`.
**Run:** `cp .env.example .env` (add key) → `make dev`. Cache-only replay: `make demo`.
**Rules:** feature branches, small commits, rebase on main; never push without your human's OK; flags default off.
