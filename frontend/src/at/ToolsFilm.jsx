import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from '../components/Icon.jsx'
import ToolPreview from '../components/ToolPreview.jsx'
import { useTilt } from '../tilt.js'
import { damp, glideTo, state, stopScroll, subscribe } from './state.js'
import './tools-film.css'

// The groups of EdTech tools as a deck of frosted-glass windows. The page scroll is the playhead (p):
// scroll down and the front window is dealt toward you, the next one slides forward. Every frame is a pure
// function of p, so scrolling up puts the windows back exactly. Click the front window to open that group
// as its own full-screen page (GroupLayer below).
//
// `groups`: [{ id, kind, name, how, tools, rep, rule }]   `renderCard(tool)`: the page's own ToolCard.

const SCREEN = 0.7   // screens of scroll per window
const PULL = 240     // px of extra "scroll up" needed to leave a group page
const FOCUSABLE = 'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])'

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) }
const plural = (n) => `${n} ${n === 1 ? 'tool' : 'tools'}`

// Which windows the lab tests: the tool types are, the study helpers are not. ("Other tools" gets no tag.)
const labTag = (g) => (g.kind === 'Study helper' ? 'Not lab-tested: study helper' : g.id === 'other' ? '' : 'Tested in the lab')

export default function ToolsFilm({ groups, renderCard }) {
  const N = groups.length
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  const film = useRef(null)
  const wins = useRef([])
  const navs = useRef([])
  const hint = useRef(null)
  const seekRef = useRef(null)
  const [open, setOpen] = useState(null)   // { index, ox, oy }: which group page is open, and where it grows from
  const [closing, setClosing] = useState(false)
  const headId = useId()

  const openGroup = (i, from) => {
    if (open || !groups[i]) return
    const r = (from || wins.current[i]).getBoundingClientRect()
    setClosing(false)
    setOpen({ index: i, ox: r.left + r.width / 2, oy: r.top + r.height / 2 })
  }
  const requestClose = () => { if (open) setClosing(true) }
  const finish = () => {
    const i = open?.index
    setOpen(null); setClosing(false)
    requestAnimationFrame(() => wins.current[i]?.focus({ preventScroll: true })) // back to the same window
  }

  // Always points at the newest functions, so the window.__toolsFilm helpers never go stale.
  const api = useRef({})
  api.current = { openGroup, requestClose }
  useEffect(() => {
    window.__toolsFilm = {
      seek(v) { seekRef.current?.(v) },
      open(i) { seekRef.current?.(N > 1 ? i / (N - 1) : 0); requestAnimationFrame(() => api.current.openGroup(i)) },
      close() { api.current.requestClose() },
    }
    return () => { delete window.__toolsFilm }
  }, [N])

  useEffect(() => {
    if (reduced || N === 0) return
    const el = film.current
    let H = window.innerHeight, W = window.innerWidth, travel = 1
    const hidden = []
    const dirs = Array.from({ length: N }, (_, i) => (i % 2 ? 1 : -1)) // which side each window leaves by: -1 left, 1 right
    const tilt = { x: 0, y: 0 }

    const measure = () => {
      H = window.innerHeight; W = window.innerWidth
      travel = Math.max(1, el.getBoundingClientRect().height - H)
    }
    const playhead = () => clamp(-el.getBoundingClientRect().top / travel, 0, 1) * (N - 1)

    const render = (p, s) => {
      const wide = W >= 900
      const px = s.pointerOn ? s.pointerX : 0, py = s.pointerOn ? s.pointerY : 0
      tilt.x = damp(tilt.x, px, 8, s.dt); tilt.y = damp(tilt.y, py, 8, s.dt) // the front window follows the pointer, softly
      for (let i = 0; i < N; i++) {
        const c = wins.current[i]; if (!c) continue
        const d = i - p
        const front = Math.abs(d) < 0.5
        if (c._front !== front) {
          c._front = front; c.inert = !front; c.tabIndex = front ? 0 : -1
          c.classList.toggle('is-front', front)
        }
        if (d > 3.4 || d < -0.8) { if (!hidden[i]) { c.style.visibility = 'hidden'; hidden[i] = true } continue }
        if (hidden[i] !== false) { c.style.visibility = 'visible'; hidden[i] = false }

        let x, y, z, rx = 0, ry, rz, op
        if (d >= 0) {
          // waiting: a stack that fans up and to the right, further back the later it comes
          const k = Math.min(d, 4)
          x = k * (wide ? 70 : 24); y = -k * (wide ? 42 : 34); z = -k * 240; ry = -k * 2.5; rz = 0
          op = (1 - d * 0.24) * (1 - smooth(2.8, 3.4, d))
        } else {
          // dealt: slides off to one side and toward the viewer, then fades out.
          // The side is dirs[i]: left, right, left ... by default, or the way you last swiped sideways.
          const t = clamp(-d, 0, 1), e = t * t * (3 - 2 * t), side = dirs[i]
          x = side * e * Math.max(260, W * 0.5); y = e * 110; z = e * 320; rx = e * 8; ry = side * e * 10; rz = side * e * 7
          op = 1 - smooth(0.3, 0.8, t)
        }
        const near = clamp(1 - Math.abs(d), 0, 1)
        rx += tilt.y * 5 * near; ry += tilt.x * 7 * near; rz += -s.vel * 2 * near
        c.style.transform = `translate(-50%, -50%) translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, ${z.toFixed(2)}px) rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg) rotateZ(${rz.toFixed(3)}deg)`
        c.style.opacity = clamp(op, 0, 1).toFixed(3)
      }
      const cur = clamp(Math.round(p), 0, N - 1)
      navs.current.forEach((b, gi) => {
        if (!b) return
        b.classList.toggle('is-current', gi === cur)
        if (gi === cur) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current')
      })
      if (hint.current) hint.current.style.opacity = clamp(1 - p * 3, 0, 1).toFixed(3)
    }

    measure()
    wins.current.forEach((c) => { if (c) c.style.height = '' })
    window.addEventListener('resize', measure)
    // A sideways swipe (trackpad, or shift + wheel) moves the film on, and the front window leaves the way you swiped.
    const onWheel = (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) * 1.2 || Math.abs(e.deltaX) < 2) return
      const r = el.getBoundingClientRect()
      if (r.top > 1 || r.bottom < H - 1) return // only while the film is pinned
      e.preventDefault()
      dirs[clamp(Math.floor(playhead() + 0.02), 0, N - 1)] = Math.sign(e.deltaX)
      window.scrollBy({ top: Math.abs(e.deltaX) * 1.4, behavior: 'instant' })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    const html = document.documentElement, oldOver = html.style.overscrollBehaviorX
    html.style.overscrollBehaviorX = 'none' // a sideways swipe must not trigger the browser's back gesture here
    const unsub = subscribe((s) => {
      const r = el.getBoundingClientRect()
      if (r.bottom < -50 || r.top > H + 50) return // off screen: nothing to draw
      render(playhead(), s)
    })
    render(playhead(), state)
    // For checks: seek(0..1) jumps the scene to that point
    seekRef.current = (v) => {
      measure(); stopScroll()
      const f = clamp(v, 0, 1)
      window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + f * travel)
      render(f * (N - 1), state)
    }
    return () => { unsub(); window.removeEventListener('resize', measure); el.removeEventListener('wheel', onWheel); html.style.overscrollBehaviorX = oldOver; seekRef.current = null }
  }, [reduced, N]) // eslint-disable-line react-hooks/exhaustive-deps

  const jump = (i) => {
    const r = film.current.getBoundingClientRect()
    glideTo(r.top + window.scrollY + (N > 1 ? i / (N - 1) : 0) * (r.height - window.innerHeight))
  }
  const onKey = (i) => (e) => {
    if (e.target !== e.currentTarget) return
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openGroup(i, e.currentTarget) }
  }

  if (N === 0) return null
  return (
    <section className={`tfilm${reduced ? ' tfilm-static' : ''}`} ref={film} data-noscrub aria-labelledby={headId}
      style={reduced ? undefined : { height: `${(N - 1) * SCREEN * 100 + 100}svh` }}>
      <h2 id={headId} className="sr-only">Groups of tools</h2>
      <div className="tfilm-view">
        <div className="tfilm-deck">
          {groups.map((g, i) => (
            <div key={g.id} className="tw" role="button" tabIndex={reduced ? 0 : -1} ref={(el) => { wins.current[i] = el }}
              aria-haspopup="dialog" aria-label={`${g.name}. ${plural(g.tools.length)}. ${labTag(g) ? `${labTag(g)}. ` : ''}Open this group.`}
              onClick={(e) => openGroup(i, e.currentTarget)} onKeyDown={onKey(i)}>
              <span className="tw-bar" aria-hidden="true"><i /><i /><i /><span className="tw-bar-t">{g.kind}</span></span>
              <span className="tw-body">
                <span className="tw-text">
                  <span className="tw-count">{plural(g.tools.length)}</span>
                  <span className="tw-name">{g.name}</span>
                  <span className="tw-how">{g.how}.</span>
                  {labTag(g) && <span className="tw-lab" data-tested={g.kind !== 'Study helper' || undefined}>{labTag(g)}</span>}
                  <span className="tw-go" aria-hidden="true">Open this group <Icon name="arrow" size={15} /></span>
                </span>
                {g.rep && (
                  <span className="tw-prev">
                    <ToolPreview tool={g.rep} />
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>

        {!reduced && (
          <>
            <nav className="tfilm-nav" aria-label="Jump to a group">
              {groups.map((g, i) => (
                <button key={g.id} type="button" ref={(el) => { navs.current[i] = el }} onClick={() => jump(i)}>
                  <span aria-hidden="true">-&gt;</span> {g.name} <b>{g.tools.length}</b>
                </button>
              ))}
            </nav>
            <span className="tfilm-hint" ref={hint} aria-hidden="true">Scroll, then click the front window</span>
          </>
        )}
      </div>

      {open && createPortal(
        <GroupLayer key={open.index} group={groups[open.index]} origin={open} reduced={reduced} closing={closing}
          onClose={requestClose} onDone={finish} renderCard={renderCard} />,
        document.body,
      )}
    </section>
  )
}

// One group as its own page. It grows out of the window, scrolls on its own, and closes with Back, Escape,
// or by pulling past the top (wheel up or touch pull down), like the Active Theory work pages.
function GroupLayer({ group, origin, reduced, closing, onClose, onDone, renderCard }) {
  const scroller = useRef(null)
  const bar = useRef(null)
  const [shown, setShown] = useState(reduced) // adds .is-in, which runs the grow transition
  const hid = useId()
  const live = useRef({ closing, onClose })
  live.current = { closing, onClose }
  useTilt(scroller)

  useEffect(() => {
    const sc = scroller.current
    const body = document.body
    const prevOverflow = body.style.overflow, prevPad = body.style.paddingRight
    const gap = window.innerWidth - document.documentElement.clientWidth
    body.style.overflow = 'hidden' // the smooth-scroll engine sees this and leaves the wheel alone
    if (gap > 0) body.style.paddingRight = `${gap}px`
    sc.focus({ preventScroll: true })
    let r2 = 0
    const r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(() => setShown(true)) })

    // Pull past the top to go back. The fill grows with the pull; it resets if you stop or scroll down.
    let pull = 0, idle = 0, lastWheel = 0, startedAtTop = false, touchY = null
    const setPull = (v) => {
      pull = clamp(v, 0, PULL)
      bar.current?.style.setProperty('--pull', (pull / PULL).toFixed(3))
      if (bar.current) bar.current.dataset.on = pull > 0 ? '1' : ''
      if (pull >= PULL && !live.current.closing) { setPull(0); live.current.onClose() }
    }
    const onWheel = (e) => {
      if (e.ctrlKey || live.current.closing) return
      const now = performance.now()
      // Only a gesture that STARTED at the top counts, so the tail of a fling up the page cannot close it.
      if (now - lastWheel > 160) startedAtTop = sc.scrollTop <= 0
      lastWheel = now
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY
      if (dy < 0 && startedAtTop && sc.scrollTop <= 0) {
        setPull(pull - dy)
        clearTimeout(idle); idle = setTimeout(() => setPull(0), 700)
      } else if (dy > 0) setPull(0)
    }
    const onScroll = () => { if (sc.scrollTop > 0 && pull) setPull(0) }
    const onTouchStart = (e) => { touchY = sc.scrollTop <= 0 ? e.touches[0].clientY : null }
    const onTouchMove = (e) => {
      if (touchY == null || live.current.closing) return
      if (sc.scrollTop > 0) { touchY = null; setPull(0); return }
      setPull((e.touches[0].clientY - touchY) * 0.8)
    }
    const onTouchEnd = () => { touchY = null; setPull(0) }
    sc.addEventListener('wheel', onWheel, { passive: true })
    sc.addEventListener('scroll', onScroll, { passive: true })
    sc.addEventListener('touchstart', onTouchStart, { passive: true })
    sc.addEventListener('touchmove', onTouchMove, { passive: true })
    sc.addEventListener('touchend', onTouchEnd)
    sc.addEventListener('touchcancel', onTouchEnd)

    // Escape and the Tab trap. While a tool's details panel is open on top, it handles these keys itself.
    const onKey = (e) => {
      if (document.querySelector('.tpn-root')) return
      if (e.key === 'Escape') { e.preventDefault(); live.current.onClose(); return }
      if (e.key !== 'Tab') return
      const root = sc.parentElement
      const els = [...root.querySelectorAll(FOCUSABLE)]
      if (!els.length) { e.preventDefault(); return }
      const first = els[0], last = els[els.length - 1], now = document.activeElement
      const inside = root.contains(now)
      if (e.shiftKey && (!inside || now === first || now === sc)) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && (!inside || now === last)) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)

    return () => {
      cancelAnimationFrame(r1); cancelAnimationFrame(r2); clearTimeout(idle)
      document.removeEventListener('keydown', onKey)
      body.style.overflow = prevOverflow
      body.style.paddingRight = prevPad
    }
  }, [])

  // Closing: shrink back toward the window, then tell the scene it can remove this page.
  useEffect(() => {
    if (!closing) return
    setShown(false)
    if (reduced) { onDone(); return }
    const t = setTimeout(onDone, 560)
    return () => clearTimeout(t)
  }, [closing]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`tfl${shown ? ' is-in' : ''}`} role="dialog" aria-modal="true" aria-labelledby={hid} data-noscrub
      style={{ '--ox': `${origin.ox}px`, '--oy': `${origin.oy}px` }}>
      <div className="tfl-pull" ref={bar} aria-hidden="true"><span>Scroll up to go back</span><i /></div>
      <div className="tfl-scroll" ref={scroller} tabIndex={-1}>
        <div className="tfl-bar">
          <button type="button" className="btn btn-small tfl-back" onClick={onClose}><Icon name="back" size={16} /> Back</button>
          <span className="tfl-esc" aria-hidden="true">Esc</span>
        </div>
        <div className="tfl-inner">
          <header className="tfl-head">
            <p className="tfl-kind">{group.kind}</p>
            <h2 id={hid} className="tfl-title">{group.name}</h2>
            <p className="tfl-count">{plural(group.tools.length)}</p>
            <p className="tfl-how">{group.how}.</p>
            {group.rule && <p className="tfl-rule">{group.rule}</p>}
          </header>
          <ul className="tg-grid">
            {group.tools.map((t) => <li key={t.id} className="tg-item">{renderCard(t)}</li>)}
          </ul>
        </div>
      </div>
    </div>
  )
}
