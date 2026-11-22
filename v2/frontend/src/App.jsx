import { Link, NavLink, Outlet, ScrollRestoration, createBrowserRouter, useLocation } from 'react-router-dom'
import { useBackend } from './api.js'
import { Marker, usePageTitle } from './components.jsx'
import Home from './pages/Home.jsx'
import Report from './pages/Report.jsx'
import Method from './pages/Method.jsx'
import Evidence from './pages/Evidence.jsx'
import Try from './pages/Try.jsx'

function Layout() {
  const { pathname } = useLocation()
  const backend = useBackend()
  const onResults = pathname === '/' || pathname.startsWith('/report')
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="site-head">
        <div className="wrap">
          <Link to="/" className="brand" translate="no">
            <Marker /> Hivemind <small>v2</small>
          </Link>
          <nav className="nav" aria-label="Main">
            <Link to="/" aria-current={onResults ? 'page' : undefined}>Results</Link>
            <NavLink to="/method">How it works</NavLink>
            <NavLink to="/evidence">Evidence</NavLink>
            <NavLink to="/try">Try it</NavLink>
          </nav>
        </div>
      </header>
      <main id="main" tabIndex={-1} style={{ outline: 'none' }}>
        <Outlet />
      </main>
      <footer className="site-foot">
        <div className="wrap">
          <div className="stack" style={{ '--gap': '8px' }}>
            <p className="maker"><Marker size={20} /> Designed and built by Ronit&nbsp;Suchak</p>
            <p>© 2026 Ronit&nbsp;Suchak. Hivemind&nbsp;v2 is an updated version of the project first built by a team of four at EduX Hackathon UK&nbsp;2026.</p>
          </div>
          <div className="stack" style={{ '--gap': '8px' }}>
            <p><strong>Read this first.</strong> The students are simulated, not real children. The real-tool results are a small pilot.</p>
            <p className={`status ${backend === 'live' ? 'live' : ''}`}>
              <i aria-hidden="true" />
              {backend === 'live' ? 'Connected to the live backend' : backend === 'checking' ? 'Checking for a backend…' : 'Showing saved results from the backend'}
            </p>
          </div>
        </div>
      </footer>
      <ScrollRestoration />
    </>
  )
}

function NotFound() {
  usePageTitle('Page not found')
  return (
    <div className="wrap page-head stack">
      <p className="label">404</p>
      <h1>Page not found</h1>
      <p className="lede">There is nothing at this address. It may have moved, or the link may have a typo.</p>
      <p><Link to="/" className="btn btn-primary">Go to the results</Link></p>
    </div>
  )
}

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/report/:id', element: <Report /> },
      { path: '/method', element: <Method /> },
      { path: '/evidence', element: <Evidence /> },
      { path: '/try', element: <Try /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])
