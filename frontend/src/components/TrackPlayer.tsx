import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import type { Hazard, Scan, Track, TrackEntry } from '../types'
import { drawMasks, fmt, nearestFrame } from './MaskedFrame'

interface Props {
  scan: Scan
  hazard: Hazard
  onClose: () => void
}

function entriesAt(track: Track, t: number): TrackEntry[] {
  const out: TrackEntry[] = []
  for (const o of track.objects) {
    let best: TrackEntry | null = null
    for (const e of o.track) {
      if (e.t_sec <= t && (!best || e.t_sec > best.t_sec)) best = e
    }
    if (best) out.push(best)
  }
  return out
}

// Plays the walkthrough with the SAM 3.1 track for one hazard drawn over it. Without a video
// (the sample walkthrough) it steps through keyframes on a timer instead.
export function TrackPlayer({ scan, hazard, onClose }: Props) {
  const [track, setTrack] = useState<Track | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [t, setT] = useState(hazard.evidence[0]?.t_sec ?? hazard.t_sec)
  const boxRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const fw = scan.frames[0]?.w ?? 1280,
    fh = scan.frames[0]?.h ?? 720
  const hasVideo = !!scan.video_url

  useEffect(() => {
    let alive = true
    api
      .track(hazard.hazard_id)
      .then((tr) => alive && setTrack(tr))
      .catch((e) => {
        console.error(e)
        if (alive) setError('failed')
      })
    return () => {
      alive = false
    }
  }, [hazard.hazard_id])

  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Video: follow currentTime on every animation frame. No video: advance through the track on a timer.
  useEffect(() => {
    if (!track) return
    if (hasVideo) {
      const v = videoRef.current
      if (!v) return
      const start = track.objects[0]?.track[0]?.t_sec ?? 0
      v.currentTime = Math.max(0, start - 0.5)
      v.play().catch(() => {})
      let raf = 0
      const loop = () => {
        setT(v.currentTime)
        raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
      return () => cancelAnimationFrame(raf)
    }
    const all = track.objects.flatMap((o) => o.track).map((e) => e.t_sec)
    const t0 = Math.min(...all),
      t1 = Math.max(...all)
    let cur = t0
    setT(cur)
    const id = window.setInterval(() => {
      cur = cur + 1 / track.fps > t1 ? t0 : cur + 1 / track.fps
      setT(cur)
    }, 1000 / track.fps)
    return () => window.clearInterval(id)
  }, [track, hasVideo])

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const dpr = window.devicePixelRatio || 1
    c.width = size.w * dpr
    c.height = size.h * dpr
    const ctx = c.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, size.w, size.h)
    if (!track) return
    drawMasks(ctx, entriesAt(track, t), 'verified', fw, fh, size.w, size.h)
  }, [track, t, size, fw, fh])

  const frame = hasVideo ? null : nearestFrame(scan.frames, t)
  const live = track ? entriesAt(track, t) : []
  const score = live[0]?.score

  return (
    <div className="media">
      <div ref={boxRef} className="relative aspect-video">
        {hasVideo ? (
          <video
            ref={videoRef}
            src={scan.video_url}
            controls
            muted
            className="absolute inset-0 h-full w-full object-contain"
          />
        ) : frame ? (
          <img src={frame.url} alt="" className="absolute inset-0 h-full w-full object-contain" />
        ) : null}
        <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
        {!track && !error && (
          <div className="absolute inset-0 grid place-items-center bg-black/60 text-white">
            SAM 3.1 is tracking "{hazard.phrase}" through the video…
          </div>
        )}
        {error && (
          <div className="absolute inset-0 grid place-items-center bg-black/60 px-6 text-center text-[#ff8a85]">
            Tracking isn't available for this hazard right now.
          </div>
        )}
      </div>
      <div className="flex items-baseline justify-between gap-3 bg-[#1a1713] px-4 py-2.5 text-sm text-white/60">
        <span className="font-medium text-white">SAM 3.1 following "{hazard.phrase}"</span>
        <span className="flex items-baseline gap-3">
          <span className="tabular-nums">
            {fmt(t)}
            {score != null ? ` · ${Math.round(score * 100)}%` : ''}
            {live.length === 0 && track ? ' · out of view' : ''}
          </span>
          <button type="button" onClick={onClose} className="underline underline-offset-4 hover:text-white">
            Back to frame
          </button>
        </span>
      </div>
    </div>
  )
}
