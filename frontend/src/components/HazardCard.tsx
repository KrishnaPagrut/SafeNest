import type { Frame, Hazard } from '../types'
import { fmt } from './MaskedFrame'

interface Props {
  hazard: Hazard
  selected: boolean
  onSelect: (h: Hazard) => void
  onFixPreview?: (h: Hazard) => void
  onTrack?: (h: Hazard) => void
  frame?: Frame | null       // the keyframe SAM searched, shown on rejected cards
}

const SEVERITY = { 3: 'Fix today', 2: 'Fix this week', 1: 'Worth fixing' } as const

export function HazardCard({ hazard: h, selected, onSelect, onFixPreview, onTrack, frame }: Props) {
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
      {rejected && (
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded bg-surface-2 border border-line px-2 py-0.5 text-base text-muted">AI claim dropped</span>
        </div>
      )}
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
      {rejected && h.evidence.length === 0 && (
        <div className="mt-2">
          {frame && (
            <div className="relative rounded overflow-hidden border border-line bg-black aspect-video">
              <img src={frame.url} alt={`Keyframe at ${frame.t_sec}s, searched for ${h.phrase}`} className="absolute inset-0 w-full h-full object-contain opacity-60" />
              <span className="absolute left-2 bottom-2 rounded bg-ink/85 border border-line px-2 py-0.5 text-base text-text">"{h.phrase}" · 0 px</span>
            </div>
          )}
          <p className="mt-2 text-text">SAM searched frame {h.frame_idx} and found 0 px for "{h.phrase}"</p>
        </div>
      )}
      {h.critic_reason && (
        <p className={['mt-2 text-base', rejected ? 'text-muted' : 'text-text', selected ? '' : 'line-clamp-2'].join(' ')}>{h.critic_reason}</p>
      )}
      {h.lane === 'verified' && selected && (
        <div className="mt-3 border-t border-line pt-3 text-base">
          <p>{h.rationale}</p>
          <p className="mt-1 text-muted">{h.fix.action} · ${h.fix.est_cost_usd[0]}–{h.fix.est_cost_usd[1]}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {onTrack && h.evidence.length > 0 && (
              <button type="button" onClick={(e) => { e.stopPropagation(); onTrack(h) }}
                className="rounded-md border border-line px-3 py-1.5 font-medium hover:bg-surface">
                Track in video
              </button>
            )}
            {onFixPreview && (
              <button type="button" onClick={(e) => { e.stopPropagation(); onFixPreview(h) }}
                className="rounded-md bg-text text-ink px-3 py-1.5 font-medium hover:opacity-90">
                Show it fixed
              </button>
            )}
          </div>
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
