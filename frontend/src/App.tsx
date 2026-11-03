import { NavLink, Outlet } from 'react-router-dom'

export function App() {
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
    </div>
  )
}
