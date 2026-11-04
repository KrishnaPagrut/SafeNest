import type { Stage } from '../types'
import { Icon } from './ui'

export type StageState = Record<Stage, { status: 'idle' | 'start' | 'done'; detail: string; startedAt?: number; ms?: number }>

export const emptyStages = (): StageState => ({
  frames: { status: 'idle', detail: '' }, spotter: { status: 'idle', detail: '' },
  grounder: { status: 'idle', detail: '' }, critic: { status: 'idle', detail: '' },
})

// The pipeline rail. Model names are on screen on purpose: this is where the Meta tooling shows.
const STEPS = [
  { key: 'frames', model: 'ffmpeg', job: 'Keyframes, one per second', icon: 'film' },
  { key: 'spotter', model: 'Muse Spark 1.3', job: 'Spots fall hazards', icon: 'spark' },
  { key: 'grounder', model: 'SAM 3.1', job: 'Finds the pixels for each claim', icon: 'target' },
  { key: 'critic', model: 'Muse Spark 1.3', job: 'Critic rules on the evidence', icon: 'scale' },
] as const satisfies readonly { key: Stage; model: string; job: string; icon: string }[]

function secs(ms?: number) { return ms == null ? '' : `${(ms / 1000).toFixed(1)}s` }

export function StageProgress({ stages, timings }: { stages: StageState; timings?: Record<string, number> }) {
  return (
    <ol className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-0 md:card md:overflow-hidden" aria-label="Pipeline">
      {STEPS.map(({ key, model, job, icon }, i) => {
        const s = stages[key]
        const ms = timings?.[key] ?? s.ms
        const active = s.status === 'start'
        const done = s.status === 'done'
        return (
          <li key={key} className={['relative px-4 py-3 max-md:card md:border-l md:first:border-l-0 border-line transition-colors',
            active ? 'bg-brand-soft/60' : 'md:bg-surface', s.status === 'idle' ? 'opacity-55' : ''].join(' ')}>
            <div className="flex items-center gap-3">
              <span className={['grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors',
                done ? 'bg-brand text-white' : active ? 'bg-surface text-brand ring-2 ring-brand-2/40' : 'bg-surface-2 text-muted'].join(' ')}>
                {done ? <Icon name="check" className="h-5 w-5" strokeWidth={2.4} /> : <Icon name={icon} className="h-5 w-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium truncate">{model}</span>
                  <span className={['text-sm tabular-nums shrink-0', active ? 'text-brand font-medium' : 'text-muted'].join(' ')}>
                    {done ? secs(ms) || 'done' : active ? 'working…' : `step ${i + 1}`}
                  </span>
                </div>
                <div className="text-sm text-muted truncate">{s.detail || job}</div>
              </div>
            </div>
            <span className={['absolute left-0 right-0 bottom-0 h-[3px]', active ? 'shimmer' : done ? 'bg-brand/80' : 'bg-transparent'].join(' ')} aria-hidden />
          </li>
        )
      })}
    </ol>
  )
}
