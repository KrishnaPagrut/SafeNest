// Emits index.html and compositions/*.html from the shot list below. Run: node build.mjs
import fs from 'node:fs'

const W = 1920, H = 1080
const VOICE = Object.fromEntries(fs.readFileSync('assets/voice/durations.txt', 'utf8').trim().split('\n').map((l) => { const [k, v] = l.split(' '); return [k, Number(v)] }))
const FONT = `@font-face{font-family:"Atkinson Next";font-weight:500;src:url("assets/fonts/atkinson-500.woff2") format("woff2")}
@font-face{font-family:"Atkinson Next";font-weight:700;src:url("assets/fonts/atkinson-700.woff2") format("woff2")}
@font-face{font-family:"Fraunces";font-weight:600;src:url("assets/fonts/fraunces-600.woff2") format("woff2")}`

// Shots. ms = media start in the recording. holes/punch/label coordinates are in unscaled screen px.
const shots = [
  { id: 'hook', dur: 9.6, src: 'track.mp4', ms: 1.9, voice: 'v01', voiceAt: 0.2,
    big: { t: 0.4, line1: '1 in 4', line2: 'adults over 65 fall every year' },
    punch: [{ t: 5.0, s: 1.22, cx: 455, cy: 544 }] },
  { id: 'reveal', dur: 7.2, src: 'upload.mp4', ms: 15.4, voice: 'v02', voiceAt: 0.2,
    big: { t: 0.5, line1: 'SafeNest', line2: 'every hazard has to prove itself on camera', accent: true } },
  { id: 'upload', dur: 3.8, src: 'upload.mp4', ms: 0, voice: 'v03', voiceAt: 0.1,
    holes: [{ t: 0.2, r: [104, 662, 576, 112] }, { t: 2.5, off: true }] },
  { id: 'spark', dur: 6.7, src: 'upload.mp4', ms: 3.8, voice: 'v04', voiceAt: 0.1,
    holes: [{ t: 0.3, r: [533, 200, 428, 72] }, { t: 3.3, r: [830, 483, 986, 440] }, { t: 6.2, off: true }],
    label: { t: 0.5, dur: 4.0, text: 'Muse Spark 1.3 names each hazard with a short phrase', x: 533, y: 290 } },
  { id: 'sam', dur: 6.7, src: 'upload.mp4', ms: 10.5, voice: 'v05', voiceAt: 0.1,
    holes: [{ t: 0.3, r: [961, 200, 428, 72] }, { t: 3.1, r: [830, 483, 986, 440] }, { t: 6.2, off: true }],
    label: { t: 0.5, dur: 4.0, text: 'SAM 3.1 has to find that phrase in the pixels', x: 961, y: 290 } },
  { id: 'sort', dur: 5.3, src: 'upload.mp4', ms: 17.2, voice: 'v06', voiceAt: 0.1 },
  { id: 'rejected', dur: 10.9, src: 'rejected.mp4', ms: 0.3, voice: 'v07', voiceAt: 0.2,
    punch: [{ t: 2.0, s: 1.3, cx: 1325, cy: 592 }],
    holes: [{ t: 2.0, r: [1178, 408, 294, 367] }, { t: 10.3, off: true }],
    label: { t: 3.2, dur: 7.0, text: 'Spark claimed it. SAM 3.1 found 0 px. Dropped.', x: 1134, y: 858, accent: true } },
  { id: 'track', dur: 8.4, src: 'track.mp4', ms: 4.0, voice: 'v08', voiceAt: 0.2,
    punch: [{ t: 2.9, s: 1.3, cx: 455, cy: 544 }],
    holes: [{ t: 2.9, r: [104, 326, 702, 437] }, { t: 8.0, off: true }],
    label: { t: 3.6, dur: 4.2, text: 'SAM 3.1 video tracking', x: 104, y: 870 } },
  { id: 'needs', dur: 8.3, src: 'needs-check.mp4', ms: 0.3, voice: 'v09', voiceAt: 0.2,
    punch: [{ t: 1.8, s: 1.3, cx: 1657, cy: 490 }],
    holes: [{ t: 1.8, r: [1507, 428, 299, 125] }, { t: 7.8, off: true }] },
  { id: 'fixed', dur: 8.6, src: 'fixed.mp4', ms: 3.5, voice: 'v10', voiceAt: 3.0,
    holes: [{ t: 3.0, r: [537, 182, 846, 475] }, { t: 8.2, off: true }],
    label: { t: 3.4, dur: 4.6, text: 'Muse Image 1.0 edits the real keyframe', x: 537, y: 740 } },
  { id: 'compare', dur: 11.5, src: 'compare.mp4', ms: 0.5, voice: 'v11', voiceAt: 0.3,
    holes: [{ t: 4.9, r: [104, 951, 1712, 48] }, { t: 7.8, r: [1497, 155, 319, 103] }, { t: 11.0, off: true }],
    label: { t: 8.1, dur: 3.0, text: 'risk score, severity points still present', x: 1170, y: 270 } },
  { id: 'report', dur: 4.6, src: 'report.mp4', ms: 0.5, voice: 'v12', voiceAt: 0.2 },
  { id: 'end', dur: 9.6, voice: 'v13', voiceAt: 0.3, end: true },
]

