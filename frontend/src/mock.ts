// In-memory stand-in for the backend. Any scan_id starting with "mock_" is served from here,
// so the live backend and the sample walkthrough can coexist. Shapes follow CONTRACT.md.
import type { Comparison, FixPreview, Frame, Hazard, Scan, ScanEvent, ScanSummary, Track, TrackEntry } from './types'

const W = 1280, H = 720

// A keyframe stand-in: an illustrated room drawn in SVG, with each sample hazard placed exactly
// under its evidence box so the SAM masks sit on something. `present` lists the hazards in the shot.
type Prop = 'throw rug' | 'extension cord' | 'shoes' | 'step stool' | 'bathtub' | 'dark'
const ALL_PROPS: Prop[] = ['throw rug', 'extension cord', 'shoes', 'step stool', 'bathtub', 'dark']

function room(i: number): 'hallway' | 'living' | 'stairs' | 'kitchen' | 'bath' {
  if (i >= 20) return 'bath'
  if (i >= 16) return 'hallway'
  if (i >= 13) return 'kitchen'
  if (i >= 10) return 'stairs'
  if (i >= 7) return 'living'
  return 'hallway'
}

function frameSvg(i: number, present: Prop[] = ALL_PROPS): string {
  const has = (p: Prop) => present.includes(p)
  const r = room(i)
  const wall = { hallway: '#d9c9ae', living: '#cdb99a', stairs: '#d4c2a4', kitchen: '#d8cfb8', bath: '#c9d6d3' }[r]
  const wall2 = { hallway: '#c8b596', living: '#bba582', stairs: '#c2ae8d', kitchen: '#c6bb9f', bath: '#b4c5c1' }[r]
  const floor = r === 'bath' ? '#e7e3da' : '#9a6f47'
  const floor2 = r === 'bath' ? '#d6d1c5' : '#86603c'
  const px = (i % 3) * 6 // a little camera drift between frames
  const parts: string[] = []
  parts.push(`<defs>
    <linearGradient id='w' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='${wall}'/><stop offset='1' stop-color='${wall2}'/></linearGradient>
    <linearGradient id='f' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='${floor2}'/><stop offset='1' stop-color='${floor}'/></linearGradient>
    <radialGradient id='l' cx='.5' cy='.05' r='.8'><stop offset='0' stop-color='#fff6df' stop-opacity='.55'/><stop offset='1' stop-color='#fff6df' stop-opacity='0'/></radialGradient>
  </defs>`)
  parts.push(`<rect width='${W}' height='${H}' fill='url(#w)'/>`)
  // side walls and floor in one-point perspective
  parts.push(`<polygon points='0,0 ${282 + px},${86} ${282 + px},${396} 0,${H}' fill='${wall2}' opacity='.85'/>`)
  parts.push(`<polygon points='${W},0 ${998 + px},${86} ${998 + px},${396} ${W},${H}' fill='${wall2}' opacity='.7'/>`)
  parts.push(`<polygon points='0,${H} ${W},${H} ${998 + px},396 ${282 + px},396' fill='url(#f)'/>`)
  if (r === 'bath') {
    for (let k = 1; k < 7; k++) parts.push(`<line x1='${282 + px + k * 102}' y1='396' x2='${k * 183}' y2='${H}' stroke='#c9c3b5' stroke-width='2'/>`)
  } else {
    for (let k = 1; k < 9; k++) parts.push(`<line x1='${282 + px + k * 79}' y1='396' x2='${k * 142}' y2='${H}' stroke='#7a5634' stroke-width='2' opacity='.55'/>`)
  }
  parts.push(`<rect x='${282 + px}' y='86' width='716' height='310' fill='${wall}'/>`)
  parts.push(`<rect x='${282 + px}' y='382' width='716' height='14' fill='#efe6d6'/>`)
  // back wall details: a doorway and a framed picture or window
  parts.push(`<rect x='${560 + px}' y='150' width='160' height='246' fill='#6b5843'/><rect x='${572 + px}' y='162' width='136' height='234' fill='#3f342a'/>`)
  if (r === 'bath') parts.push(`<rect x='${330 + px}' y='140' width='150' height='110' rx='6' fill='#e9f2f1' stroke='#9fb3ae' stroke-width='6'/>`)
  else parts.push(`<rect x='${350 + px}' y='170' width='120' height='90' fill='#7d9a87' stroke='#5c4836' stroke-width='8'/><rect x='${800 + px}' y='160' width='130' height='100' fill='#c58f5a' stroke='#5c4836' stroke-width='8'/>`)
  parts.push(`<rect width='${W}' height='${H}' fill='url(#l)'/>`)

  if (r === 'stairs') {
    for (let k = 0; k < 5; k++) {
      const y = 396 + k * 46, inset = 120 - k * 30
      parts.push(`<rect x='${440 + inset}' y='${y}' width='${400 - inset * 2 + 120}' height='18' fill='#b78a5c'/><rect x='${440 + inset}' y='${y + 18}' width='${400 - inset * 2 + 120}' height='28' fill='#8a6440'/>`)
    }
    parts.push(`<line x1='${430}' y1='300' x2='${330}' y2='640' stroke='#5c4836' stroke-width='10' stroke-linecap='round'/>`)
  }
  if (i >= 3 && i <= 5 && has('throw rug')) {
    parts.push(`<path d='M430 480L850 478L862 640L418 642Z' fill='#3d6a86'/><path d='M455 500L825 498L835 622L445 624Z' fill='none' stroke='#e8c07a' stroke-width='6'/>`)
    parts.push(`<path d='M806 478 L850 478 L858 560 Q 820 520 806 478Z' fill='#2b4d63'/>`)
  }
  if (i === 8 && has('extension cord')) {
    parts.push(`<path d='M300 540L520 528L760 548L980 536' fill='none' stroke='#f5f2ea' stroke-width='12' stroke-linecap='round'/><rect x='968' y='520' width='34' height='30' rx='5' fill='#f5f2ea'/>`)
  }
  if (i === 11 && has('shoes')) {
    parts.push(`<path d='M562 470 q10 -34 46 -30 l16 22 q-4 18 -30 20 z' fill='#2d3a4f'/><path d='M622 492 q10 -40 50 -34 l18 26 q-6 18 -32 18 z' fill='#7b3b52'/>`)
  }
  if (i >= 13 && i <= 15 && has('step stool')) {
    parts.push(`<path d='M740 380L870 384L882 420L718 418Z' fill='#d9a441'/><path d='M728 418 L742 560 M872 420 L862 560 M732 490 L870 490' stroke='#8d6420' stroke-width='12' stroke-linecap='round'/>`)
  }
  if (i >= 20 && has('bathtub')) {
    parts.push(`<path d='M360 430 Q360 400 400 400 L880 400 Q920 400 920 430 L900 600 Q895 640 850 640 L430 640 Q385 640 380 600 Z' fill='#fbfbf8' stroke='#c7cdca' stroke-width='6'/><ellipse cx='640' cy='430' rx='250' ry='18' fill='#dfe8e6'/>`)
    parts.push(`<rect x='860' y='330' width='14' height='70' rx='6' fill='#a7b1ae'/>`)
  }
  if (i >= 16 && i <= 19 && has('dark')) parts.push(`<rect width='${W}' height='${H}' fill='#0b0906' opacity='.78'/>`)

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}' viewBox='0 0 ${W} ${H}'>${parts.join('')}</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

