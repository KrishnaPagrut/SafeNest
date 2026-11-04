# Demo walkthrough videos

Put the phone recordings here:

- `before.mp4`: a hallway or room staged with the hazards, filmed landscape, 20–30 s, slow steady walk, lights on.
- `after.mp4`: the same path and angles with most hazards fixed, exactly one left unfixed.
- `before2.mp4` (optional): a different room.

Keep each file under about 50 MB. Bigger ones get re-encoded:

    ffmpeg -i in.mov -vf scale=1280:-2 -c:v libx264 -crf 26 -an demo/before.mp4