const ease = { enter: 'power2.out', move: 'power3.inOut', cut: 'none' }
const F = (n) => (n / 30).toFixed(3)

// Hole rect in screen px once the wrapper is scaled by s about (cx, cy).
function scaled([x, y, w, h], p) {
  if (!p) return [x, y, w, h]
  return [p.cx + (x - p.cx) * p.s, p.cy + (y - p.cy) * p.s, w * p.s, h * p.s]
}
function punchAt(shot, t) {
  return (shot.punch ?? []).filter((p) => p.t <= t + 0.01).at(-1)
}

function scene(shot) {
  const id = shot.id
  const parts = []
  const tl = []
  const css = [`#root{position:absolute;inset:0;background:#f5efe4;overflow:hidden;font-family:"Atkinson Next",sans-serif;color:#1f1a14}`,
    `.punch{position:absolute;inset:0;will-change:transform}`,
    `video{position:absolute;left:0;top:0;width:${W}px;height:${H}px;object-fit:contain}`,
    `.scrim{position:absolute;inset:0;pointer-events:none}`,
    `.label{position:absolute;font-weight:700;font-size:34px;line-height:1.2;padding:10px 18px;background:#fffcf6;color:#1f1a14;border:2.5px solid #1e4b3a;border-radius:10px;white-space:nowrap;box-shadow:0 10px 30px -14px rgba(31,26,20,.45)}`,
    `.label.accent{border-color:#d23b3b;color:#d23b3b}`,
    `.big{position:absolute;left:104px;top:868px;width:700px}`,
    `.big .l1{font-family:"Fraunces",serif;font-weight:600;font-size:96px;line-height:1;letter-spacing:-0.01em;transform-origin:left bottom}`,
    `.big .l2{font-weight:500;font-size:30px;line-height:1.25;margin-top:10px;color:#1f1a14}`,
    `.big .bar{height:6px;width:160px;background:#1e4b3a;margin-top:12px;transform-origin:left center}`]

  if (shot.src) {
    parts.push(`<div id="${id}-punch" class="punch"><video id="${id}-v" class="clip" data-start="0" data-duration="${shot.dur}" data-media-start="${shot.ms}" src="assets/rec/${shot.src}" muted playsinline data-track-index="1"></video></div>`)
    for (const p of shot.punch ?? []) {
      tl.push(`tl.fromTo("#${id}-punch",{scale:1,transformOrigin:"${p.cx}px ${p.cy}px"},{scale:${p.s},transformOrigin:"${p.cx}px ${p.cy}px",duration:${F(24)},ease:"${ease.move}"},${p.t});`)
    }
  }

  if (shot.holes) {
    const first = shot.holes[0]
    const r0 = scaled(first.r, punchAt(shot, first.t))
    parts.push(`<svg id="${id}-scrim" class="scrim clip" data-start="${Math.max(0, first.t - 0.1)}" data-duration="${(shot.dur - Math.max(0, first.t - 0.1)).toFixed(2)}" data-track-index="2" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" data-layout-ignore>
  <defs><mask id="${id}-m"><rect width="${W}" height="${H}" fill="#fff"/><rect id="${id}-hole" x="${r0[0]}" y="${r0[1]}" width="${r0[2]}" height="${r0[3]}" rx="8" fill="#000"/></mask></defs>
  <g id="${id}-sg" opacity="0"><rect width="${W}" height="${H}" fill="#1f1a14" opacity="0.55" mask="url(#${id}-m)"/>
  <rect id="${id}-ring" x="${r0[0]}" y="${r0[1]}" width="${r0[2]}" height="${r0[3]}" rx="8" fill="none" stroke="#1e4b3a" stroke-width="3"/></g></svg>`)
    shot.holes.forEach((h, i) => {
      if (h.off) { tl.push(`tl.to("#${id}-sg",{attr:{opacity:0},duration:${F(12)},ease:"${ease.enter}"},${h.t});`); return }
      const r = scaled(h.r, punchAt(shot, h.t))
      const attrs = `{x:${r[0].toFixed(1)},y:${r[1].toFixed(1)},width:${r[2].toFixed(1)},height:${r[3].toFixed(1)}}`
      if (i === 0) {
        const per = (2 * (r[2] + r[3])).toFixed(0)
        tl.push(`tl.fromTo("#${id}-sg",{attr:{opacity:0}},{attr:{opacity:1},duration:${F(18)},ease:"${ease.enter}"},${h.t});`)
        tl.push(`tl.fromTo("#${id}-ring",{attr:{"stroke-dasharray":${per},"stroke-dashoffset":${per}}},{attr:{"stroke-dashoffset":0},duration:${F(22)},ease:"${ease.move}"},${h.t});`)
        tl.push(`tl.set("#${id}-ring",{attr:{"stroke-dasharray":"none"}},${h.t + 22 / 30 + 0.01});`)
      } else {
        tl.push(`tl.to("#${id}-hole",{attr:${attrs},duration:${F(18)},ease:"${ease.move}"},${h.t});tl.to("#${id}-ring",{attr:${attrs},duration:${F(18)},ease:"${ease.move}"},${h.t});`)
      }
    })
  }

  if (shot.label) {
    const l = shot.label
    parts.push(`<div id="${id}-label" class="label clip${l.accent ? ' accent' : ''}" data-start="${l.t}" data-duration="${l.dur}" data-track-index="3" style="left:${l.x}px;top:${l.y}px"><span id="${id}-label-in">${l.text}</span></div>`)
    tl.push(`tl.fromTo("#${id}-label-in",{opacity:0,y:10},{opacity:1,y:0,duration:${F(12)},ease:"${ease.enter}"},${l.t});`)
  }

  if (shot.big) {
    const b = shot.big
    parts.push(`<div id="${id}-big" class="big clip" data-start="${b.t}" data-duration="${(shot.dur - b.t).toFixed(2)}" data-track-index="3"><div id="${id}-l1" class="l1">${b.line1}</div>${b.accent ? `<div id="${id}-bar" class="bar"></div>` : ''}<div id="${id}-l2" class="l2">${b.line2}</div></div>`)
    tl.push(`tl.fromTo("#${id}-l1",{opacity:0,scale:0.86,y:14},{opacity:1,scale:1,y:0,duration:${F(16)},ease:"back.out(1.6)"},${b.t});`)
    if (b.accent) tl.push(`tl.fromTo("#${id}-bar",{scaleX:0},{scaleX:1,duration:${F(14)},ease:"${ease.enter}"},${b.t + 0.3});`)
    tl.push(`tl.fromTo("#${id}-l2",{opacity:0},{opacity:1,duration:${F(10)},ease:"${ease.cut}"},${b.t + 0.5});`)
  }

  if (shot.end) {
    css.push(`.end{position:absolute;left:160px;top:300px;width:1600px}`,
      `.end .mark{font-family:"Fraunces",serif;font-weight:600;font-size:168px;line-height:1;letter-spacing:-0.015em}`,
      `.end .bar{height:8px;width:240px;background:#1e4b3a;margin-top:22px;transform-origin:left center}`,
      `.end .models{font-weight:500;font-size:44px;line-height:1.3;margin-top:54px;color:#1f1a14}`,
      `.end .claim{font-weight:700;font-size:64px;line-height:1.15;margin-top:34px}`,
      `.note{position:absolute;left:160px;top:980px;font-weight:500;font-size:28px;color:#6b6152}`)
    parts.push(`<div id="end-card" class="end clip" data-start="0" data-duration="${shot.dur}" data-track-index="1">
  <div id="end-mark" class="mark">SafeNest</div><div id="end-bar" class="bar"></div>
  <div id="end-models" class="models">Built with Muse Spark 1.3, SAM 3.1 and Muse Image 1.0</div>
  <div id="end-claim" class="claim">Build for your world, starting with the people who built yours.</div></div>
<div id="end-note" class="note clip" data-start="0.2" data-duration="${(shot.dur - 0.2).toFixed(2)}" data-track-index="2">Screens recorded from the built-in sample walkthrough.</div>`)
    tl.push(`tl.fromTo("#end-mark",{opacity:0,y:30,scale:0.9},{opacity:1,y:0,scale:1,duration:${F(20)},ease:"back.out(1.4)"},0.2);`,
      `tl.fromTo("#end-bar",{scaleX:0},{scaleX:1,duration:${F(16)},ease:"${ease.enter}"},0.6);`,
      `tl.fromTo("#end-models",{opacity:0},{opacity:1,duration:${F(10)},ease:"${ease.cut}"},2.2);`,
      `tl.fromTo("#end-claim",{opacity:0},{opacity:1,duration:${F(10)},ease:"${ease.cut}"},5.6);`)
  }

  return `<template>
<style>
${FONT}
${css.join('\n')}
</style>
<div id="root" data-composition-id="${id}" data-width="${W}" data-height="${H}">
${parts.join('\n')}
</div>
<script>
(() => {
  const tl = gsap.timeline({ paused: true });
  ${tl.join('\n  ')}
  window.__timelines["${id}"] = tl;
})();
</script>
</template>
`
}

