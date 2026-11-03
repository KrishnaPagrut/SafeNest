import type { Stage } from '../types'

export type StageState = Record<Stage, { status: 'idle' | 'start' | 'done'; detail: string; startedAt?: number; ms?: number }>

export const emptyStages = (): StageState => ({
  frames: { status: 'idle', detail: '' }, spotter: { status: 'idle', detail: '' },
  grounder: { status: 'idle', detail: '' }, critic: { status: 'idle', detail: '' },
})

// The pipeline rail. Model names are on screen on purpose: this is where the Meta tooling shows.
const STEPS: { key: Stage; model: string; job: string }[] = [
  { key: 'frames', model: 'ffmpeg', job: 'Keyframes, one per second' },
  { key: 'spotter', model: 'Muse Spark 1.3', job: 'Spots fall hazards' },
  { key: 'grounder', model: 'SAM 3.1', job: 'Finds the pixels for each claim' },
  { key: 'critic', model: 'Muse Spark 1.3', job: 'Critic rules on the evidence' },
]

function secs(ms?: number) { return ms == null ? '' : `${(ms / 1000).toFixed(1)}s` }

export function StageProgress({ stages, timings }: { stages: StageState; timings?: Record<string, number> }) {
  return (
    <ol className="grid grid-cols-2 md:grid-cols-4 gap-2" aria-label="Pipeline">
      {STEPS.map(({ key, model, job }, i) => {
        const s = stages[key]
        const ms = timings?.[key] ?? s.ms
        const active = s.status === 'start'
        return (
          <li key={key} className={['relative rounded-md border px-3 py-2 bg-surface', active ? 'border-text' : 'border-line', s.status === 'idle' ? 'opacity-60' : ''].join(' ')}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium">{model}</span>
              <span className="text-base text-muted tabular-nums">
                {s.status === 'done' ? secs(ms) || 'done' : active ? 'working' : `step ${i + 1}`}
              </span>
            </div>
            <div className="text-base text-muted">{job}</div>
            <div className="text-base truncate">{s.detail || ' '}</div>
            {active && <span className="absolute left-0 right-0 bottom-0 h-0.5 bg-text animate-pulse" aria-hidden />}
          </li>
        )
      })}
    </ol>
  )
}
