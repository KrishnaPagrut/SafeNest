# Review notes — SafeNest demo film v1

**Picked storyline:** A, "the claim that had to prove itself" (one walkthrough through three Meta models, with one false claim dropped on camera). Not built: B (split-screen before/after collapsing to one) and C (kinetic numbers cut on the beat).

**What was measured:** `npx hyperframes check` passes with 0 errors and 0 warnings (lint, runtime, layout, craft, audio). Review sheets (beats, seams, phone) were read. The rendered file's audio is measured with `npx hyperframes audio`, not heard.

**What nobody checked:** the voice is local Kokoro (am_michael); pronunciation of "SAM 3.1" and "Muse" was not listened to. Music is a local MusicGen bed if it finished in time; otherwise the film is voice only and says so in the delivery note.

**Weakest shot:** the hook and the proof section both come from the built-in sample walkthrough, whose keyframes are drawn placeholders. Re-record `assets/rec/*.mp4` with `pw/record.mjs` once real before/after footage is cached, then `node build.mjs` and re-render; the narration does not claim the footage is real.

**Kept on purpose:** the pending strip spotlight in the Spark and SAM scenes covers eight cards at once; it is the only shot where the whole table is the point.

**With more time:** a riser into the Compare payoff and card-landing pops (no free SFX source was reachable offline), and a cut of the real hallway footage behind the "1 in 4" line.