let t = 0
const hosts = [], audios = [], beats = []
for (const s of shots) {
  fs.writeFileSync(`compositions/${s.id}.html`, scene(s))
  hosts.push(`    <div id="${s.id}" class="clip" data-composition-id="${s.id}" data-composition-src="compositions/${s.id}.html" data-start="${t.toFixed(2)}" data-duration="${s.dur}" data-track-index="1" data-track-kind="graphics" data-width="${W}" data-height="${H}" data-beat="${s.id}"></div>`)
  if (s.voice) audios.push(`    <audio id="${s.voice}" class="clip" src="assets/voice/${s.voice}.wav" data-start="${(t + s.voiceAt).toFixed(2)}" data-duration="${VOICE[s.voice].toFixed(2)}" data-track-index="2" data-volume="1"></audio>`)
  beats.push(`${s.id} ${t.toFixed(2)}`)
  t += s.dur
}
const total = t.toFixed(2)
const bgm = fs.existsSync('assets/bgm/bed.wav')
  ? `    <audio id="bgm" class="clip" src="assets/bgm/bed.wav" data-start="0" data-duration="${total}" data-track-index="3" data-volume="0.14" data-fade-in="1.2" data-fade-out="2.5"></audio>`
  : ''
fs.writeFileSync('index.html', `<!doctype html>
<html lang="en" data-composition-variables='[]'>
  <head><meta charset="utf-8"><title>SafeNest demo</title>
  <style>html,body{margin:0;background:#1c1a17}</style>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"></script></head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${total}" data-width="${W}" data-height="${H}">
${hosts.join('\n')}
${audios.join('\n')}
${bgm}
    </div>
    <script>window.__timelines = window.__timelines || {}; window.__timelines["main"] = gsap.timeline({ paused: true });</script>
  </body>
</html>
`)
fs.writeFileSync('BEATS.txt', beats.join('\n') + `\ntotal ${total}\n`)
console.log('total', total, 'scenes', shots.length)
