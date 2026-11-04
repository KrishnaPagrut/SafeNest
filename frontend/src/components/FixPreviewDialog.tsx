import { useEffect, useState } from 'react'
import { api } from '../api'
import type { FixPreview, Hazard } from '../types'
import { BeforeAfter } from './BeforeAfter'

export function FixPreviewDialog({ hazard, onClose }: { hazard: Hazard; onClose: () => void }) {
  const [preview, setPreview] = useState<FixPreview | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    api.fixPreview(hazard.hazard_id).then((p) => alive && setPreview(p)).catch((e) => alive && setError(String(e.message ?? e)))
    return () => { alive = false }
  }, [hazard.hazard_id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-20 bg-[#1f1a14]/55 backdrop-blur-sm p-4 md:p-10 overflow-auto" onClick={onClose} role="dialog" aria-modal aria-label="Fix preview">
      <div className="settle mx-auto max-w-4xl card p-5 md:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <span className="eyebrow">Muse Image · fix preview</span>
            <h2 className="mt-1 text-2xl md:text-3xl font-medium leading-tight">{hazard.title}</h2>
            <p className="mt-1 text-muted">{hazard.fix.action}</p>
          </div>
          <button type="button" onClick={onClose} className="btn-ghost px-3.5 py-1.5 text-sm">Close</button>
        </div>
        {error && <p className="text-verified">Could not make the preview. {error}</p>}
        {!preview && !error && (
          <div className="aspect-video rounded-xl bg-surface-2 grid place-items-center text-muted relative overflow-hidden">
            <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-brand-2 pulse-dot" />Muse Image is drawing the fixed room…</span>
            <span className="absolute left-0 right-0 bottom-0 h-1 shimmer" />
          </div>
        )}
        {preview && <BeforeAfter beforeUrl={preview.before_url} afterUrl={preview.after_url} />}
        <p className="mt-3 text-sm text-muted">
          This picture is to help the family see the change. It does not prove the room is safe. Re-film after the fix for that.
        </p>
      </div>
    </div>
  )
}
