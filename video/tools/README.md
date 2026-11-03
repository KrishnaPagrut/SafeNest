# Re-recording the demo film

1. Run the app (`make dev` from the repo root) so http://localhost:5173 serves the Review page.
2. `cd video && npm --prefix tools i playwright` once (Chromium is cached by Playwright).
3. `node tools/record.mjs` writes one webm per beat to `assets/rec/`; re-encode each with
   `ffmpeg -ss <trim> -i x.webm -r 30 -c:v libx264 -crf 18 -g 30 -an x.mp4` and pad short
   clips with `-vf tpad=stop_mode=clone:stop_duration=N` so every scene has footage.
4. `node build.mjs` regenerates `index.html` and `compositions/` from the shot list.
5. `npx hyperframes check` then `npx hyperframes render -o renders/safenest-demo.mp4 -q delivery`.

Voice lines live in `assets/voice/lines.txt`; regenerate with
`HYPERFRAMES_PYTHON=$(which python3.12) npx hyperframes tts "<line>" -v am_michael -o assets/voice/vNN.wav`
and refresh `assets/voice/durations.txt`.
