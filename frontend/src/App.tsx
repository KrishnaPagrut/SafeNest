import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { api } from './api'
import { Logo } from './components/ui'
import type { Health } from './types'

export function App() {
  const [health, setHealth] = useState<Health | null>(null)
  useEffect(() => {
    const tick = () => api.health().then(setHealth).catch(() => setHealth(null))
    tick()
    const id = window.setInterval(tick, 15000)
    return () => window.clearInterval(id)
  }, [])
  const link = ({ isActive }: { isActive: boolean }) =>
    ['px-3.5 py-1.5 rounded-full transition-colors', isActive ? 'bg-text text-ink' : 'text-muted hover:text-text hover:bg-surface-2'].join(' ')
  const live = health && health.has_key !== false && !health.cache_only
  return (
    <div className="h-dvh flex flex-col">
      <nav className="no-print sticky top-0 z-10 border-b border-line/80 bg-ink/80 backdrop-blur-md">
        <div className="mx-auto w-full max-w-[1760px] px-4 md:px-6 h-16 flex items-center gap-6">
          <NavLink to="/" className="flex items-center gap-2.5 shrink-0">
            <Logo className="h-8 w-8" />
            <span className="font-display text-[1.6rem] font-semibold tracking-tight leading-none">SafeNest</span>
          </NavLink>
          <div className="flex gap-1 text-base overflow-x-auto no-scrollbar">
            <NavLink to="/" end className={link}>Upload</NavLink>
            <NavLink to="/review/mock_before" className={link}>Review</NavLink>
            <NavLink to="/compare/mock_after/mock_before" className={link}>Compare</NavLink>
            <NavLink to="/report/mock_before" className={link}>Report</NavLink>
          </div>
          <span className="ml-auto hidden md:inline-flex items-center gap-2 text-sm text-muted">
            <span className={`h-2 w-2 rounded-full ${live ? 'bg-fixed' : health ? 'bg-amber' : 'bg-muted/50'}`} aria-hidden />
            {live ? 'Live on Meta Model API' : !health ? 'Sample mode' : health.cache_only ? 'Replaying from cache' : 'Backend up · no API key yet'}
          </span>
        </div>
      </nav>
      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1760px] px-4 md:px-6 py-6 md:py-8 h-full">
          <Outlet />
        </div>
      </main>
      <footer className="no-print border-t border-line/80 bg-surface/60 shrink-0">
        <div className="mx-auto w-full max-w-[1760px] px-4 md:px-6 py-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted">
          {health ? (
            <>
              <span className="tabular-nums">
                Spend <span className="text-text font-medium">${(health.spent_usd ?? 0).toFixed(2)}</span> of ${(health.budget_usd ?? 25).toFixed(0)} cap
                {health.cache_only ? ' · cache only' : ''}
              </span>
              <span className="hidden sm:inline">
                <span className="font-mono text-[0.8rem]">{health.model || 'muse-spark-1.3'}</span> ·{' '}
                <span className="font-mono text-[0.8rem]">sam-3.1</span> · <span className="font-mono text-[0.8rem]">muse-image-1.0</span>
              </span>
              {!health.has_key && <span className="text-[#8a5a0c]">No API key on the backend</span>}
            </>
          ) : (
            <span>Backend offline. The sample walkthrough still works.</span>
          )}
          <span className="ml-auto">Runs on your machine. Only model calls leave it.</span>
        </div>
      </footer>
    </div>
  )
}