const PHRASE_PROP: Record<string, Prop> = { 'throw rug': 'throw rug', 'extension cord': 'extension cord', shoes: 'shoes', 'step stool': 'step stool', bathtub: 'bathtub', hallway: 'dark' }

function rect(x1: number, y1: number, x2: number, y2: number): string {
  return `M${x1} ${y1}L${x2} ${y1}L${x2} ${y2}L${x1} ${y2}Z`
}

const frames: Frame[] = Array.from({ length: 24 }, (_, i) => ({
  frame_idx: i, t_sec: i, w: W, h: H, url: frameSvg(i),
}))
// The re-filmed walk: everything fixed except the extension cord (and the tub, which still has no grab bar).
const afterFrames: Frame[] = frames.map((f) => ({ ...f, url: frameSvg(f.frame_idx, ['extension cord', 'bathtub']) }))

function hz(p: Partial<Hazard> & Pick<Hazard, 'hazard_id' | 'phrase' | 'title' | 'category' | 'room' | 'severity' | 'rationale' | 'fix' | 't_sec'>): Hazard {
  return {
    absence: false, frame_idx: Math.round(p.t_sec), lane: 'pending', critic_reason: null,
    evidence: [], fix_preview_url: null, ...p,
  }
}

const beforeHazards: Hazard[] = [
  hz({ hazard_id: 'hz_m01', phrase: 'throw rug', title: 'Loose throw rug in the hallway', category: 'floors_rugs', room: 'hallway', severity: 3,
    rationale: 'A curled rug edge catches a foot or a walker wheel.', fix: { action: 'Remove the rug or add a non-slip backing', est_cost_usd: [0, 15] }, t_sec: 4,
    evidence: [{ frame_idx: 4, t_sec: 4, box: [420, 470, 860, 640], mask_path: 'M430 480L850 478L862 640L418 642Z', score: 0.91 }] }),
  hz({ hazard_id: 'hz_m02', phrase: 'extension cord', title: 'Extension cord across the walking path', category: 'cords_clutter', room: 'living room', severity: 3,
    rationale: 'Cords at floor level across a path are a classic trip hazard.', fix: { action: 'Route the cord along the wall and tape it down', est_cost_usd: [5, 20] }, t_sec: 8,
    evidence: [{ frame_idx: 8, t_sec: 8, box: [300, 520, 980, 560], mask_path: 'M300 540L520 528L760 548L980 536L982 556L760 568L520 548L298 560Z', score: 0.84 }] }),
  hz({ hazard_id: 'hz_m03', phrase: 'shoes', title: 'Shoes left on the stairs', category: 'stairs_steps', room: 'stairs', severity: 2,
    rationale: 'Objects on steps hide the edge of the tread.', fix: { action: 'Keep stairs clear; add a shoe rack by the door', est_cost_usd: [0, 30] }, t_sec: 11,
    evidence: [{ frame_idx: 11, t_sec: 11, box: [560, 430, 700, 500], mask_path: rect(560, 430, 700, 500), score: 0.77 }] }),
  hz({ hazard_id: 'hz_m04', phrase: 'step stool', title: 'Step stool left in the doorway', category: 'furniture', room: 'kitchen', severity: 2,
    rationale: 'A low object in a doorway is easy to miss when turning.', fix: { action: 'Store the stool against a wall when not in use', est_cost_usd: [0, 0] }, t_sec: 14,
    evidence: [{ frame_idx: 14, t_sec: 14, box: [720, 380, 880, 560], mask_path: 'M740 380L870 384L882 560L718 556Z', score: 0.88 }] }),
  hz({ hazard_id: 'hz_m05', phrase: 'bathtub', title: 'Bathtub with no grab bar', category: 'bathroom', room: 'bathroom', severity: 3, absence: true,
    rationale: 'Stepping over a tub edge without support is where many falls happen.', fix: { action: 'Install a wall-mounted grab bar by the tub', est_cost_usd: [25, 120] }, t_sec: 21,
    evidence: [{ frame_idx: 21, t_sec: 21, box: [360, 400, 920, 640], mask_path: rect(360, 400, 920, 640), score: 0.95 }] }),
  hz({ hazard_id: 'hz_m06', phrase: 'loose handrail', title: 'Loose stair handrail', category: 'stairs_steps', room: 'stairs', severity: 3,
    rationale: 'A rail that moves gives way exactly when it is needed.', fix: { action: 'Re-anchor the rail into studs', est_cost_usd: [10, 60] }, t_sec: 12 }),
  hz({ hazard_id: 'hz_m07', phrase: 'wet floor', title: 'Wet patch near the sink', category: 'bathroom', room: 'bathroom', severity: 2,
    rationale: 'Water on tile is slick.', fix: { action: 'Add a non-slip mat in front of the sink', est_cost_usd: [10, 25] }, t_sec: 22 }),
  hz({ hazard_id: 'hz_m08', phrase: 'hallway', title: 'Dim hallway with no night light', category: 'lighting', room: 'hallway', severity: 2, absence: true,
    rationale: 'Night-time trips to the bathroom happen in the dark.', fix: { action: 'Plug in a motion-sensing night light', est_cost_usd: [8, 20] }, t_sec: 17,
    evidence: [{ frame_idx: 17, t_sec: 17, box: [280, 90, 1000, 640], mask_path: rect(280, 90, 1000, 640), score: null }] }),
]

