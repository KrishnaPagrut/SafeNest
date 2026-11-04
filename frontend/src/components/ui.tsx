import type { ReactNode, SVGProps } from 'react'
import type { Lane } from '../types'

// Small shared pieces: the logo, a tiny icon set, severity and lane styling.

export function Logo({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="16" fill="var(--color-brand)" />
      <path d="M14 31.5 32 16l18 15.5" fill="none" stroke="#f5efe4" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 29v17a3 3 0 0 0 3 3h20a3 3 0 0 0 3-3V29" fill="none" stroke="#f5efe4" strokeWidth="5" strokeLinejoin="round" />
      <path d="m25.5 38.5 4.5 4.5 9-9" fill="none" stroke="#e9b44c" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

type IconName = 'film' | 'spark' | 'target' | 'scale' | 'image' | 'upload' | 'play' | 'check' | 'x' | 'eye' | 'arrow' | 'doc' | 'print' | 'replay' | 'track' | 'wand' | 'shield'

const PATHS: Record<IconName, ReactNode> = {
  film: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 5v14M17 5v14M3 9.5h4M17 9.5h4M3 14.5h4M17 14.5h4" /></>,
  spark: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />,
  target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.5" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></>,
  scale: <><path d="M12 4v16M7 20h10M5 8h14" /><path d="m5 8-2.5 6a3 3 0 0 0 5 0L5 8ZM19 8l-2.5 6a3 3 0 0 0 5 0L19 8Z" /></>,
  image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m21 16-5-5-9 9" /></>,
  upload: <><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></>,
  play: <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" /></>,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  doc: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></>,
  print: <><path d="M7 9V3h10v6" /><rect x="3" y="9" width="18" height="8" rx="2" /><path d="M7 14h10v7H7z" /></>,
  replay: <><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></>,
  track: <><path d="M4 18c3-8 6-8 8-4s5 4 8-4" /><circle cx="20" cy="10" r="1.6" /></>,
  wand: <><path d="m4 20 11-11M14 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2ZM19 11l.6 1.4L21 13l-1.4.6L19 15l-.6-1.4L17 13l1.4-.6L19 11Z" /></>,
  shield: <><path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></>,
}

export function Icon({ name, className = 'h-5 w-5', ...rest }: { name: IconName; className?: string } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden {...rest}>
      {PATHS[name]}
    </svg>
  )
}

export const SEVERITY = {
  3: { label: 'Fix today', cls: 'bg-verified-soft text-verified' },
  2: { label: 'Fix this week', cls: 'bg-amber-soft text-[#8a5a0c]' },
  1: { label: 'Worth fixing', cls: 'bg-surface-2 text-muted' },
} as const

export function SeverityChip({ severity }: { severity: 1 | 2 | 3 }) {
  const s = SEVERITY[severity]
  return <span className={`chip ${s.cls}`}>{s.label}</span>
}

export const LANE_STYLE: Record<Exclude<Lane, 'pending'>, { dot: string; soft: string; text: string; bar: string }> = {
  verified: { dot: 'bg-verified', soft: 'bg-verified-soft', text: 'text-verified', bar: 'before:bg-verified' },
  rejected: { dot: 'bg-muted', soft: 'bg-surface-2', text: 'text-muted', bar: 'before:bg-muted/60' },
  needs_check: { dot: 'bg-check', soft: 'bg-check-soft', text: 'text-check', bar: 'before:bg-check' },
}

export function money([lo, hi]: [number, number]) {
  if (lo === 0 && hi === 0) return 'Free'
  if (lo === hi) return `$${lo}`
  return `$${lo}–${hi}`
}
