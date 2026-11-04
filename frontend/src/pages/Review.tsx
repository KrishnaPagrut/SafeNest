import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import { FixPreviewDialog } from '../components/FixPreviewDialog'
import { FrameViewer } from '../components/FrameViewer'
import { Lanes } from '../components/Lanes'
import { TrackPlayer } from '../components/TrackPlayer'
import { Icon } from '../components/ui'
import { emptyStages, StageProgress, type StageState } from '../components/StageProgress'
import type { Hazard, Scan } from '../types'

export function Review() {
  const { scanId = '' } = useParams()
  const [scan, setScan] = useState<Scan | null>(null)
  const [hazards, setHazards] = useState<Hazard[]>([])
  const [stages, setStages] = useState<StageState>(emptyStages)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [preview, setPreview] = useState<Hazard | null>(null)
  const [tracking, setTracking] = useState<Hazard | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [replay, setReplay] = useState(0)

  // Load the scan shell first (frames, video), then let the event stream fill the lanes in.
  useEffect(() => {
    setHazards([]); setStages(emptyStages()); setSelectedId(null); setError(null); setTracking(null)
    let alive = true
    api.getScan(scanId).then((s) => alive && setScan({ ...s, hazards: [] })).catch((e) => alive && setError(e.message))
    const stop = api.events(scanId, (e) => {
      if (!alive) return
      switch (e.type) {
        case 'stage':
          setStages((st) => {
            const prev = st[e.data.stage]
            const now = performance.now()
            return { ...st, [e.data.stage]: e.data.status === 'start'
              ? { status: 'start', detail: e.data.detail, startedAt: now }
              : { status: 'done', detail: e.data.detail, startedAt: prev.startedAt, ms: prev.startedAt != null ? now - prev.startedAt : undefined } }
          })
          break
        case 'hazard_proposed':
        case 'hazard_grounded':
        case 'hazard_judged':
          setHazards((hs) => {
            const i = hs.findIndex((h) => h.hazard_id === e.data.hazard_id)
            return i === -1 ? [...hs, e.data] : hs.map((h, j) => (j === i ? e.data : h))
          })
          break
        case 'complete':
          setScan(e.data); setHazards(e.data.hazards)
          setStages((st) => Object.fromEntries(Object.entries(st).map(([k, v]) => [k, { ...v, status: 'done' }])) as StageState)
          break
        case 'error':
          setError(`${e.data.stage}: ${e.data.message}`)
          break
      }
    }, (err) => setError(err.message))
    return () => { alive = false; stop() }
  }, [scanId, replay])

  const selected = useMemo(() => hazards.find((h) => h.hazard_id === selectedId) ?? null, [hazards, selectedId])
  const onSelect = useCallback((h: Hazard) => { setTracking(null); setSelectedId((cur) => (cur === h.hazard_id ? null : h.hazard_id)) }, [])
  const onTrack = useCallback((h: Hazard) => { setSelectedId(h.hazard_id); setTracking(h) }, [])
  const done = scan?.status === 'complete' && hazards.every((h) => h.lane !== 'pending')
  const counts = {
    verified: hazards.filter((h) => h.lane === 'verified').length,
    needs_check: hazards.filter((h) => h.lane === 'needs_check').length,
    rejected: hazards.filter((h) => h.lane === 'rejected').length,
  }

  if (error && !scan) return <p className="rounded-lg bg-verified-soft px-4 py-3 text-verified">Couldn't load this walkthrough. {error}</p>
  if (!scan) return <p className="text-muted">Loading…</p>

  return (
    <div className="grid gap-5 2xl:h-full 2xl:grid-rows-[auto_auto_minmax(0,1fr)]">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <span className="eyebrow">{scan.label === 'after' ? 'After walkthrough' : 'Walkthrough review'}{scan.scan_id.startsWith('mock_') ? ' · sample' : ''}</span>
          <h1 className="mt-1 text-3xl md:text-[2.6rem] font-medium leading-tight">{scan.title || 'Checking the walkthrough'}</h1>
          {done && scan.summary && <p className="mt-1.5 text-muted max-w-[90ch] 2xl:line-clamp-1">{scan.summary}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {scan.label === 'after' && scan.baseline_scan_id && (
            <Link to={`/compare/${scan.scan_id}/${scan.baseline_scan_id}`} className="btn-primary">See what changed <Icon name="arrow" className="h-4 w-4" /></Link>
          )}
          {done && <Link to={`/report/${scan.scan_id}`} className={scan.label === 'after' ? 'btn-ghost' : 'btn-primary'}><Icon name="doc" className="h-4 w-4" /> Family report</Link>}
          {done && scan.scan_id.startsWith('mock_') && (
            <button type="button" onClick={() => setReplay((n) => n + 1)} className="btn-ghost"><Icon name="replay" className="h-4 w-4" /> Replay</button>
          )}
        </div>
      </header>

      <StageProgress stages={stages} timings={done ? scan.timings_ms : undefined} />
      {error && <p className="rounded-lg bg-verified-soft px-4 py-2 text-verified">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-start 2xl:min-h-0">
        <div className="lg:sticky lg:top-0 grid gap-3">
          {tracking ? <TrackPlayer scan={scan} hazard={tracking} onClose={() => setTracking(null)} /> : <FrameViewer scan={scan} selected={selected} />}
          {done && (
            <div className="settle grid grid-cols-3 gap-2">
              <Stat n={counts.verified} label="confirmed on camera" cls="text-verified" />
              <Stat n={counts.rejected} label="AI claims dropped" cls="text-muted" />
              <Stat n={counts.needs_check} label="to check in person" cls="text-check" />
            </div>
          )}
        </div>
        <div className="2xl:h-full 2xl:min-h-0 2xl:overflow-y-auto no-scrollbar 2xl:pb-2">
          <Lanes hazards={hazards} selectedId={selectedId} onSelect={onSelect} onFixPreview={setPreview} onTrack={onTrack} frames={scan.frames} />
        </div>
      </div>

      {preview && <FixPreviewDialog hazard={preview} onClose={() => setPreview(null)} />}
    </div>
  )
}

function Stat({ n, label, cls }: { n: number; label: string; cls: string }) {
  return (
    <div className="card px-3.5 py-2.5">
      <div className={`font-display text-3xl leading-none tabular-nums ${cls}`}>{n}</div>
      <div className="mt-1 text-sm text-muted leading-tight">{label}</div>
    </div>
  )
}