const judged: Record<string, { lane: Hazard['lane']; reason: string }> = {
  hz_m01: { lane: 'verified', reason: 'SAM matched "throw rug" in frames 3–5 with a visibly curled edge.' },
  hz_m02: { lane: 'verified', reason: 'SAM traced "extension cord" across the full width of the path in frame 8.' },
  hz_m03: { lane: 'verified', reason: 'SAM found "shoes" on the second and third treads in frame 11.' },
  hz_m04: { lane: 'verified', reason: 'SAM matched "step stool" inside the doorway in frames 13–15.' },
  hz_m05: { lane: 'needs_check', reason: 'A missing grab bar cannot be proven from pixels. Check in person.' },
  hz_m06: { lane: 'rejected', reason: 'SAM found no "loose handrail" in frames 11–13, so this claim was dropped.' },
  hz_m07: { lane: 'rejected', reason: 'SAM found no "wet floor" in frames 21–23, so this claim was dropped.' },
  hz_m08: { lane: 'verified', reason: 'Frames 16–19 are far darker than the rest of the walk; the hallway is unlit.' },
}

function finalize(h: Hazard): Hazard {
  const j = judged[h.hazard_id]
  return { ...h, lane: j.lane, critic_reason: j.reason }
}

export const mockBefore: Scan = {
  scan_id: 'mock_before', label: 'before', baseline_scan_id: null, status: 'complete',
  title: 'Hallway, stairs and bathroom', created_at: '2026-11-03T20:10:00Z', video_url: '', duration_sec: 24,
  summary: 'Eight possible hazards were raised and six were confirmed on camera. Two claims could not be matched to anything in the video and were dropped. The missing grab bar needs a look in person.',
  frames, hazards: beforeHazards.map(finalize), timings_ms: { frames: 1800, spotter: 6400, grounder: 9100, critic: 2200 },
}

