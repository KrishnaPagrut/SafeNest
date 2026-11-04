import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import { Icon, Logo, money, SeverityChip } from '../components/ui'
import type { Scan } from '../types'

export function Report() {
  const { scanId = '' } = useParams()
  const [scan, setScan] = useState<Scan | null>(null)
  useEffect(() => {
    api
      .getScan(scanId)
      .then(setScan)
      .catch(() => setScan(null))
  }, [scanId])
  const isMock = scanId.startsWith('mock_')
  const url = api.reportUrl(scanId)

  const verified = [...(scan?.hazards.filter((h) => h.lane === 'verified') ?? [])].sort(
    (a, b) => b.severity - a.severity,
  )
  const checks = scan?.hazards.filter((h) => h.lane === 'needs_check') ?? []
  const dropped = scan?.hazards.filter((h) => h.lane === 'rejected') ?? []
  const lo = verified.reduce((n, h) => n + h.fix.est_cost_usd[0], 0)
  const hi = verified.reduce((n, h) => n + h.fix.est_cost_usd[1], 0)
  const today = verified.filter((h) => h.severity === 3).length

  return (
    <div className="mx-auto grid max-w-4xl gap-6 pb-6">
      <header className="no-print flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Family report</span>
          <h1 className="mt-1 text-3xl leading-tight font-medium md:text-[2.6rem]">One page for the family</h1>
          <p className="text-muted mt-1.5">Share it with siblings, a caregiver or an occupational therapist.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isMock && (
            <>
              <a href={url} target="_blank" rel="noreferrer" className="btn-primary">
                <Icon name="doc" className="h-4 w-4" /> Open the PDF
              </a>
              <a href={url} download className="btn-ghost">
                Download
              </a>
            </>
          )}
          <button type="button" onClick={() => window.print()} className={isMock ? 'btn-primary' : 'btn-ghost'}>
            <Icon name="print" className="h-4 w-4" /> Print / save as PDF
          </button>
          <Link to={`/review/${scanId}`} className="btn-ghost">
            Back to the review
          </Link>
        </div>
      </header>

      {scan && (
        <article className="print-sheet card grid gap-7 p-6 md:p-10">
          <div className="border-line flex items-start justify-between gap-6 border-b pb-5">
            <div>
              <div className="text-muted flex items-center gap-2 text-sm">
                <Logo className="h-5 w-5" /> SafeNest home check ·{' '}
                {new Date(scan.created_at).toLocaleDateString(undefined, {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
              <h2 className="mt-2 text-3xl leading-tight font-medium">{scan.title}</h2>
              <p className="text-muted mt-2 max-w-[65ch]">{scan.summary}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Fact n={verified.length} label="hazards to fix" cls="text-verified" />
            <Fact n={today} label="worth fixing today" cls="text-verified" />
            <Fact n={checks.length} label="to check in person" cls="text-check" />
            <Fact n={lo === hi ? `$${lo}` : `$${lo}–${hi}`} label="estimated total" cls="text-brand" />
          </div>

          <section>
            <h3 className="text-xl font-medium">Fix these, most urgent first</h3>
            <ol className="divide-line border-line mt-3 divide-y overflow-hidden rounded-xl border">
              {verified.map((h, i) => (
                <li key={h.hazard_id} className="bg-surface grid grid-cols-[2rem_1fr_auto] gap-3 px-4 py-3">
                  <span className="font-display text-muted text-xl tabular-nums">{i + 1}</span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{h.title}</span>
                      <SeverityChip severity={h.severity} />
                    </div>
                    <p className="text-muted mt-0.5 text-sm">
                      <span className="capitalize">{h.room}</span> · {h.fix.action}
                    </p>
                  </div>
                  <span className="text-right font-medium tabular-nums">{money(h.fix.est_cost_usd)}</span>
                </li>
              ))}
            </ol>
          </section>

          {checks.length > 0 && (
            <section>
              <h3 className="text-xl font-medium">Check in person</h3>
              <p className="text-muted text-sm">A camera can't prove something is missing, so someone should look.</p>
              <ul className="mt-3 grid gap-2">
                {checks.map((h) => (
                  <li key={h.hazard_id} className="bg-check-soft/70 flex items-start gap-3 rounded-xl px-4 py-3">
                    <Icon name="eye" className="text-check mt-0.5 h-5 w-5 shrink-0" />
                    <span>
                      <span className="font-medium">{h.title}.</span>{' '}
                      <span className="text-text/80">{h.fix.action}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {dropped.length > 0 && (
            <section className="border-line text-muted rounded-xl border border-dashed px-4 py-3 text-sm">
              <span className="text-text font-medium">Checked and dropped: </span>
              {dropped.map((h) => h.title).join(', ')}. The AI suggested these, but nothing in the video backed them up.
            </section>
          )}

          <footer className="border-line text-muted flex items-center gap-2 border-t pt-4 text-sm">
            <Icon name="shield" className="text-brand h-4 w-4" />
            Every hazard above was found by Muse Spark and confirmed in the video by SAM 3.1. Re-film after fixing to
            update this page.
          </footer>
        </article>
      )}
    </div>
  )
}

function Fact({ n, label, cls }: { n: number | string; label: string; cls: string }) {
  return (
    <div className="bg-surface-2/70 rounded-xl px-4 py-3">
      <div className={`font-display text-3xl leading-none tabular-nums ${cls}`}>{n}</div>
      <div className="text-muted mt-1 text-sm">{label}</div>
    </div>
  )
}
