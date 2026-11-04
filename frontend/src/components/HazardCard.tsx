import type { Frame, Hazard } from '../types'
import { fmt } from './MaskedFrame'
import { Icon, money, SeverityChip } from './ui'

interface Props {
  hazard: Hazard
  selected: boolean
  onSelect: (h: Hazard) => void
  onFixPreview?: (h: Hazard) => void
  onTrack?: (h: Hazard) => void
  frame?: Frame | null // the keyframe SAM searched, shown on rejected cards
}

const ACCENT = {
  verified: 'before:bg-verified',
  needs_check: 'before:bg-check',
  rejected: 'before:bg-muted/40',
  pending: 'before:bg-line',
} as const

export function HazardCard({ hazard: h, selected, onSelect, onFixPreview, onTrack, frame }: Props) {
  const rejected = h.lane === 'rejected'
  const pending = h.lane === 'pending'
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={() => onSelect(h)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(h)
        }
      }}
      className={[
        'settle bg-surface relative w-full cursor-pointer overflow-hidden rounded-xl border py-3 pr-3.5 pl-4 text-left transition-all duration-200',
        "before:absolute before:top-0 before:bottom-0 before:left-0 before:w-[3px] before:content-['']",
        ACCENT[h.lane],
        selected
          ? 'border-text/70 shadow-[var(--shadow-lift)]'
          : 'border-line hover:border-text/25 hover:shadow-[var(--shadow-card)]',
        rejected ? 'bg-surface/70' : '',
      ].join(' ')}
    >
      {rejected && (
        <div className="mb-2">
          <span className="chip bg-surface-2 text-muted">
            <Icon name="x" className="h-3.5 w-3.5" strokeWidth={2.4} /> AI claim dropped
          </span>
        </div>
      )}
      <div className="flex items-start justify-between gap-3">
        <div
          className={[
            'leading-snug font-medium',
            rejected ? 'decoration-verified/70 text-muted line-through decoration-2' : '',
          ].join(' ')}
        >
          {h.title}
        </div>
        <span className="text-muted shrink-0 pt-0.5 font-mono text-[0.8rem] tabular-nums">
          {fmt(h.evidence[0]?.t_sec ?? h.t_sec)}
        </span>
      </div>
      <div className="text-muted mt-1.5 flex flex-wrap items-center gap-1.5 text-sm">
        <span className="capitalize">{h.room}</span>
        {!rejected && !pending && (
          <>
            <span aria-hidden>·</span>
            <SeverityChip severity={h.severity} />
          </>
        )}
      </div>

      {pending && (
        <div className="text-muted mt-2 flex items-center gap-2 text-sm">
          <span className="bg-brand-2 pulse-dot h-1.5 w-1.5 rounded-full" aria-hidden />
          {h.evidence.length
            ? `SAM found it at ${fmt(h.evidence[0].t_sec)}. Checking…`
            : 'Looking for it in the video…'}
        </div>
      )}
      {rejected && h.evidence.length === 0 && (
        <div className="mt-2.5">
          {frame && (
            <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
              <img
                src={frame.url}
                alt={`Keyframe at ${frame.t_sec}s, searched for ${h.phrase}`}
                className="absolute inset-0 h-full w-full object-contain opacity-55 grayscale"
              />
              <span className="media-tag absolute bottom-2 left-2 font-mono">"{h.phrase}" · 0 px</span>
            </div>
          )}
          <p className="text-text mt-2 text-sm">
            SAM searched frame {h.frame_idx} and found <span className="font-mono">0 px</span> for "{h.phrase}".
          </p>
        </div>
      )}
      {h.critic_reason && (
        <p
          className={['mt-2 text-sm', rejected ? 'text-muted' : 'text-text/85', selected ? '' : 'line-clamp-2'].join(
            ' ',
          )}
        >
          {h.critic_reason}
        </p>
      )}
      {(h.lane === 'verified' || h.lane === 'needs_check') && selected && (
        <div className="settle border-line mt-3 border-t pt-3 text-sm">
          <p className="text-text/90">{h.rationale}</p>
          <div className="bg-surface-2 mt-2.5 flex items-center justify-between gap-3 rounded-lg px-3 py-2">
            <span>
              <span className="text-muted">Fix: </span>
              {h.fix.action}
            </span>
            <span className="shrink-0 font-medium tabular-nums">{money(h.fix.est_cost_usd)}</span>
          </div>
          {h.lane === 'verified' && (
            <div className="mt-3 flex flex-wrap gap-2">
              {onFixPreview && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onFixPreview(h)
                  }}
                  className="btn-primary px-3.5 py-1.5 text-sm"
                >
                  <Icon name="wand" className="h-4 w-4" /> Show it fixed
                </button>
              )}
              {onTrack && h.evidence.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onTrack(h)
                  }}
                  className="btn-ghost px-3.5 py-1.5 text-sm"
                >
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
