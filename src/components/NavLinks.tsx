import { Link, useLocation } from 'react-router-dom'

export function NavLinks() {
  const loc = useLocation()
  const path = loc.pathname
  return (
    <nav className="flex gap-1" aria-label="Main">
      <Link
        to="/dashboard"
        className={`rounded-md px-3 py-2 text-sm font-medium ${path === '/dashboard' ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
      >
        Dashboard
      </Link>
      <Link
        to="/my-leads"
        className={`rounded-md px-3 py-2 text-sm font-medium ${path === '/my-leads' ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
      >
        My Leads
      </Link>
      <Link
        to="/coverage"
        className={`rounded-md px-3 py-2 text-sm font-medium ${path === '/coverage' ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
      >
        Coverage
      </Link>
    </nav>
  )
}
