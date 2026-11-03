import { useEffect, useRef, useState } from 'react'
import type { Hazard, Scan } from '../types'

const LANE_FILL: Record<string, string> = {
  verified: 'rgba(229, 72, 77, 0.42)',
  needs_check: 'rgba(143, 176, 207, 0.30)',
  pending: 'rgba(242, 236, 226, 0.22)',
  rejected: 'rgba(167, 157, 142, 0.18)',
}
const LANE_STROKE: Record<string, string> = {
  verified: '#e5484d', needs_check: '#8fb0cf', pending: '#f2ece2', rejected: '#a79d8e',
}

interface Props { scan: Scan; selected: Hazard | null }

// Shows the keyframe for the selected hazard with its SAM mask drawn on a canvas in frame pixels,
// scaled to the rendered size. Falls back to the video when nothing is selected.
export function FrameViewer({ scan, selected }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  const ev = selected?.evidence[0]
  const frame = selected
    ? scan.frames.find((f) => f.frame_idx === (ev?.frame_idx ?? selected.frame_idx)) ?? scan.frames[0]
    : scan.frames[Math.min(3, scan.frames.length - 1)] ?? null
  const showVideo = !!scan.video_url && !selected

  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (scan.video_url && videoRef.current && selected) {
      videoRef.current.pause()
      videoRef.current.currentTime = ev?.t_sec ?? selected.t_sec
    }
  }, [selected, ev, scan.video_url])

  useEffect(() => {
    const c = canvasRef.current
    if (!c || !frame) return
    const dpr = window.devicePixelRatio || 1
    c.width = size.w * dpr; c.height = size.h * dpr
    const ctx = c.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, size.w, size.h)
    if (!selected || !ev) return
    const s = Math.min(size.w / frame.w, size.h / frame.h)
    const ox = (size.w - frame.w * s) / 2, oy = (size.h - frame.h * s) / 2
    ctx.save()
    ctx.translate(ox, oy); ctx.scale(s, s)
    const path = new Path2D(ev.mask_path)
    ctx.fillStyle = LANE_FILL[selected.lane]
    ctx.fill(path)
    ctx.lineWidth = 3 / s
    ctx.strokeStyle = LANE_STROKE[selected.lane]
    ctx.stroke(path)
    ctx.setLineDash([8 / s, 6 / s])
    ctx.lineWidth = 1.5 / s
    const [x1, y1, x2, y2] = ev.box
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1)
    ctx.restore()
  }, [selected, ev, frame, size])

  return (
    <div className="rounded-lg overflow-hidden bg-black border border-line">
      <div ref={boxRef} className="relative aspect-video">
        {showVideo ? (
          <video ref={videoRef} src={scan.video_url} controls className="absolute inset-0 w-full h-full object-contain" />
        ) : frame ? (
          <img src={frame.url} alt={`Keyframe at ${frame.t_sec}s`} className="absolute inset-0 w-full h-full object-contain" />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-muted">Waiting for frames</div>
        )}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      </div>
      <div className="flex items-baseline justify-between px-4 py-2 text-muted text-base border-t border-line">
        {selected ? (
          <>
            <span className="text-text">{selected.title}</span>
            <span>{fmt(ev?.t_sec ?? selected.t_sec)}{ev?.score != null ? ` · SAM ${Math.round(ev.score * 100)}%` : ''}</span>
          </>
        ) : (
          <span>Pick a hazard to see where it is.</span>
        )}
      </div>
    </div>
  )
}

export function fmt(t: number) {
  const m = Math.floor(t / 60), s = Math.floor(t % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
