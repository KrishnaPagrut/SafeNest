import { mock } from './mock'
import type { Comparison, FixPreview, Health, Scan, ScanEvent, ScanSummary, Track } from './types'

async function json<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init)
  if (!res.ok) throw new Error(`${init?.method ?? 'GET'} ${input} failed: ${res.status} ${await res.text()}`)
  return res.json() as Promise<T>
}

export const api = {
  health: () => json<Health>('/api/health'),

  async listScans(): Promise<ScanSummary[]> {
    let live: ScanSummary[] = []
    try { live = await json<ScanSummary[]>('/api/scans') } catch { /* backend offline */ }
    return [...live, ...mock.list()]
  },

  async getScan(id: string): Promise<Scan> {
    if (mock.has(id)) return mock.getScan(id)
    return json<Scan>(`/api/scans/${id}`)
  },

  async upload(video: File, label: 'before' | 'after', baselineScanId?: string, notes?: string) {
    const fd = new FormData()
    fd.append('video', video)
    fd.append('label', label)
    if (baselineScanId) fd.append('baseline_scan_id', baselineScanId)
    if (notes) fd.append('notes', notes)
    return json<{ scan_id: string; status: string }>('/api/scans', { method: 'POST', body: fd })
  },

  // Subscribes to the SSE stream (or the mock replay). Returns an unsubscribe function.
  events(id: string, onEvent: (e: ScanEvent) => void, onError?: (err: Error) => void): () => void {
    if (mock.has(id)) return mock.events(id, onEvent)
    const es = new EventSource(`/api/scans/${id}/events`)
    const types: ScanEvent['type'][] = ['stage', 'hazard_proposed', 'hazard_grounded', 'hazard_judged', 'complete', 'error']
    for (const type of types) {
      es.addEventListener(type, (ev) => {
        const data = JSON.parse((ev as MessageEvent).data)
        onEvent({ type, data } as ScanEvent)
        if (type === 'complete') es.close()
      })
    }
    es.onerror = () => { onError?.(new Error('Lost connection to the scan stream')); es.close() }
    return () => es.close()
  },

  async fixPreview(hazardId: string, instruction?: string): Promise<FixPreview> {
    if (hazardId.startsWith('hz_m') || hazardId.startsWith('hz_a')) return mock.fixPreview(hazardId)
    return json<FixPreview>(`/api/hazards/${hazardId}/fix_preview`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(instruction ? { instruction } : {}),
    })
  },

  async track(hazardId: string): Promise<Track> {
    if (hazardId.startsWith('hz_m') || hazardId.startsWith('hz_a')) return mock.track(hazardId)
    return json<Track>(`/api/hazards/${hazardId}/track`, { method: 'POST' })
  },

  async compare(afterId: string, beforeId: string): Promise<Comparison> {
    if (mock.has(afterId) && mock.has(beforeId)) return mock.compare(afterId, beforeId)
    return json<Comparison>(`/api/scans/${afterId}/compare/${beforeId}`, { method: 'POST' })
  },

  reportUrl: (id: string) => `/api/scans/${id}/report.pdf`,
}
