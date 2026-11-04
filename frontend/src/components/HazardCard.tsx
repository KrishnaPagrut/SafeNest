import type { Frame, Hazard } from '../types'
import { fmt } from './MaskedFrame'
import { Icon, money, SeverityChip } from './ui'

interface Props {
  hazard: Hazard
  selected: boolean
  onSelect: (h: Hazard) => void
  onFixPreview?: (h: Hazard) => void
  onTrack?: (h: Hazard) => void
  frame?: Frame | null       // the keyframe SAM searched, shown on rejected cards
}

const ACCENT = { verified: 'before:bg-verified', needs_check: 'before:bg-check', rejected: 'before:bg-muted/40', pending: 'before:bg-line' } as const

export function HazardCard({ hazard: h, selected, onSelect, onFixPreview, onTrack, frame }: Props) {
  const rejected = h.lane === 'rejected'
  const pending = h.lane === 'pending'
  return (
    <div
      role="button" tabIndex={0} aria-pressed={selected}
      onClick={() => onSelect(h)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(h) } }}
      className={[
        'settle relative overflow-hidden text-left w-full rounded-xl border bg-surface pl-4 pr-3.5 py-3 cursor-pointer transition-all duration-200',
        "before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px]", ACCENT[h.lane],
        selected ? 'border-text/70 shadow-[var(--shadow-lift)]' : 'border-line hover:border-text/25 hover:shadow-[var(--shadow-card)]',
        rejected ? 'bg-surface/70' : '',
      ].join(' ')}
    >
      {rejected && (
        <div className="mb-2"><span className="chip bg-surface-2 text-muted"><Icon name="x" className="h-3.5 w-3.5" strokeWidth={2.4} /> AI claim dropped</span></div>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className={['font-medium leading-snug', rejected ? 'line-through decoration-verified/70 decoration-2 text-muted' : ''].join(' ')}>{h.title}</div>
        <span className="shrink-0 font-mono text-[0.8rem] text-muted tabular-nums pt-0.5">{fmt(h.evidence[0]?.t_sec ?? h.t_sec)}</span>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm text-muted">
        <span className="capitalize">{h.room}</span>
        {!rejected && !pending && <><span aria-hidden>·</span><SeverityChip severity={h.severity} /></>}
      </div>

      {pending && (
        <div className="mt-2 flex items-center gap-2 text-sm text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-2 pulse-dot" aria-hidden />
          {h.evidence.length ? `SAM found it at ${fmt(h.evidence[0].t_sec)}. Checking…` : 'Looking for it in the video…'}
        </div>
      )}
      {rejected && h.evidence.length === 0 && (
        <div className="mt-2.5">
          {frame && (
            <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
              <img src={frame.url} alt={`Keyframe at ${frame.t_sec}s, searched for ${h.phrase}`} className="absolute inset-0 w-full h-full object-contain opacity-55 grayscale" />
              <span className="absolute left-2 bottom-2 media-tag font-mono">"{h.phrase}" · 0 px</span>
            </div>
          )}
          <p className="mt-2 text-sm text-text">SAM searched frame {h.frame_idx} and found <span className="font-mono">0 px</span> for "{h.phrase}".</p>
        </div>
      )}
      {h.critic_reason && (
        <p className={['mt-2 text-sm', rejected ? 'text-muted' : 'text-text/85', selected ? '' : 'line-clamp-2'].join(' ')}>{h.critic_reason}</p>
      )}
      {(h.lane === 'verified' || h.lane === 'needs_check') && selected && (
        <div className="settle mt-3 border-t border-line pt-3 text-sm">
          <p className="text-text/90">{h.rationale}</p>
          <div className="mt-2.5 flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2">
            <span><span className="text-muted">Fix: </span>{h.fix.action}</span>
            <span className="shrink-0 font-medium tabular-nums">{money(h.fix.est_cost_usd)}</span>
          </div>
          {h.lane === 'verified' && (
            <div className="mt-3 flex flex-wrap gap-2">
              {onFixPreview && (
                <button type="button" onClick={(e) => { e.stopPropagation(); onFixPreview(h) }} className="btn-primary px-3.5 py-1.5 text-sm">
                  <Icon name="wand" className="h-4 w-4" /> Show it fixed
                </button>
              )}
              {onTrack && h.evidence.length > 0 && (
                <button type="button" onClick={(e) => { e.stopPropagation(); onTrack(h) }} className="btn-ghost px-3.5 py-1.5 text-sm">
                  <Icon name="track" className="h-4 w-4" /> Track in video
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