const afterHazards: Hazard[] = [
  finalizeAs(beforeHazards[1], 'verified', 'SAM still traces "extension cord" across the path in frame 8.'),
  finalizeAs(beforeHazards[4], 'needs_check', 'A missing grab bar cannot be proven from pixels. Check in person.'),
]
function finalizeAs(h: Hazard, lane: Hazard['lane'], reason: string): Hazard {
  return { ...h, hazard_id: h.hazard_id.replace('hz_m', 'hz_a'), lane, critic_reason: reason }
}

export const mockAfter: Scan = {
  ...mockBefore, scan_id: 'mock_after', label: 'after', baseline_scan_id: 'mock_before', frames: afterFrames,
  created_at: '2026-11-03T21:40:00Z', title: 'Hallway, stairs and bathroom (re-filmed)',
  summary: 'Most of the earlier hazards are gone. The extension cord is still across the path.',
  hazards: afterHazards, timings_ms: { frames: 1700, spotter: 5900, grounder: 4100, critic: 1500 },
}

const scans: Record<string, Scan> = { mock_before: mockBefore, mock_after: mockAfter }

export const mock = {
  has: (id: string) => id in scans,
  getScan: (id: string): Scan => scans[id],
  list: (): ScanSummary[] => Object.values(scans).map((s) => ({
    scan_id: s.scan_id, label: s.label, status: s.status, created_at: s.created_at, title: s.title,
    hazard_counts: {
      verified: s.hazards.filter((h) => h.lane === 'verified').length,
      rejected: s.hazards.filter((h) => h.lane === 'rejected').length,
      needs_check: s.hazards.filter((h) => h.lane === 'needs_check').length,
    },
  })),

  // Replays the pipeline with pauses so the Review page animates like a live run.
  events(id: string, onEvent: (e: ScanEvent) => void): () => void {
    const scan = scans[id]
    const timers: number[] = []
    let t = 0
    const at = (ms: number, e: ScanEvent) => { t += ms; timers.push(window.setTimeout(() => onEvent(e), t)) }
    const base = id === 'mock_before' ? beforeHazards : afterHazards.map((h) => ({ ...h, lane: 'pending' as const, critic_reason: null }))

    at(200, { type: 'stage', data: { stage: 'frames', status: 'start', detail: 'Pulling one keyframe per second' } })
    at(900, { type: 'stage', data: { stage: 'frames', status: 'done', detail: `${frames.length} keyframes` } })
    at(300, { type: 'stage', data: { stage: 'spotter', status: 'start', detail: 'Muse Spark is looking for fall hazards' } })
    base.forEach((h) => at(450, { type: 'hazard_proposed', data: { ...h, evidence: [] } }))
    at(400, { type: 'stage', data: { stage: 'spotter', status: 'done', detail: `${base.length} candidates` } })
    at(300, { type: 'stage', data: { stage: 'grounder', status: 'start', detail: 'SAM 3.1 is searching the frames for each one' } })
    base.forEach((h) => at(550, { type: 'hazard_grounded', data: h }))
    at(300, { type: 'stage', data: { stage: 'grounder', status: 'done', detail: 'Pixels found for 6 of 8' } })
    at(300, { type: 'stage', data: { stage: 'critic', status: 'start', detail: 'Checking each claim against its evidence' } })
    scan.hazards.forEach((h) => at(700, { type: 'hazard_judged', data: h }))
    at(300, { type: 'stage', data: { stage: 'critic', status: 'done', detail: 'Done' } })
    at(200, { type: 'complete', data: scan })
    return () => timers.forEach(clearTimeout)
  },

  async fixPreview(hazardId: string): Promise<FixPreview> {
    await new Promise((r) => setTimeout(r, 1800))
    const h = Object.values(scans).flatMap((s) => s.hazards).find((x) => x.hazard_id === hazardId)!
    return {
      hazard_id: hazardId, before_url: frames[h.frame_idx].url,
      after_url: frameSvg(h.frame_idx, ALL_PROPS.filter((p) => p !== PHRASE_PROP[h.phrase])),
      instruction: `${h.fix.action}; keep everything else identical.`,
    }
  },

  // Fakes SAM video tracking: the first evidence box drifts for 3 s around the hazard's timestamp at 10 fps.
  async track(hazardId: string): Promise<Track> {
    await new Promise((r) => setTimeout(r, 2200))
    const h = Object.values(scans).flatMap((s) => s.hazards).find((x) => x.hazard_id === hazardId)!
    const ev = h.evidence[0]
    const [x1, y1, x2, y2] = ev.box
    const track: TrackEntry[] = []
    for (let i = 0; i <= 30; i++) {
      const t = Math.max(0, ev.t_sec - 1.5) + i / 10
      const dx = Math.round(Math.sin(i / 5) * 40), dy = Math.round(Math.cos(i / 7) * 18)
      track.push({ frame_index: Math.round(t * 10), t_sec: t, box: [x1 + dx, y1 + dy, x2 + dx, y2 + dy],
        mask_path: rect(x1 + dx + 8, y1 + dy + 6, x2 + dx - 8, y2 + dy - 6), score: 0.9 - i * 0.004 })
    }
    return { hazard_id: hazardId, phrase: h.phrase, fps: 10, frames: 240, objects: [{ object_id: '0', track }] }
  },

  compare(afterId: string, beforeId: string): Comparison {
    const b = scans[beforeId], a = scans[afterId]
    const score = (s: Scan) => s.hazards.filter((h) => h.lane === 'verified' || h.lane === 'needs_check').reduce((n, h) => n + h.severity, 0)
    const items: Comparison['items'] = b.hazards.filter((h) => h.lane !== 'rejected').map((h) => {
      const still = a.hazards.find((x) => x.phrase === h.phrase)
      if (still) return { before_hazard_id: h.hazard_id, after_hazard_id: still.hazard_id, status: 'still_present', title: h.title,
        note: still.lane === 'needs_check' ? 'Still needs a look in person.' : `Still detected at ${still.t_sec}s.` }
      return { before_hazard_id: h.hazard_id, after_hazard_id: null, status: 'fixed', title: h.title, note: `"${h.phrase}" no longer detected (SAM: 0 px).` }
    })
    return { before_id: beforeId, after_id: afterId, items, score_before: score(b), score_after: score(a) }
  },
}
