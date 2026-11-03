import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import type { ScanSummary } from '../types'

export function Upload() {
  const nav = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [label, setLabel] = useState<'before' | 'after'>('before')
  const [baseline, setBaseline] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scans, setScans] = useState<ScanSummary[]>([])
  const [online, setOnline] = useState<boolean | null>(null)

  useEffect(() => {
    api.listScans().then(setScans)
    api.health().then((h) => setOnline(h.ok)).catch(() => setOnline(false))
  }, [])

  const befores = scans.filter((s) => s.label === 'before' && !s.scan_id.startsWith('mock_'))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setBusy(true); setError(null)
    try {
      const r = await api.upload(file, label, label === 'after' ? baseline || undefined : undefined, notes || undefined)
      nav(`/review/${r.scan_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
      <section>
        <h1 className="text-4xl md:text-5xl font-medium leading-tight max-w-[20ch]">
          Walk through the house once. See every fall hazard, proven on camera.
        </h1>
        <p className="mt-4 text-muted max-w-[60ch]">
          Film a slow walk through your parent's home on your phone. SafeNest lists what could cause a fall,
          shows you exactly where it is, and drops any claim it cannot back up with pixels.
        </p>

        <form onSubmit={submit} className="mt-8 grid gap-4 max-w-xl">
          <label className="block">
            <span className="block mb-1">Walkthrough video</span>
            <input
              type="file" accept="video/mp4,video/quicktime,.mp4,.mov" required
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full rounded-md border border-line bg-surface px-3 py-2 file:mr-3 file:rounded file:border-0 file:bg-text file:text-ink file:px-3 file:py-1 file:font-medium"
            />
            <span className="block mt-1 text-base text-muted">20–30 seconds, landscape, lights on. Under 200 MB.</span>
          </label>

          <fieldset className="flex gap-3">
            <legend className="mb-1">This walkthrough is</legend>
            {(['before', 'after'] as const).map((v) => (
              <label key={v} className={['flex-1 rounded-md border px-3 py-2 cursor-pointer', label === v ? 'border-text bg-surface-2' : 'border-line bg-surface'].join(' ')}>
                <input type="radio" name="label" value={v} checked={label === v} onChange={() => setLabel(v)} className="mr-2" />
                {v === 'before' ? 'Before any fixes' : 'After fixing things'}
              </label>
            ))}
          </fieldset>

          {label === 'after' && (
            <label className="block">
              <span className="block mb-1">Compare against</span>
              <select value={baseline} onChange={(e) => setBaseline(e.target.value)} className="block w-full rounded-md border border-line bg-surface px-3 py-2">
                <option value="">Choose an earlier walkthrough</option>
                {befores.map((s) => <option key={s.scan_id} value={s.scan_id}>{s.title}</option>)}
              </select>
            </label>
          )}

          <label className="block">
            <span className="block mb-1">Anything the checker should know <span className="text-muted">(optional)</span></span>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Mom uses a walker at night" className="block w-full rounded-md border border-line bg-surface px-3 py-2" />
          </label>

          {error && <p className="text-verified">{error}</p>}
          {online === false && <p className="text-base text-muted">The backend is not running, so uploads will not work yet. The sample walkthrough still does.</p>}

          <div className="flex flex-wrap gap-3 items-center">
            <button type="submit" disabled={busy || !file} className="rounded-md bg-text text-ink px-4 py-2 font-medium disabled:opacity-50">
              {busy ? 'Uploading…' : 'Check this walkthrough'}
            </button>
            <Link to="/review/mock_before" className="rounded-md border border-line px-4 py-2 hover:bg-surface-2">Try the sample walkthrough</Link>
          </div>
        </form>
      </section>

      <aside>
        <h2 className="text-2xl font-medium mb-3">Earlier walkthroughs</h2>
        {scans.length === 0 && <p className="text-muted">None yet.</p>}
        <ul className="grid gap-2">
          {scans.map((s) => (
            <li key={s.scan_id}>
              <Link to={`/review/${s.scan_id}`} className="block rounded-md border border-line bg-surface px-4 py-3 hover:bg-surface-2">
                <div className="flex justify-between gap-3">
                  <span className="font-medium">{s.title}</span>
                  <span className="text-muted text-base">{s.label}</span>
                </div>
                <div className="text-base text-muted mt-1">
                  {s.hazard_counts.verified} verified · {s.hazard_counts.rejected} rejected · {s.hazard_counts.needs_check} to check
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  )
}
