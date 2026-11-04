import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import { fmt, MaskedFrame, nearestFrame } from '../components/MaskedFrame'
import { Icon } from '../components/ui'
import type { Comparison, Scan } from '../types'

const STATUS = {
  fixed: { label: 'Fixed', cls: 'bg-fixed-soft text-fixed', icon: 'check' },
  still_present: { label: 'Still there', cls: 'bg-amber-soft text-[#8a5a0c]', icon: 'eye' },
  new: { label: 'New', cls: 'bg-verified-soft text-verified', icon: 'spark' },
} as const

export function Compare() {
  const { afterId = '', beforeId = '' } = useParams()
  const [cmp, setCmp] = useState<Comparison | null>(null)
  const [before, setBefore] = useState<Scan | null>(null)
  const [after, setAfter] = useState<Scan | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sel, setSel] = useState<number | null>(null)
  const [t, setT] = useState(0)

  useEffect(() => {
    Promise.all([api.compare(afterId, beforeId), api.getScan(beforeId), api.getScan(afterId)])
      .then(([c, b, a]) => {
        setCmp(c); setBefore(b); setAfter(a)
        const first = c.items.findIndex((i) => i.status !== 'new')
        if (first !== -1) pick(first, c, b, a)
      })
      .catch((e) => { console.error(e); setError('failed') })
  }, [afterId, beforeId])

  function pick(i: number, c = cmp, b = before, a = after) {
    if (!c || !b || !a) return
    const it = c.items[i]
    const h = b.hazards.find((x) => x.hazard_id === it.before_hazard_id) ?? a.hazards.find((x) => x.hazard_id === it.after_hazard_id)
    setSel(i)
    setT(h?.evidence[0]?.t_sec ?? h?.t_sec ?? 0)
  }

  const view = useMemo(() => {
    if (sel == null || !cmp || !before || !after) return null
    const it = cmp.items[sel]
    const bh = before.hazards.find((x) => x.hazard_id === it.before_hazard_id) ?? null
    const ah = after.hazards.find((x) => x.hazard_id === it.after_hazard_id) ?? null
    const bf = nearestFrame(before.frames, t), af = nearestFrame(after.frames, t)
    return {
      it, bf, af,
      bEv: bh && bf ? bh.evidence.filter((e) => e.frame_idx === bf.frame_idx) : [],
      aEv: ah && af ? ah.evidence.filter((e) => e.frame_idx === af.frame_idx) : [],
      phrase: bh?.phrase ?? ah?.phrase ?? '',
    }
  }, [sel, cmp, before, after, t])

  if (error) return <p className="rounded-lg bg-verified-soft px-4 py-3 text-verified">We couldn't compare these two walkthroughs.</p>
  if (!cmp || !before || !after) return <p className="text-muted">Comparing…</p>

  const fixed = cmp.items.filter((i) => i.status === 'fixed').length
  const drop = cmp.score_before ? Math.round((1 - cmp.score_after / cmp.score_before) * 100) : 0
  const maxT = Math.max(before.duration_sec, after.duration_sec)

  return (
    <div className="grid gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Before vs. after</span>
          <h1 className="mt-1 text-3xl md:text-[2.6rem] font-medium leading-tight">What changed after the fixes</h1>
          <p className="mt-2 text-lg max-w-[60ch]">
            <span className="font-medium">{fixed} of {cmp.items.length} hazards are gone.</span>{' '}
            <span className="text-muted">Risk score went from {cmp.score_before} to {cmp.score_after}{drop > 0 ? `, down ${drop}%` : ''}.</span>
          </p>
          <p className="mt-1 text-sm text-muted max-w-[70ch]">Risk score adds the severity of every hazard still present: 3 for fix today, 2 for this week, 1 for worth fixing.</p>
        </div>
        <div className="card flex items-center gap-5 px-6 py-4">
          <Score label="Before" value={cmp.score_before} cls="text-verified" />
          <Icon name="arrow" className="h-6 w-6 text-muted" />
          <Score label="After" value={cmp.score_after} cls="text-fixed" />
          {drop > 0 && <span className="chip bg-fixed-soft text-fixed text-base">−{drop}%</span>}
        </div>
      </header>

      {view && (
        <section className="grid gap-3">
          <div className="grid gap-4 md:grid-cols-2">
            <MaskedFrame
              frame={view.bf} evidence={view.bEv} tone="verified"
              caption={<><span className="text-text">Before</span><span>{view.bf ? fmt(view.bf.t_sec) : ''}{view.bEv.length ? ` · SAM found "${view.phrase}"` : ''}</span></>}
            />
            <MaskedFrame
              frame={view.af} evidence={view.aEv} tone="still"
              stamp={view.it.status === 'fixed' && view.af && view.bEv.length ? `SAM: 0 px for "${view.phrase}"` : undefined}
              caption={<><span className="text-text">After</span><span>{view.af ? fmt(view.af.t_sec) : ''}{view.aEv.length ? ' · still detected' : ''}</span></>}
            />
          </div>
          <label className="card flex items-center gap-3 px-4 py-2.5 text-sm text-muted">
            <span className="tabular-nums w-10 font-mono">{fmt(t)}</span>
            <input type="range" min={0} max={Math.max(1, Math.floor(maxT))} step={1} value={t} onChange={(e) => setT(Number(e.target.value))}
              aria-label="Scrub both walkthroughs" className="flex-1 accent-[#1e4b3a]" />
            <span className="tabular-nums w-10 text-right font-mono">{fmt(maxT)}</span>
          </label>
        </section>
      )}

      <ul className="grid gap-2 -mt-2">
        {cmp.items.map((it, i) => {
          const s = STATUS[it.status]
          const active = i === sel
          return (
            <li key={i}>
              <button type="button" onClick={() => pick(i)}
                className={['w-full text-left flex flex-wrap items-center gap-3 rounded-xl border bg-surface px-4 py-3 transition-all', active ? 'border-text/70 shadow-[var(--shadow-lift)]' : 'border-line hover:border-text/25'].join(' ')}>
                <span className={`chip w-28 justify-center ${s.cls}`}><Icon name={s.icon} className="h-3.5 w-3.5" strokeWidth={2.4} />{s.label}</span>
                <span className="font-medium">{it.title}</span>
                <span className="text-muted text-sm basis-full md:basis-auto md:ml-auto">{it.note}</span>
              </button>
            </li>
          )
        })}
      </ul>

      <div className="flex flex-wrap gap-2">
        <Link to={`/report/${after.scan_id}`} className="btn-primary"><Icon name="doc" className="h-4 w-4" /> Make the report</Link>
        <Link to={`/review/${before.scan_id}`} className="btn-ghost">Before review</Link>
        <Link to={`/review/${after.scan_id}`} className="btn-ghost">After review</Link>
      </div>
    </div>
  )
}

function Score({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <div className="text-center">
      <div className={`font-display text-5xl font-medium tabular-nums leading-none ${cls}`}>{value}</div>
      <div className="mt-1 text-sm text-muted">{label} risk</div>
    </div>
  )
}
