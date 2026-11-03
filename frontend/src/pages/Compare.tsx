import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
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

  useEffect(() => {
    Promise.all([api.compare(afterId, beforeId), api.getScan(beforeId), api.getScan(afterId)])
      .then(([c, b, a]) => { setCmp(c); setBefore(b); setAfter(a) })
      .catch((e) => setError(e.message))
  }, [afterId, beforeId])

  if (error) return <p className="text-verified">Could not compare these walkthroughs. {error}</p>
  if (!cmp || !before || !after) return <p className="text-muted">Comparing…</p>

  const fixed = cmp.items.filter((i) => i.status === 'fixed').length
  const drop = cmp.score_before ? Math.round((1 - cmp.score_after / cmp.score_before) * 100) : 0

  return (
    <div className="grid gap-8">
      <header>
        <h1 className="text-3xl md:text-4xl font-medium leading-tight">What changed after the fixes</h1>
        <p className="mt-2 text-muted max-w-[70ch]">
          {fixed} of {cmp.items.length} hazards are gone. Risk score went from {cmp.score_before} to {cmp.score_after}
          {drop > 0 ? `, down ${drop}%` : ''}.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {[['Before', before, cmp.score_before], ['After', after, cmp.score_after]].map(([label, s, score]) => {
          const scan = s as Scan
          const frame = scan.frames[Math.min(4, scan.frames.length - 1)]
          return (
            <div key={label as string} className="rounded-lg border border-line bg-surface overflow-hidden">
              <div className="aspect-video bg-black">
                {scan.video_url ? <video src={scan.video_url} controls className="w-full h-full object-contain" /> : frame && <img src={frame.url} alt="" className="w-full h-full object-contain" />}
              </div>
              <div className="flex items-baseline justify-between px-4 py-3">
                <div>
                  <div className="font-medium">{label as string}</div>
                  <Link to={`/review/${scan.scan_id}`} className="text-base text-muted underline underline-offset-4">{scan.title}</Link>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-medium tabular-nums">{score as number}</div>
                  <div className="text-base text-muted">risk score</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <ul className="grid gap-2">
        {cmp.items.map((it, i) => {
          const s = STATUS[it.status]
          return (
            <li key={i} className="flex flex-wrap items-center gap-3 rounded-md border border-line bg-surface px-4 py-3">
              <span className={`rounded px-2 py-0.5 text-base font-medium ${s.cls}`}>{s.label}</span>
              <span className="font-medium">{it.title}</span>
              <span className="text-muted text-base basis-full md:basis-auto md:ml-auto">{it.note}</span>
            </li>
          )
        })}
      </ul>

      <div>
        <Link to={`/report/${after.scan_id}`} className="rounded-md bg-text text-ink px-4 py-2 font-medium">Make the report</Link>
      </div>
    </div>
  )
}
