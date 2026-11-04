import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import { Icon, Logo, money, SeverityChip } from '../components/ui'
import type { Scan } from '../types'

export function Report() {
  const { scanId = '' } = useParams()
  const [scan, setScan] = useState<Scan | null>(null)
  useEffect(() => { api.getScan(scanId).then(setScan).catch(() => setScan(null)) }, [scanId])
  const isMock = scanId.startsWith('mock_')
  const url = api.reportUrl(scanId)

  const verified = [...(scan?.hazards.filter((h) => h.lane === 'verified') ?? [])].sort((a, b) => b.severity - a.severity)
  const checks = scan?.hazards.filter((h) => h.lane === 'needs_check') ?? []
  const dropped = scan?.hazards.filter((h) => h.lane === 'rejected') ?? []
  const lo = verified.reduce((n, h) => n + h.fix.est_cost_usd[0], 0)
  const hi = verified.reduce((n, h) => n + h.fix.est_cost_usd[1], 0)
  const today = verified.filter((h) => h.severity === 3).length

  return (
    <div className="grid gap-6 max-w-4xl mx-auto pb-6">
      <header className="no-print flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Family report</span>
          <h1 className="mt-1 text-3xl md:text-[2.6rem] font-medium leading-tight">One page for the family</h1>
          <p className="mt-1.5 text-muted">Share it with siblings, a caregiver or an occupational therapist.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isMock && (
            <>
              <a href={url} target="_blank" rel="noreferrer" className="btn-primary"><Icon name="doc" className="h-4 w-4" /> Open the PDF</a>
              <a href={url} download className="btn-ghost">Download</a>
            </>
          )}
          <button type="button" onClick={() => window.print()} className={isMock ? 'btn-primary' : 'btn-ghost'}>
            <Icon name="print" className="h-4 w-4" /> Print / save as PDF
          </button>
          <Link to={`/review/${scanId}`} className="btn-ghost">Back to the review</Link>
        </div>
      </header>

      {scan && (
        <article className="print-sheet card p-6 md:p-10 grid gap-7">
          <div className="flex items-start justify-between gap-6 border-b border-line pb-5">
            <div>
              <div className="flex items-center gap-2 text-muted text-sm">
                <Logo className="h-5 w-5" /> SafeNest home check · {new Date(scan.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
              <h2 className="mt-2 text-3xl font-medium leading-tight">{scan.title}</h2>
              <p className="mt-2 text-muted max-w-[65ch]">{scan.summary}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Fact n={verified.length} label="hazards to fix" cls="text-verified" />
            <Fact n={today} label="worth fixing today" cls="text-verified" />
            <Fact n={checks.length} label="to check in person" cls="text-check" />
            <Fact n={lo === hi ? `$${lo}` : `$${lo}–${hi}`} label="estimated total" cls="text-brand" />
          </div>

          <section>
            <h3 className="text-xl font-medium">Fix these, most urgent first</h3>
            <ol className="mt-3 divide-y divide-line rounded-xl border border-line overflow-hidden">
              {verified.map((h, i) => (
                <li key={h.hazard_id} className="grid grid-cols-[2rem_1fr_auto] gap-3 px-4 py-3 bg-surface">
                  <span className="font-display text-xl text-muted tabular-nums">{i + 1}</span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{h.title}</span>
                      <SeverityChip severity={h.severity} />
                    </div>
                    <p className="mt-0.5 text-sm text-muted"><span className="capitalize">{h.room}</span> · {h.fix.action}</p>
                  </div>
                  <span className="font-medium tabular-nums text-right">{money(h.fix.est_cost_usd)}</span>
                </li>
              ))}
            </ol>
          </section>

          {checks.length > 0 && (
            <section>
              <h3 className="text-xl font-medium">Check in person</h3>
              <p className="text-sm text-muted">A camera can't prove something is missing, so someone should look.</p>
              <ul className="mt-3 grid gap-2">
                {checks.map((h) => (
                  <li key={h.hazard_id} className="flex items-start gap-3 rounded-xl bg-check-soft/70 px-4 py-3">
                    <Icon name="eye" className="mt-0.5 h-5 w-5 text-check shrink-0" />
                    <span><span className="font-medium">{h.title}.</span> <span className="text-text/80">{h.fix.action}</span></span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {dropped.length > 0 && (
            <section className="rounded-xl border border-dashed border-line px-4 py-3 text-sm text-muted">
              <span className="font-medium text-text">Checked and dropped: </span>
              {dropped.map((h) => h.title).join(', ')}. The AI suggested these, but nothing in the video backed them up.
            </section>
          )}

          <footer className="flex items-center gap-2 border-t border-line pt-4 text-sm text-muted">
            <Icon name="shield" className="h-4 w-4 text-brand" />
            Every hazard above was found by Muse Spark and confirmed in the video by SAM 3.1. Re-film after fixing to update this page.
          </footer>
        </article>
      )}
    </div>
  )
}

function Fact({ n, label, cls }: { n: number | string; label: string; cls: string }) {
  return (
    <div className="rounded-xl bg-surface-2/70 px-4 py-3">
      <div className={`font-display text-3xl leading-none tabular-nums ${cls}`}>{n}</div>
      <div className="mt-1 text-sm text-muted">{label}</div>
    </div>
  )
}
