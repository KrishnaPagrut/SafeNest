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
    <div className="fixed inset-0 z-20 bg-ink/85 p-4 md:p-10 overflow-auto" onClick={onClose} role="dialog" aria-modal aria-label="Fix preview">
      <div className="mx-auto max-w-4xl rounded-lg bg-surface border border-line p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-medium leading-tight">{hazard.title}</h2>
            <p className="text-muted">{hazard.fix.action}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md border border-line px-3 py-1.5 hover:bg-surface-2">Close</button>
        </div>
        {error && <p className="text-verified">Could not make the preview. {error}</p>}
        {!preview && !error && (
          <div className="aspect-video rounded-lg border border-line grid place-items-center text-muted">
            Muse Image is drawing the fixed room…
          </div>
        )}
        {preview && <BeforeAfter beforeUrl={preview.before_url} afterUrl={preview.after_url} />}
        <p className="mt-3 text-base text-muted">
          This picture is to help the family see the change. It does not prove the room is safe. Re-film after the fix for that.
        </p>
      </div>
    </div>
  )
}
