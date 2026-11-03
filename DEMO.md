# Demo video script (target 2:30, hard max 3:00)

Recorded at 1920×1080 from a cached run (`make demo`), so there's no network or latency risk. Narration in quotes.

| Time | Screen | Narration |
|---|---|---|
| 0:00–0:15 | Phone footage of a real hallway: rug, cord, shoes on the stairs | "One in four Americans over 65 falls every year. Most falls happen at home, and most are caused by things you'd walk right past." |
| 0:15–0:30 | Upload page, then drop `before.mp4` | "This is my grandma's hallway. I filmed it on my phone in thirty seconds." |
| 0:30–1:05 | Review: the pipeline rail lights up ffmpeg → **Muse Spark 1.3** → **SAM 3.1** → **Muse Spark critic**. Hazard cards appear as "pending" and then sort into Verified / Rejected / Check in person | "Muse Spark watches the walkthrough and proposes hazards, each named by a short phrase. Then SAM 3.1 has to find every one of them in the pixels." |
| 1:05–1:20 | Zoom on a REJECTED card: "AI claim dropped · SAM found 0 px for 'loose handrail'" | "Spark thought the handrail was loose. SAM found no evidence, so SafeNest dropped it. One Meta model fact-checks another, and it shows its work." |
| 1:20–1:35 | Click VERIFIED "throw rug", then "Track in video": the red mask follows the rug as the camera walks | "Every hazard we keep is backed by a mask on a real frame, tracked through the video." |
| 1:35–1:50 | NEEDS CHECK card: "No grab bar by the tub" | "Some hazards are things that are missing. A camera can't prove those, so we ask a person to check them in person." |
| 1:50–2:05 | "Show it fixed": Muse Image before/after slider of the hallway without the rug | "Muse Image shows Mom her own hallway with the fix. It's easier to say yes when you can see it." |
| 2:05–2:25 | Upload `after.mp4` → Compare: green FIXED chips with "SAM: 0 px for 'throw rug'", one amber STILL PRESENT, risk score 14 → 4 | "After the weekend, film it again. SAM confirms the rug and the cord are really gone. The shoes on the stairs are still there." |
| 2:25–2:40 | Report PDF | "One page for the family, or for an occupational therapist." |
| 2:40–2:50 | Title card | "SafeNest. Build for your world, starting with the people who built yours." |

Backup plan: if the live re-film diff looks weak, show the Compare page from the cached run. Never claim live for a
step that is cached in the recording.
