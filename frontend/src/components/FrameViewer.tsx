import { useEffect, useRef } from 'react'
import type { Hazard, Scan } from '../types'
import { fmt, MaskedFrame } from './MaskedFrame'

interface Props {
  scan: Scan
  selected: Hazard | null
}

// The stage on the Review page: the video when nothing is selected, otherwise the selected hazard's
// keyframe with every SAM mask for that frame drawn on top.
export function FrameViewer({ scan, selected }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const ev = selected?.evidence[0]
  const frameIdx = ev?.frame_idx ?? selected?.frame_idx
  const frame = selected
    ? (scan.frames.find((f) => f.frame_idx === frameIdx) ?? scan.frames[0] ?? null)
    : (scan.frames[Math.min(3, scan.frames.length - 1)] ?? null)
  const evidence = selected && frame ? selected.evidence.filter((e) => e.frame_idx === frame.frame_idx) : []
  const showVideo = !!scan.video_url && !selected

  useEffect(() => {
    if (videoRef.current && selected) {
      videoRef.current.pause()
      videoRef.current.currentTime = ev?.t_sec ?? selected.t_sec
    }
  }, [selected, ev])

  if (showVideo) {
    return (
      <div className="media">
        <div className="relative aspect-video">
          <video
            ref={videoRef}
            src={scan.video_url}
            controls
            className="absolute inset-0 h-full w-full object-contain"
          />
        </div>
        <div className="bg-[#1a1713] px-4 py-2.5 text-sm text-white/60">Pick a hazard to see where it is.</div>
      </div>
    )
  }

  const best = evidence.reduce<number | null>((m, e) => (e.score == null ? m : Math.max(m ?? 0, e.score)), null)
  return (
    <MaskedFrame
      frame={frame}
      evidence={evidence}
      tone={selected?.lane ?? 'none'}
      stamp={selected && selected.lane === 'rejected' ? `SAM: 0 px for "${selected.phrase}"` : undefined}
      caption={
        selected ? (
          <>
            <span className="text-text">{selected.title}</span>
            <span className="shrink-0">
              {fmt(ev?.t_sec ?? selected.t_sec)}
              {evidence.length > 1 ? ` · ${evidence.length} objects` : ''}
              {best != null ? ` · SAM ${Math.round(best * 100)}%` : ''}
            </span>
          </>
        ) : (
          <span>Pick a hazard to see where it is.</span>
        )
      }
    />
  )
}
