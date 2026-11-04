import { NavLink, Outlet } from 'react-router-dom'
import { Logo } from './components/ui'

export function App() {
  const link = ({ isActive }: { isActive: boolean }) =>
    ['px-3 sm:px-3.5 py-1.5 rounded-full whitespace-nowrap transition-colors', isActive ? 'bg-text text-ink' : 'text-muted hover:text-text hover:bg-surface-2'].join(' ')
  return (
    <div className="h-dvh flex flex-col">
      <nav className="no-print sticky top-0 z-10 border-b border-line/80 bg-ink/80 backdrop-blur-md">
        <div className="mx-auto w-full max-w-[1760px] px-4 md:px-6 h-16 flex items-center gap-3 sm:gap-6">
          <NavLink to="/" className="flex items-center gap-2.5 shrink-0">
            <Logo className="h-8 w-8" />
            <span className="font-display text-[1.3rem] sm:text-[1.6rem] font-semibold tracking-tight leading-none">SafeNest</span>
          </NavLink>
          <div className="flex gap-1 text-base overflow-x-auto no-scrollbar">
            <NavLink to="/" end className={link}>Upload</NavLink>
            <NavLink to="/review/mock_before" className={link}>Review</NavLink>
            <NavLink to="/compare/mock_after/mock_before" className={link}>Compare</NavLink>
            <NavLink to="/report/mock_before" className={link}>Report</NavLink>
          </div>
        </div>
      </nav>
      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1760px] px-4 md:px-6 py-6 md:py-8 h-full">
          <Outlet />
        </div>
      </main>
      <footer className="no-print border-t border-line/80 bg-surface/60 shrink-0">
        <div className="mx-auto w-full max-w-[1760px] px-4 md:px-6 py-2.5 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted">
          <span className="flex items-center gap-2"><Logo className="h-4 w-4" /> SafeNest</span>
          <span className="hidden sm:inline">Built with Muse Spark, SAM 3.1 and Muse Image</span>
          <span className="ml-auto hidden md:inline">A home-safety aid, not a substitute for an in-person assessment.</span>
        </div>
      </footer>
    </div>
  )
}
