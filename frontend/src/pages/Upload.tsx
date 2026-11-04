import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { Icon } from '../components/ui'
import type { ScanSummary } from '../types'

const STEPS = [
  {
    icon: 'film',
    model: 'Your phone',
    title: 'Film one slow walk',
    body: '20–30 seconds through the rooms your parent uses most.',
  },
  {
    icon: 'spark',
    model: 'Muse Spark 1.3',
    title: 'Spots likely hazards',
    body: 'Rugs, cords, clutter on stairs, dark hallways, missing grab bars.',
  },
  {
    icon: 'target',
    model: 'SAM 3.1',
    title: 'Proves each one in pixels',
    body: 'No pixels, no claim. Rejected guesses stay visible, crossed out.',
  },
  {
    icon: 'wand',
    model: 'Muse Image',
    title: 'Shows the room fixed',
    body: 'A preview the family can agree on, then re-film to confirm.',
  },
] as const

function mb(n: number) {
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

export function Upload() {
  const nav = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [label, setLabel] = useState<'before' | 'after'>('before')
  const [baseline, setBaseline] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scans, setScans] = useState<ScanSummary[]>([])
  const [drag, setDrag] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.listScans().then(setScans)
  }, [])

  const befores = scans.filter((s) => s.label === 'before' && !s.scan_id.startsWith('mock_'))
  // The demo link prefers a real, completed walkthrough (replayed from cache); the built-in sample is the fallback.
  const demo = befores.find((s) => s.status === 'complete') ?? null
  const demoTo = demo ? `/review/${demo.scan_id}` : '/review/mock_before'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const r = await api.upload(file, label, label === 'after' ? baseline || undefined : undefined, notes || undefined)
      nav(`/review/${r.scan_id}`)
    } catch {
      setError("We couldn't upload that video. Please try again in a moment.")
      setBusy(false)
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDrag(false)
    const f = e.dataTransfer.files?.[0]
    if (f && /video\/(mp4|quicktime)|\.(mp4|mov)$/i.test(f.type || f.name)) setFile(f)
  }

  return (
    <div className="grid gap-14 pb-6">
      <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:items-start">
        <section className="pt-2 lg:pt-6">
          <span className="eyebrow">Fall-safety check for an aging parent's home</span>
          <h1 className="mt-3 max-w-[16ch] text-[2.6rem] leading-[1.04] font-medium md:text-6xl">
            Walk through the house once. See every fall hazard,{' '}
            <em className="text-brand decoration-amber/60 not-italic underline decoration-[6px] underline-offset-[6px]">
              proven on camera.
            </em>
          </h1>
          <p className="text-muted mt-6 max-w-[52ch] text-lg md:text-xl">
            Film a slow walk through your parent's home on your phone. SafeNest lists what could cause a fall, shows
            exactly where it is, and drops any claim it can't back up with pixels.
          </p>
          <ul className="mt-6 grid gap-2 text-base">
            {[
              'Every hazard is pinned to a real frame of your video',
              'AI guesses that fail the check stay visible, crossed out',
              'A one-page plan for siblings, caregivers or an OT',
            ].map((t) => (
              <li key={t} className="flex items-start gap-2.5">
                <span className="bg-brand-soft text-brand mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full">
                  <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.6} />
                </span>
                {t}
              </li>
            ))}
          </ul>

          <Link to={demoTo} className="group card card-hover mt-8 flex max-w-xl items-center gap-4 px-5 py-4">
            <span className="bg-brand grid h-12 w-12 shrink-0 place-items-center rounded-full text-white transition-transform group-hover:scale-105">
              <Icon name="play" className="h-5 w-5 translate-x-px" fill="currentColor" />
            </span>
            <span className="min-w-0">
              <span className="flex items-baseline gap-3">
                <span className="text-xl font-medium">Try the sample walkthrough</span>
                <span className="text-muted text-sm">~20 s</span>
              </span>
              <span className="text-muted mt-0.5 block text-base">
                {demo
                  ? `See exactly how "${demo.title}" was checked.`
                  : 'Watch eight claims get sorted into verified, rejected and check-in-person.'}
              </span>
            </span>
            <Icon name="arrow" className="text-muted ml-auto h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
        </section>

        <form onSubmit={submit} className="card grid gap-5 p-5 md:p-7">
          <div>
            <h2 className="text-2xl font-medium">Check a walkthrough</h2>
            <p className="text-muted mt-1 text-base">Landscape, lights on, a slow steady walk. Under 200 MB.</p>
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                inputRef.current?.click()
              }
            }}
            onDragOver={(e) => {
              e.preventDefault()
              setDrag(true)
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            className={[
              'cursor-pointer rounded-xl border-2 border-dashed px-5 py-8 text-center transition-colors',
              drag
                ? 'border-brand-2 bg-brand-soft'
                : file
                  ? 'border-brand/40 bg-brand-soft/50'
                  : 'border-line bg-ink/40 hover:bg-surface-2',
            ].join(' ')}
          >
            <input
              ref={inputRef}
              type="file"
              accept="video/mp4,video/quicktime,.mp4,.mov"
              className="sr-only"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <span className="bg-brand grid h-10 w-10 place-items-center rounded-lg text-white">
                  <Icon name="film" />
                </span>
                <span className="min-w-0 text-left">
                  <span className="block max-w-[28ch] truncate font-medium">{file.name}</span>
                  <span className="text-muted block text-sm">{mb(file.size)} · click to choose a different video</span>
                </span>
              </div>
            ) : (
              <>
                <span className="bg-surface border-line text-brand mx-auto grid h-12 w-12 place-items-center rounded-full border">
                  <Icon name="upload" />
                </span>
                <p className="mt-3 font-medium">Drop the walkthrough video here</p>
                <p className="text-muted text-sm">or click to choose an .mp4 or .mov</p>
              </>
            )}
          </div>

          <fieldset>
            <legend className="mb-2 text-base font-medium">This walkthrough is</legend>
            <div className="bg-surface-2 grid grid-cols-2 gap-1 rounded-full p-1">
              {(['before', 'after'] as const).map((v) => (
                <label
                  key={v}
                  className={[
                    'cursor-pointer rounded-full px-3 py-2 text-center text-base transition-all',
                    label === v ? 'bg-surface font-medium shadow-sm' : 'text-muted hover:text-text',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    name="label"
                    value={v}
                    checked={label === v}
                    onChange={() => setLabel(v)}
                    className="sr-only"
                  />
                  {v === 'before' ? 'Before any fixes' : 'After fixing things'}
                </label>
              ))}
            </div>
          </fieldset>

          {label === 'after' && (
            <label className="settle block">
              <span className="mb-1.5 block text-base font-medium">Compare against</span>
              <select value={baseline} onChange={(e) => setBaseline(e.target.value)} className="field">
                <option value="">Choose an earlier walkthrough</option>
                {befores.map((s) => (
                  <option key={s.scan_id} value={s.scan_id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block">
            <span className="mb-1.5 block text-base font-medium">
              Anything the checker should know <span className="text-muted font-normal">(optional)</span>
            </span>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Mom uses a walker at night"
              className="field"
            />
          </label>

          {error && <p className="bg-verified-soft text-verified rounded-lg px-3 py-2 text-base">{error}</p>}

          <button type="submit" disabled={busy || !file} className="btn-primary w-full py-3 text-lg">
            {busy ? (
              'Uploading…'
            ) : (
              <>
                Check this walkthrough <Icon name="arrow" className="h-5 w-5" />
              </>
            )}
          </button>
        </form>
      </div>

      <section>
        <span className="eyebrow">How it works</span>
        <h2 className="mt-2 text-3xl font-medium md:text-4xl">One model makes the claim. Another has to prove it.</h2>
        <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="card relative p-5">
              <div className="flex items-center justify-between">
                <span className="bg-brand-soft text-brand grid h-10 w-10 place-items-center rounded-lg">
                  <Icon name={s.icon} />
                </span>
                <span className="font-display text-line text-3xl">{String(i + 1).padStart(2, '0')}</span>
              </div>
              <div className="text-muted mt-4 font-mono text-[0.78rem] tracking-wider uppercase">{s.model}</div>
              <div className="mt-1 text-lg leading-snug font-medium">{s.title}</div>
              <p className="text-muted mt-1 text-base">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-2xl font-medium md:text-3xl">Earlier walkthroughs</h2>
          <span className="text-muted text-base">{scans.length} saved</span>
        </div>
        {scans.length === 0 && <p className="text-muted mt-3">None yet.</p>}
        <ul className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {scans.map((s) => (
            <li key={s.scan_id}>
              <Link to={`/review/${s.scan_id}`} className="group card card-hover block h-full px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-lg leading-snug font-medium">{s.title}</span>
                  <span
                    className={`chip shrink-0 ${s.label === 'after' ? 'bg-fixed-soft text-fixed' : 'bg-surface-2 text-muted'}`}
                  >
                    {s.label}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  <span className="chip bg-verified-soft text-verified">{s.hazard_counts.verified} verified</span>
                  <span className="chip bg-surface-2 text-muted">{s.hazard_counts.rejected} rejected</span>
                  <span className="chip bg-check-soft text-check">{s.hazard_counts.needs_check} to check</span>
                  {s.status !== 'complete' && <span className="chip bg-amber-soft text-[#8a5a0c]">{s.status}</span>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
