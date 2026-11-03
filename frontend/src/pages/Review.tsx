import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import { FixPreviewDialog } from '../components/FixPreviewDialog'
import { FrameViewer } from '../components/FrameViewer'
import { Lanes } from '../components/Lanes'
import { TrackPlayer } from '../components/TrackPlayer'
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
  }

  if (error && !scan) return <p className="text-verified">Could not load this walkthrough. {error}</p>
  if (!scan) return <p className="text-muted">Loading…</p>

  return (
    <div className="grid gap-5 2xl:h-full 2xl:grid-rows-[auto_auto_minmax(0,1fr)]">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-medium leading-tight">{scan.title || 'Checking the walkthrough'}</h1>
          {done && scan.summary && <p className="mt-1 text-muted max-w-[90ch] 2xl:line-clamp-1">{scan.summary}</p>}
        </div>
        <div className="flex gap-2">
          {scan.label === 'after' && scan.baseline_scan_id && (
            <Link to={`/compare/${scan.scan_id}/${scan.baseline_scan_id}`} className="rounded-md bg-text text-ink px-4 py-2 font-medium">See what changed</Link>
          )}
          {done && <Link to={`/report/${scan.scan_id}`} className="rounded-md border border-line px-4 py-2 hover:bg-surface-2">Report</Link>}
          {done && scan.scan_id.startsWith('mock_') && (
            <button type="button" onClick={() => setReplay((n) => n + 1)} className="rounded-md border border-line px-4 py-2 hover:bg-surface-2">Replay</button>
          )}
        </div>
      </header>

      <StageProgress stages={stages} timings={done ? scan.timings_ms : undefined} />
      {error && <p className="text-verified">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-start 2xl:min-h-0">
        <div className="lg:sticky lg:top-0 grid gap-3">
          {tracking ? <TrackPlayer scan={scan} hazard={tracking} onClose={() => setTracking(null)} /> : <FrameViewer scan={scan} selected={selected} />}
          {done && (
            <p className="text-base text-muted">
              {counts.verified} hazard{counts.verified === 1 ? '' : 's'} confirmed on camera
              {counts.needs_check ? `, ${counts.needs_check} to check in person` : ''}.
            </p>
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
