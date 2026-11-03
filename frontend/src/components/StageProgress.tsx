import type { Stage } from '../types'

export type StageState = Record<Stage, { status: 'idle' | 'start' | 'done'; detail: string }>

export const emptyStages = (): StageState => ({
  frames: { status: 'idle', detail: '' }, spotter: { status: 'idle', detail: '' },
  grounder: { status: 'idle', detail: '' }, critic: { status: 'idle', detail: '' },
})

const LABEL: Record<Stage, string> = {
  frames: 'Keyframes', spotter: 'Spark spots hazards', grounder: 'SAM finds the pixels', critic: 'Critic rules on each',
}

export function StageProgress({ stages }: { stages: StageState }) {
  return (
    <ol className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {(Object.keys(LABEL) as Stage[]).map((k, i) => {
        const s = stages[k]
        return (
          <li key={k} className={['rounded-md border px-3 py-2', s.status === 'start' ? 'border-text' : 'border-line', s.status === 'idle' ? 'text-muted' : ''].join(' ')}>
            <div className="text-base"><span className="tabular-nums text-muted">{i + 1}</span> {LABEL[k]}</div>
            <div className="text-base text-muted truncate">{s.status === 'start' ? (s.detail || 'Working…') : s.status === 'done' ? s.detail || 'Done' : 'Waiting'}</div>
          </li>
        )
      })}
    </ol>
  )
}
