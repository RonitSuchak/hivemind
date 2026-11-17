import { useEffect, useRef } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { isFallback, retryConnection, whenReady } from '../api.js'
import { useStatus } from '../hooks.js'
import Icon from './Icon.jsx'
import Stage from '../at/Stage.jsx'
import { pulseTransition, stopScroll, useVelocityLean } from '../at/state.js'
import { toggleGround } from '../at/ground.js'
import Mark from './Logo.jsx'
import { TranslateBar, useSiteTranslation } from './Translate.jsx'
import { useNoTranslate, useT } from '../i18n/index.js'

export default function Layout() {
  const { pathname } = useLocation()
  const section = pathname.split('/')[1] || '' // page-enter replays per section, not per sub-page
  const status = useStatus()
  const translation = useSiteTranslation()
  const t = useT()
  const noTr = useNoTranslate() // dictionary words (ru, hi) are ours: the browser translator must skip them
  const main = useRef(null)
  const first = useRef(true)
  const nav = useRef(null), mark = useRef(null)
  useVelocityLean(nav)                                  // nav leans and stretches with scroll speed
  useVelocityLean(mark, { lift: -5, skew: -7, stretch: 0.08 }) // the wordmark counters it

  useEffect(() => { whenReady() }, [])
  useEffect(() => {
    if (first.current) { first.current = false; return }
    stopScroll()        // drop any glide in progress, or it would pull the new page back down
    window.scrollTo(0, 0)
    pulseTransition()   // the liquid surges once on a page change
    main.current?.focus({ preventScroll: true })
  }, [pathname])

  const advisor = pathname.startsWith('/check') || pathname.startsWith('/results')
  const lab = pathname.startsWith('/lab')
  const tools = pathname.startsWith('/tools')
  const about = pathname.startsWith('/about')
  const cur = (on) => (on ? 'page' : undefined)

  return (
    <>
      <Stage />
      <a className="skip-link" href="#main" {...noTr}>{t('skip')}</a>
      <header className="site-header glass-bar" {...noTr}>
        <div className="wrap site-header-row">
          <Link to="/" className="wordmark" data-no-translate ref={mark}><Mark /><span>Hivemind</span></Link>
          <nav aria-label={t('nav.main')} className="site-nav" ref={nav}>
            <Link to="/check" aria-current={cur(advisor)}>{t('nav.advisor')}</Link>
            <Link to="/tools" aria-current={cur(tools)}>{t('nav.tools')}</Link>
            <Link to="/lab" aria-current={cur(lab)}>{t('nav.lab')}</Link>
            <Link to="/about" aria-current={cur(about)}>{t('nav.about')}</Link>
            <button type="button" className="ground-toggle" onClick={toggleGround} aria-label="Switch between the white and midnight ground" title="White / midnight"><span aria-hidden="true" /></button>
          </nav>
        </div>
      </header>
      {status === 'demo' && isFallback() && (
        <div className="wrap notice-wrap" {...noTr}>
          <div className="notice notice-off glass" role="status">
            <Icon name="info" size={16} />
            <span>{t('notice.fallback')}</span>
            <button className="btn btn-small" onClick={retryConnection}>{t('notice.retry')}</button>
          </div>
        </div>
      )}
      <main id="main" tabIndex={-1} ref={main} className="wrap main">
        <div className={`page ${section === '' ? 'page-still' : ''}`} key={section}>
          <Outlet />
        </div>
      </main>
      <footer className="site-footer" {...noTr}>
        <div className="wrap">
          <div className="footer-row">
            <div className="footer-mark">
              <Link to="/" className="wordmark" data-no-translate><Mark /><span>Hivemind</span></Link>
              <p>{t('footer.tagline')}</p>
            </div>
            <nav aria-label={t('nav.footer')} className="footer-nav">
              <Link to="/check">{t('nav.advisor')}</Link>
              <Link to="/tools">{t('nav.tools')}</Link>
              <Link to="/lab">{t('nav.lab')}</Link>
              <Link to="/about">{t('nav.about')}</Link>
              <Link to="/about#suggest">{t('nav.suggest')}</Link>
            </nav>
          </div>
          <p className="footer-note">{t('footer.note')}</p>
        </div>
      </footer>
      {/* Soft blur along the top and bottom edge while the page is scrolling (scroll.js sets data-scrolling). */}
      <div className="edge-blur edge-blur-top" aria-hidden="true" />
      <div className="edge-blur edge-blur-bottom" aria-hidden="true" />
      <TranslateBar status={translation} />
    </>
  )
}
