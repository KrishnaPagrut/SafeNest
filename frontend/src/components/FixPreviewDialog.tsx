import { useEffect, useState } from 'react'
import { api } from '../api'
import type { FixPreview, Hazard } from '../types'
import { BeforeAfter } from './BeforeAfter'

export function FixPreviewDialog({ hazard, onClose }: { hazard: Hazard; onClose: () => void }) {
  const [preview, setPreview] = useState<FixPreview | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    api
      .fixPreview(hazard.hazard_id)
      .then((p) => alive && setPreview(p))
      .catch((e) => {
        console.error(e)
        if (alive) setError('failed')
      })
    return () => {
      alive = false
    }
  }, [hazard.hazard_id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-20 overflow-auto bg-[#1f1a14]/55 p-4 backdrop-blur-sm md:p-10"
      onClick={onClose}
      role="dialog"
      aria-modal
      aria-label="Fix preview"
    >
      <div className="settle card mx-auto max-w-4xl p-5 md:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <span className="eyebrow">Muse Image · fix preview</span>
            <h2 className="mt-1 text-2xl leading-tight font-medium md:text-3xl">{hazard.title}</h2>
            <p className="text-muted mt-1">{hazard.fix.action}</p>
          </div>
          <button type="button" onClick={onClose} className="btn-ghost px-3.5 py-1.5 text-sm">
            Close
          </button>
        </div>
        {error && (
          <p className="bg-verified-soft text-verified rounded-lg px-4 py-3">
            The fix preview isn't available right now. Please try again.
          </p>
        )}
        {!preview && !error && (
          <div className="bg-surface-2 text-muted relative grid aspect-video place-items-center overflow-hidden rounded-xl">
            <span className="flex items-center gap-2">
              <span className="bg-brand-2 pulse-dot h-2 w-2 rounded-full" />
              Muse Image is drawing the fixed room…
            </span>
            <span className="shimmer absolute right-0 bottom-0 left-0 h-1" />
          </div>
        )}
        {preview && <BeforeAfter beforeUrl={preview.before_url} afterUrl={preview.after_url} />}
        <p className="text-muted mt-3 text-sm">
          This picture is to help the family see the change. It does not prove the room is safe. Re-film after the fix
          for that.
        </p>
      </div>
    </div>
  )
}
