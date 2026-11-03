import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { api } from './api'
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
    ['px-3 py-1.5 rounded-md', isActive ? 'bg-surface-2 text-text' : 'text-muted hover:text-text'].join(' ')
  return (
    <div className="min-h-dvh">
      <nav className="border-b border-line">
        <div className="mx-auto max-w-7xl px-4 md:px-6 h-16 flex items-center gap-6">
          <NavLink to="/" className="font-bold text-xl tracking-tight">SafeNest</NavLink>
          <div className="flex gap-1 text-base">
            <NavLink to="/" end className={link}>Upload</NavLink>
            <NavLink to="/review/mock_before" className={link}>Review</NavLink>
            <NavLink to="/compare/mock_after/mock_before" className={link}>Compare</NavLink>
            <NavLink to="/report/mock_before" className={link}>Report</NavLink>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-7xl px-4 md:px-6 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto max-w-7xl px-4 md:px-6 py-3 flex flex-wrap gap-x-6 gap-y-1 text-base text-muted">
          {health ? (
            <>
              <span>
                Spend: ${(health.spent_usd ?? 0).toFixed(2)} of ${(health.budget_usd ?? 25).toFixed(0)} cap
                {health.cache_only ? ' · serving from cache only' : ''}
              </span>
              <span>Models: {health.model}, sam-3.1, muse-image-1.0</span>
              {!health.has_key && <span>No API key on the backend</span>}
            </>
          ) : (
            <span>Backend offline. The sample walkthrough still works.</span>
          )}
          <span className="ml-auto">Runs on your machine. Nothing leaves it except model calls.</span>
        </div>
      </footer>
    </div>
  )
}
