import { NavLink, Outlet } from 'react-router-dom'
import { Logo } from './components/ui'

export function App() {
  const link = ({ isActive }: { isActive: boolean }) =>
    [
      'px-3 sm:px-3.5 py-1.5 rounded-full whitespace-nowrap transition-colors',
      isActive ? 'bg-text text-ink' : 'text-muted hover:text-text hover:bg-surface-2',
    ].join(' ')
  return (
    <div className="flex h-dvh flex-col">
      <nav className="no-print border-line/80 bg-ink/80 sticky top-0 z-10 border-b backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-[1760px] items-center gap-3 px-4 sm:gap-6 md:px-6">
          <NavLink to="/" className="flex shrink-0 items-center gap-2.5">
            <Logo className="h-8 w-8" />
            <span className="font-display text-[1.3rem] leading-none font-semibold tracking-tight sm:text-[1.6rem]">
              SafeNest
            </span>
          </NavLink>
          <div className="no-scrollbar flex gap-1 overflow-x-auto text-base">
            <NavLink to="/" end className={link}>
              Upload
            </NavLink>
            <NavLink to="/review/mock_before" className={link}>
              Review
            </NavLink>
            <NavLink to="/compare/mock_after/mock_before" className={link}>
              Compare
            </NavLink>
            <NavLink to="/report/mock_before" className={link}>
              Report
            </NavLink>
          </div>
        </div>
      </nav>
      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto h-full w-full max-w-[1760px] px-4 py-6 md:px-6 md:py-8">
          <Outlet />
        </div>
      </main>
      <footer className="no-print border-line/80 bg-surface/60 shrink-0 border-t">
        <div className="text-muted mx-auto flex w-full max-w-[1760px] flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2.5 text-sm md:px-6">
          <span className="flex items-center gap-2">
            <Logo className="h-4 w-4" /> SafeNest
          </span>
          <span className="hidden sm:inline">Built with Muse Spark, SAM 3.1 and Muse Image</span>
          <span className="ml-auto hidden md:inline">
            A home-safety aid, not a substitute for an in-person assessment.
          </span>
        </div>
      </footer>
    </div>
  )
}
