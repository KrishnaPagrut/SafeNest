# Filming the demo walkthrough

About 20 minutes, two phone videos, nothing to buy. Any home with a hallway into a bathroom works (apartment or dorm
is fine; stairs are a bonus).

## 1. Set up the mess (put all of these in the path you'll walk)
- **a.** A small loose rug, bath mat or towel on the hallway floor, one corner flipped up.
- **b.** A charger or extension cord lying *across* the walkway, plugged in on one side.
- **c.** A pair of shoes and a backpack on the floor in the middle of the path (on a stair step if you have stairs).
- **d.** A laundry basket, box or pile of clothes partly blocking the way.
- **e.** Bathroom: a loose bath mat next to the tub or shower. Add nothing to the wall, because the app should notice
  there is no grab bar.

Turn on all the lights.

## 2. Film video 1: the messy home (25–40 s, never over 45 s)
- Phone **horizontal**, chest height, steady.
- Start at the far end of the hallway and walk **slowly** (half normal speed) toward the bathroom.
- At each item (a–d), **stop for 2–3 s**, 1–2 m away, with the whole object centered and the camera tilted slightly
  down so the floor shows.
- End in the bathroom: hold 3 s on the tub or shower and the wall beside it, with the bath mat in view.
- No fast swings, no zoom, no people or faces, no mail, addresses or name tags in shot. Sound doesn't matter.

## 3. Fix the home
- Pick up the rug (a), put the cord away (b), and move the basket or box out of the walkway (d).
- Remove or replace the bath mat (e).
- **Leave the shoes and backpack (c) exactly where they are.** The app should report them as still present.

## 4. Film video 2: the fixed home
Same start spot, same route, same speed. Make the same 2–3 s stops at the same spots, even where the item is gone,
and end the same way in the bathroom.

## 5. Optional: hook shot
10 s of a slow handheld shot down the messy hallway, for the film's opening.

## 6. Save the files here
- `demo/before.mp4`: video 1 (messy)
- `demo/after.mp4`: video 2 (fixed)

If a file is over ~50 MB, shrink it:

    ffmpeg -i IN.mov -vf scale=1280:-2 -c:v libx264 -crf 26 -an demo/before.mp4

These files are git-ignored. **Don't commit them**: the repo is public and this is a real home. Copy them to whichever
laptop has the API key, and that laptop runs the pipeline.
