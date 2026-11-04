import { useState } from 'react'

interface Props {
  beforeUrl: string
  afterUrl: string
  beforeLabel?: string
  afterLabel?: string
}

// A draggable reveal slider: the left side shows "before", the right shows "after".
export function BeforeAfter({ beforeUrl, afterUrl, beforeLabel = 'Now', afterLabel = 'Fixed' }: Props) {
  const [pos, setPos] = useState(50)
  return (
    <div className="media relative aspect-video select-none">
      <img src={afterUrl} alt={afterLabel} className="absolute inset-0 h-full w-full object-contain" />
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
        <img
          src={beforeUrl}
          alt={beforeLabel}
          className="absolute inset-0 h-full object-contain"
          style={{ width: `${10000 / pos}%`, maxWidth: 'none' }}
        />
      </div>
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_12px_rgba(0,0,0,.5)]"
        style={{ left: `${pos}%` }}
        aria-hidden
      >
        <span className="absolute top-1/2 left-1/2 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-sm font-bold text-[#1f1a14] shadow-lg">
          ⇆
        </span>
      </div>
      <span className="media-tag absolute top-3 left-3">{beforeLabel}</span>
      <span className="media-tag bg-fixed/90 absolute top-3 right-3">{afterLabel}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label="Reveal the fixed room"
        className="absolute inset-x-0 top-0 bottom-0 w-full cursor-ew-resize opacity-0"
      />
    </div>
  )
}
