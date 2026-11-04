import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Evidence, Frame, Lane } from '../types'

type Drawable = Pick<Evidence, 'box' | 'mask_path'>

export type MaskTone = Lane | 'still' | 'none'

const FILL: Record<MaskTone, string> = {
  verified: 'rgba(229, 72, 77, 0.42)', needs_check: 'rgba(143, 176, 207, 0.30)',
  pending: 'rgba(242, 236, 226, 0.22)', rejected: 'rgba(167, 157, 142, 0.18)', still: 'rgba(224, 163, 59, 0.40)', none: 'transparent',
}
const STROKE: Record<MaskTone, string> = {
  verified: '#e5484d', needs_check: '#8fb0cf', pending: '#f2ece2', rejected: '#a79d8e', still: '#e0a33b', none: 'transparent',
}

// Draws masks given in frame pixels (fw × fh) onto a canvas of CSS size (w × h), letterboxed like object-contain.
export function drawMasks(ctx: CanvasRenderingContext2D, items: Drawable[], tone: MaskTone, fw: number, fh: number, w: number, h: number) {
  if (items.length === 0 || tone === 'none') return
  const s = Math.min(w / fw, h / fh)
  const ox = (w - fw * s) / 2, oy = (h - fh * s) / 2
  ctx.save()
  ctx.translate(ox, oy); ctx.scale(s, s)
  for (const ev of items) {
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
    if (!frame) return
    drawMasks(ctx, evidence, tone, frame.w, frame.h, size.w, size.h)
  }, [frame, evidence, tone, size])

  return (
    <div className={`media ${className}`}>
      <div ref={boxRef} className="relative aspect-video">
        {frame ? (
          <img src={frame.url} alt={`Keyframe at ${frame.t_sec}s`} className="absolute inset-0 w-full h-full object-contain" />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-white/50">No frame yet</div>
        )}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
        {stamp && (
          <span className="absolute left-3 bottom-3 media-tag font-mono ring-1 ring-white/15">{stamp}</span>
        )}
      </div>
      {caption !== undefined && (
        <div className="flex items-baseline justify-between gap-3 px-4 py-2.5 text-white/60 text-sm bg-[#1a1713] [&_.text-text]:text-white [&_.text-text]:font-medium">{caption}</div>
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
