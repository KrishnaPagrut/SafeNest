import { useState } from 'react'

interface Props { beforeUrl: string; afterUrl: string; beforeLabel?: string; afterLabel?: string }

// A draggable reveal slider: the left side shows "before", the right shows "after".
export function BeforeAfter({ beforeUrl, afterUrl, beforeLabel = 'Now', afterLabel = 'Fixed' }: Props) {
  const [pos, setPos] = useState(50)
  return (
    <div className="relative aspect-video rounded-lg overflow-hidden bg-black border border-line select-none">
      <img src={afterUrl} alt={afterLabel} className="absolute inset-0 w-full h-full object-contain" />
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
        <img src={beforeUrl} alt={beforeLabel} className="absolute inset-0 h-full object-contain" style={{ width: `${10000 / pos}%`, maxWidth: 'none' }} />
      </div>
      <div className="absolute top-0 bottom-0 w-0.5 bg-text" style={{ left: `${pos}%` }} aria-hidden />
      <span className="absolute left-3 top-3 rounded bg-ink/80 px-2 py-0.5 text-base">{beforeLabel}</span>
      <span className="absolute right-3 top-3 rounded bg-ink/80 px-2 py-0.5 text-base">{afterLabel}</span>
      <input
        type="range" min={0} max={100} value={pos} onChange={(e) => setPos(Number(e.target.value))}
        aria-label="Reveal the fixed room"
        className="absolute inset-x-0 bottom-0 top-0 w-full opacity-0 cursor-ew-resize"
      />
    </div>
  )
}
