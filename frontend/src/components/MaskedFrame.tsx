import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Evidence, Frame, Lane } from '../types'

export type MaskTone = Lane | 'still' | 'none'

const FILL: Record<MaskTone, string> = {
  verified: 'rgba(229, 72, 77, 0.42)', needs_check: 'rgba(143, 176, 207, 0.30)',
  pending: 'rgba(242, 236, 226, 0.22)', rejected: 'rgba(167, 157, 142, 0.18)', still: 'rgba(224, 163, 59, 0.40)', none: 'transparent',
}
const STROKE: Record<MaskTone, string> = {
  verified: '#e5484d', needs_check: '#8fb0cf', pending: '#f2ece2', rejected: '#a79d8e', still: '#e0a33b', none: 'transparent',
}

interface Props {
  frame: Frame | null
  evidence: Evidence[]        // only entries for this frame; every one is drawn
  tone?: MaskTone
  stamp?: string              // short text stamped over the frame, e.g. "SAM: 0 px"
  caption?: ReactNode
  className?: string
}

// A keyframe with its SAM masks drawn on a canvas. Mask paths are in frame pixels and may hold several
// "M…Z" subpaths per object, so they are filled with the evenodd rule (CONTRACT.md §3).
export function MaskedFrame({ frame, evidence, tone = 'verified', stamp, caption, className = '' }: Props) {
  const boxRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const dpr = window.devicePixelRatio || 1
    c.width = size.w * dpr; c.height = size.h * dpr
    const ctx = c.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, size.w, size.h)
    if (!frame || evidence.length === 0 || tone === 'none') return
    const s = Math.min(size.w / frame.w, size.h / frame.h)
    const ox = (size.w - frame.w * s) / 2, oy = (size.h - frame.h * s) / 2
    ctx.save()
    ctx.translate(ox, oy); ctx.scale(s, s)
    for (const ev of evidence) {
      const path = new Path2D(ev.mask_path)
      ctx.fillStyle = FILL[tone]
      ctx.fill(path, 'evenodd')
      ctx.setLineDash([])
      ctx.lineWidth = 3 / s
      ctx.strokeStyle = STROKE[tone]
      ctx.stroke(path)
      ctx.setLineDash([8 / s, 6 / s])
      ctx.lineWidth = 1.5 / s
      const [x1, y1, x2, y2] = ev.box
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1)
    }
    ctx.restore()
  }, [frame, evidence, tone, size])

  return (
    <div className={`rounded-lg overflow-hidden bg-black border border-line ${className}`}>
      <div ref={boxRef} className="relative aspect-video">
        {frame ? (
          <img src={frame.url} alt={`Keyframe at ${frame.t_sec}s`} className="absolute inset-0 w-full h-full object-contain" />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-muted">No frame yet</div>
        )}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
        {stamp && (
          <span className="absolute left-3 bottom-3 rounded bg-ink/85 border border-line px-2 py-0.5 text-base">{stamp}</span>
        )}
      </div>
      {caption !== undefined && (
        <div className="flex items-baseline justify-between gap-3 px-4 py-2 text-muted text-base border-t border-line">{caption}</div>
      )}
    </div>
  )
}

export function fmt(t: number) {
  const m = Math.floor(t / 60), s = Math.floor(t % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function nearestFrame(frames: Frame[], t: number): Frame | null {
  if (frames.length === 0) return null
  return frames.reduce((best, f) => (Math.abs(f.t_sec - t) < Math.abs(best.t_sec - t) ? f : best), frames[0])
}
