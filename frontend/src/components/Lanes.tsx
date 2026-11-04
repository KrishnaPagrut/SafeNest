import type { Frame, Hazard, Lane } from '../types'
import { HazardCard } from './HazardCard'
import { LANE_STYLE } from './ui'

interface Props {
  hazards: Hazard[]
  selectedId: string | null
  onSelect: (h: Hazard) => void
  onFixPreview: (h: Hazard) => void
  onTrack: (h: Hazard) => void
  frames: Frame[]
}

const LANES: { lane: Exclude<Lane, 'pending'>; title: string; hint: string }[] = [
  { lane: 'verified', title: 'Verified on camera', hint: 'Spark raised it and SAM found the pixels.' },
  { lane: 'rejected', title: 'Rejected', hint: 'Claimed, but nothing in the video backs it up.' },
  { lane: 'needs_check', title: 'Check in person', hint: "Something missing. A camera can't prove an absence." },
]

export function Lanes({ hazards, selectedId, onSelect, onFixPreview, onTrack, frames }: Props) {
  const frameFor = (h: Hazard) => frames.find((f) => f.frame_idx === h.frame_idx) ?? null
  const pending = hazards.filter((h) => h.lane === 'pending')
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {LANES.map(({ lane, title, hint }) => {
        const items = hazards.filter((h) => h.lane === lane)
        const st = LANE_STYLE[lane]
        return (
          <section key={lane} className="min-w-0 rounded-2xl bg-surface-2/60 p-2.5">
            <header className="flex items-center gap-2 px-1.5 pt-1">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${st.dot}`} aria-hidden />
              <h3 className="font-medium">{title}</h3>
              <span className={`ml-auto chip ${st.soft} ${st.text} tabular-nums`}>{items.length}</span>
            </header>
            <p className="px-1.5 mt-1 mb-3 text-sm text-muted">{hint}</p>
            <div className="flex flex-col gap-2">
              {items.map((h) => (
                <HazardCard key={h.hazard_id} hazard={h} selected={h.hazard_id === selectedId} onSelect={onSelect} onFixPreview={onFixPreview} onTrack={onTrack} frame={lane === 'rejected' ? frameFor(h) : null} />
              ))}
              {items.length === 0 && pending.length === 0 && (
                <div className="rounded-xl border border-dashed border-line px-3 py-5 text-center text-muted text-sm">Nothing here.</div>
              )}
              {items.length === 0 && pending.length > 0 && (
                <div className="h-16 rounded-xl border border-dashed border-line/80 bg-surface/40" aria-hidden />
              )}
            </div>
          </section>
        )
      })}
      {pending.length > 0 && (
        <section className="md:col-span-3 rounded-2xl border border-dashed border-line p-3">
          <h3 className="flex items-center gap-2 font-medium mb-2 px-1">
            <span className="h-2.5 w-2.5 rounded-full bg-brand-2 pulse-dot" aria-hidden />
            Still checking <span className="chip bg-surface-2 text-muted">{pending.length}</span>
          </h3>
          <div className="grid gap-2 md:grid-cols-3">
            {pending.map((h) => (
              <HazardCard key={h.hazard_id} hazard={h} selected={h.hazard_id === selectedId} onSelect={onSelect} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
