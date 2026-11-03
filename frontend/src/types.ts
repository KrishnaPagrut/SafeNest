// Mirrors CONTRACT.md §3. Keep in sync; change in the same PR as the backend.
export type Lane = 'pending' | 'verified' | 'rejected' | 'needs_check'

export interface Frame { frame_idx: number; t_sec: number; w: number; h: number; url: string }

export interface Evidence {
  frame_idx: number
  t_sec: number
  box: [number, number, number, number]
  mask_path: string
  score: number | null
}

export interface Hazard {
  hazard_id: string
  phrase: string
  title: string
  category: string
  room: string
  severity: 1 | 2 | 3
  rationale: string
  fix: { action: string; est_cost_usd: [number, number] }
  absence: boolean
  t_sec: number
  frame_idx: number
  lane: Lane
  critic_reason: string | null
  evidence: Evidence[]
  fix_preview_url: string | null
}

export interface Scan {
  scan_id: string
  label: 'before' | 'after'
  baseline_scan_id: string | null
  status: 'processing' | 'complete' | 'error'
  title: string
  summary: string
  created_at: string
  video_url: string
  duration_sec: number
  frames: Frame[]
  hazards: Hazard[]
  timings_ms: Record<string, number>
}

export interface ScanSummary {
  scan_id: string
  label: 'before' | 'after'
  status: Scan['status']
  created_at: string
  title: string
  hazard_counts: { verified: number; rejected: number; needs_check: number }
}

export interface Comparison {
  before_id: string
  after_id: string
  items: {
    before_hazard_id: string | null
    after_hazard_id: string | null
    status: 'fixed' | 'still_present' | 'new'
    title: string
    note: string
  }[]
  score_before: number
  score_after: number
}

export interface FixPreview { hazard_id: string; before_url: string; after_url: string; instruction: string }

export interface TrackEntry { frame_index: number; t_sec: number; box: [number, number, number, number]; mask_path: string; score: number | null }
export interface Track { hazard_id: string; phrase: string; fps: number; frames: number; objects: { object_id: string; track: TrackEntry[] }[] }

export type Stage = 'frames' | 'spotter' | 'grounder' | 'critic'

export type ScanEvent =
  | { type: 'stage'; data: { stage: Stage; status: 'start' | 'done'; detail: string } }
  | { type: 'hazard_proposed'; data: Hazard }
  | { type: 'hazard_grounded'; data: Hazard }
  | { type: 'hazard_judged'; data: Hazard }
  | { type: 'complete'; data: Scan }
  | { type: 'error'; data: { message: string; stage: string } }

export interface Health { ok: boolean; cache_only: boolean; model: string; has_key?: boolean; spent_usd?: number; budget_usd?: number }
