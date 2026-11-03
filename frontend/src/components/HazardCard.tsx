import type { Hazard } from '../types'
import { fmt } from './FrameViewer'

interface Props {
  hazard: Hazard
  selected: boolean
  onSelect: (h: Hazard) => void
  onFixPreview?: (h: Hazard) => void
}

const SEVERITY = { 3: 'Fix today', 2: 'Fix this week', 1: 'Worth fixing' } as const

export function HazardCard({ hazard: h, selected, onSelect, onFixPreview }: Props) {
  const rejected = h.lane === 'rejected'
  const pending = h.lane === 'pending'
  return (
    <div
      role="button" tabIndex={0}
      onClick={() => onSelect(h)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(h) } }}
      className={[
        'settle text-left w-full rounded-md border px-4 py-3 cursor-pointer transition-colors',
        selected ? 'border-text bg-surface-2' : 'border-line bg-surface hover:bg-surface-2',
        rejected ? 'opacity-75' : '',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={['font-medium leading-tight', rejected ? 'line-through decoration-2 text-muted' : ''].join(' ')}>{h.title}</div>
        <span className="shrink-0 text-base text-muted">{fmt(h.evidence[0]?.t_sec ?? h.t_sec)}</span>
      </div>
      <div className="mt-1 text-base text-muted">{h.room}{!rejected && !pending ? ` · ${SEVERITY[h.severity]}` : ''}</div>

      {pending && (
        <div className="mt-2 text-base text-muted">
          {h.evidence.length ? `SAM found it at ${fmt(h.evidence[0].t_sec)}. Checking…` : 'Looking for it in the video…'}
        </div>
      )}
      {h.critic_reason && (
        <p className={['mt-2 text-base', rejected ? 'text-muted' : 'text-text'].join(' ')}>{h.critic_reason}</p>
      )}
      {h.lane === 'verified' && selected && (
        <div className="mt-3 border-t border-line pt-3 text-base">
          <p>{h.rationale}</p>
          <p className="mt-1 text-muted">{h.fix.action} · ${h.fix.est_cost_usd[0]}–{h.fix.est_cost_usd[1]}</p>
          {onFixPreview && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onFixPreview(h) }}
              className="mt-3 rounded-md bg-text text-ink px-3 py-1.5 font-medium hover:opacity-90"
            >
              Show it fixed
            </button>
          )}
        </div>
      )}
      {h.lane === 'needs_check' && selected && (
        <div className="mt-3 border-t border-line pt-3 text-base">
          <p>{h.rationale}</p>
          <p className="mt-1 text-muted">{h.fix.action} · ${h.fix.est_cost_usd[0]}–{h.fix.est_cost_usd[1]}</p>
        </div>
      )}
    </div>
  )
}
