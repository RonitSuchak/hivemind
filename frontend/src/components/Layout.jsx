import { useEffect, useRef } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { retryConnection, whenReady } from '../api.js'
import { useStatus } from '../hooks.js'
import Icon from './Icon.jsx'
import Ambient from './Ambient.jsx'
import Mark from './Logo.jsx'
import { TranslateBar, useSiteTranslation } from './Translate.jsx'

export default function Layout() {
  const { pathname } = useLocation()
  const section = pathname.split('/')[1] || '' // page-enter replays per section, not per sub-page
  const status = useStatus()
  const translation = useSiteTranslation()
  const main = useRef(null)
  const first = useRef(true)

  useEffect(() => { whenReady() }, [])
  useEffect(() => {
    if (first.current) { first.current = false; return }
    window.scrollTo(0, 0)
    main.current?.focus({ preventScroll: true })
  }, [pathname])

  const advisor = pathname.startsWith('/check') || pathname.startsWith('/results')
  const lab = pathname.startsWith('/lab')
  const tools = pathname.startsWith('/tools')
  const about = pathname.startsWith('/about')
  const cur = (on) => (on ? 'page' : undefined)

  return (
    <>
      <Ambient parallax={section === ''} />
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header glass-bar">
        <div className="wrap site-header-row">
          <Link to="/" className="wordmark" data-no-translate><Mark /><span>Hivemind</span></Link>
          <nav aria-label="Main" className="site-nav">
            <Link to="/check" aria-current={cur(advisor)}>AI Advisor</Link>
            <Link to="/tools" aria-current={cur(tools)}>EdTech tools</Link>
            <Link to="/lab" aria-current={cur(lab)}>Simulation Lab</Link>
            <Link to="/about" aria-current={cur(about)}>About</Link>
          </nav>
        </div>
      </header>
      {status === 'demo' && (
        <div className="wrap notice-wrap">
          <div className="notice glass" role="status">
            <Icon name="info" size={16} /> <span>Saved results from the lab, not live. Some tutors are scripted previews until their full AI run is done.</span>
          </div>
        </div>
      )}
      {status === 'offline' && (
        <div className="wrap notice-wrap">
          <div className="notice notice-off glass" role="status">
            <Icon name="info" size={16} />
            <span>The lab is not connected, so there are no numbers or charts yet.</span>
            <button className="btn btn-small" onClick={retryConnection}>Retry</button>
          </div>
        </div>
      )}
      <main id="main" tabIndex={-1} ref={main} className="wrap main">
        <div className={`page ${section === '' ? 'page-still' : ''}`} key={section}>
          <Outlet />
        </div>
      </main>
      <footer className="site-footer">
        <div className="wrap">
          <div className="footer-row">
            <div className="footer-mark">
              <Link to="/" className="wordmark" data-no-translate><Mark /><span>Hivemind</span></Link>
              <p>Find the EdTech tool that works for students like you.</p>
            </div>
            <nav aria-label="Footer" className="footer-nav">
              <Link to="/check">AI Advisor</Link>
              <Link to="/tools">EdTech tools</Link>
              <Link to="/lab">Simulation Lab</Link>
              <Link to="/about">About</Link>
            </nav>
          </div>
          <p className="footer-note">Students are simulated, not real children. Hivemind stores no names or answers.</p>
        </div>
      </footer>
      <TranslateBar status={translation} />
    </>
  )
}
