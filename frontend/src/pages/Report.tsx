import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import type { Scan } from '../types'

export function Report() {
  const { scanId = '' } = useParams()
  const [scan, setScan] = useState<Scan | null>(null)
  useEffect(() => { api.getScan(scanId).then(setScan).catch(() => setScan(null)) }, [scanId])
  const isMock = scanId.startsWith('mock_')
  const url = api.reportUrl(scanId)

  const verified = scan?.hazards.filter((h) => h.lane === 'verified') ?? []
  const checks = scan?.hazards.filter((h) => h.lane === 'needs_check') ?? []

  return (
    <div className="grid gap-6 max-w-3xl">
      <header>
        <h1 className="text-3xl md:text-4xl font-medium leading-tight">One page for the family</h1>
        <p className="mt-2 text-muted">A short PDF to share with siblings, a caregiver or an occupational therapist.</p>
      </header>

      <div className="flex flex-wrap gap-3">
        {isMock ? (
          <span className="rounded-md border border-line px-4 py-2 text-muted">The sample walkthrough has no PDF. Upload a real video to get one.</span>
        ) : (
          <>
            <a href={url} target="_blank" rel="noreferrer" className="rounded-md bg-text text-ink px-4 py-2 font-medium">Open the PDF</a>
            <a href={url} download className="rounded-md border border-line px-4 py-2 hover:bg-surface-2">Download</a>
          </>
        )}
        <Link to={`/review/${scanId}`} className="rounded-md border border-line px-4 py-2 hover:bg-surface-2">Back to the review</Link>
      </div>

      {scan && (
        <section className="rounded-lg border border-line bg-surface p-5 grid gap-4">
          <div>
            <h2 className="text-2xl font-medium">{scan.title}</h2>
            <p className="text-muted">{scan.summary}</p>
          </div>
          <div>
            <h3 className="font-medium mb-2">Fix these ({verified.length})</h3>
            <ol className="grid gap-2 list-decimal pl-6">
              {verified.sort((a, b) => b.severity - a.severity).map((h) => (
                <li key={h.hazard_id}>
                  <span className="font-medium">{h.title}.</span> {h.fix.action}
                  <span className="text-muted"> · ${h.fix.est_cost_usd[0]}–{h.fix.est_cost_usd[1]}</span>
                </li>
              ))}
            </ol>
          </div>
          {checks.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">Check in person ({checks.length})</h3>
              <ul className="grid gap-2 list-disc pl-6">
                {checks.map((h) => <li key={h.hazard_id}><span className="font-medium">{h.title}.</span> {h.fix.action}</li>)}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
