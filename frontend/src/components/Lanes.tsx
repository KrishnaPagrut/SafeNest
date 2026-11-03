import type { Hazard, Lane } from '../types'
import { HazardCard } from './HazardCard'

interface Props {
  hazards: Hazard[]
  selectedId: string | null
  onSelect: (h: Hazard) => void
  onFixPreview: (h: Hazard) => void
}

const LANES: { lane: Lane; title: string; hint: string; color: string }[] = [
  { lane: 'verified', title: 'Verified on camera', hint: 'Spark raised it and SAM found the pixels.', color: 'bg-verified' },
  { lane: 'rejected', title: 'Rejected', hint: 'Claimed, but nothing in the video backs it up.', color: 'bg-muted' },
  { lane: 'needs_check', title: 'Check in person', hint: 'Something missing. A camera cannot prove an absence.', color: 'bg-check' },
]

export function Lanes({ hazards, selectedId, onSelect, onFixPreview }: Props) {
  const pending = hazards.filter((h) => h.lane === 'pending')
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {LANES.map(({ lane, title, hint, color }) => {
        const items = hazards.filter((h) => h.lane === lane)
        return (
          <section key={lane} className="min-w-0">
            <header className="flex items-center gap-2 mb-2">
              <span className={`inline-block h-3 w-3 rounded-full ${color}`} aria-hidden />
              <h3 className="font-medium">{title}</h3>
              <span className="ml-auto text-muted tabular-nums">{items.length}</span>
            </header>
            <p className="text-base text-muted mb-3">{hint}</p>
            <div className="flex flex-col gap-2">
              {items.map((h) => (
                <HazardCard key={h.hazard_id} hazard={h} selected={h.hazard_id === selectedId} onSelect={onSelect} onFixPreview={onFixPreview} />
              ))}
              {items.length === 0 && pending.length === 0 && <div className="text-muted text-base py-4">Nothing here.</div>}
            </div>
          </section>
        )
      })}
      {pending.length > 0 && (
        <section className="md:col-span-3 border-t border-line pt-4">
          <h3 className="font-medium mb-2">Still checking <span className="text-muted">{pending.length}</span></h3>
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
