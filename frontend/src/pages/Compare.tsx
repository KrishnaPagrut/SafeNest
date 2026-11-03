import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import { fmt, MaskedFrame, nearestFrame } from '../components/MaskedFrame'
import type { Comparison, Scan } from '../types'

const STATUS = {
  fixed: { label: 'Fixed', cls: 'bg-fixed text-ink' },
  still_present: { label: 'Still there', cls: 'bg-amber text-ink' },
  new: { label: 'New', cls: 'bg-verified text-text' },
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
      .catch((e) => setError(e.message))
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

  if (error) return <p className="text-verified">Could not compare these walkthroughs. {error}</p>
  if (!cmp || !before || !after) return <p className="text-muted">Comparing…</p>

  const fixed = cmp.items.filter((i) => i.status === 'fixed').length
  const drop = cmp.score_before ? Math.round((1 - cmp.score_after / cmp.score_before) * 100) : 0
  const maxT = Math.max(before.duration_sec, after.duration_sec)

  return (
    <div className="grid gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-medium leading-tight">What changed after the fixes</h1>
          <p className="mt-2 text-muted max-w-[70ch]">
            {fixed} of {cmp.items.length} hazards are gone. Risk score went from {cmp.score_before} to {cmp.score_after}
            {drop > 0 ? `, down ${drop}%` : ''}.
            <span className="block text-base mt-1">Risk score adds the severity of every hazard still present: 3 for fix today, 2 for this week, 1 for worth fixing.</span>
          </p>
        </div>
        <div className="flex items-baseline gap-6">
          <Score label="Before" value={cmp.score_before} />
          <span className="text-muted text-2xl" aria-hidden>→</span>
          <Score label="After" value={cmp.score_after} />
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
          <label className="flex items-center gap-3 text-base text-muted">
            <span className="tabular-nums w-10">{fmt(t)}</span>
            <input type="range" min={0} max={Math.max(1, Math.floor(maxT))} step={1} value={t} onChange={(e) => setT(Number(e.target.value))}
              aria-label="Scrub both walkthroughs" className="flex-1 accent-[#f2ece2]" />
            <span className="tabular-nums w-10 text-right">{fmt(maxT)}</span>
          </label>
        </section>
      )}

      <ul className="grid gap-2">
        {cmp.items.map((it, i) => {
          const s = STATUS[it.status]
          const active = i === sel
          return (
            <li key={i}>
              <button type="button" onClick={() => pick(i)}
                className={['w-full text-left flex flex-wrap items-center gap-3 rounded-md border px-4 py-3', active ? 'border-text bg-surface-2' : 'border-line bg-surface hover:bg-surface-2'].join(' ')}>
                <span className={`rounded px-2 py-0.5 text-base font-medium ${s.cls}`}>{s.label}</span>
                <span className="font-medium">{it.title}</span>
                <span className="text-muted text-base basis-full md:basis-auto md:ml-auto">{it.note}</span>
              </button>
            </li>
          )
        })}
      </ul>

      <div className="flex gap-3">
        <Link to={`/report/${after.scan_id}`} className="rounded-md bg-text text-ink px-4 py-2 font-medium">Make the report</Link>
        <Link to={`/review/${before.scan_id}`} className="rounded-md border border-line px-4 py-2 hover:bg-surface-2">Before review</Link>
        <Link to={`/review/${after.scan_id}`} className="rounded-md border border-line px-4 py-2 hover:bg-surface-2">After review</Link>
      </div>
    </div>
  )
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-right">
      <div className="text-4xl font-medium tabular-nums leading-none">{value}</div>
      <div className="text-base text-muted">{label} risk</div>
    </div>
  )
}
