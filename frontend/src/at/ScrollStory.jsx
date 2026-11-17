import { useEffect, useRef } from 'react'
import { Plain } from '../components/Reveal.jsx'
import { state, subscribe } from './state.js'

// Wrap a page in <ScrollStory> and scrolling becomes its timeline, without rewriting the page:
//   1. Every chunk of content (heading, paragraph, list item, card) gets a progress value --t from 0 to 1
//      that follows its position on screen. CSS turns --t into the animation (at.css, [data-scrub=...]),
//      so each kind of chunk arrives its own way and scrolling back up plays it backwards.
//   2. A crystal in the corner turns with the scroll, shatters as you cross each heading and re-forms
//      into a new cut for the next section.
// The page's own jump-in reveals are switched off inside (Plain context) so the two never fight.
// Under reduced motion nothing here runs and the page is plain.

const SELECTOR = 'h1,h2,h3,p,li,dl > div,dt,dd,.glass,figure,table,details,.actions'
const SKIP = 'nav, .film, [data-noscrub], [role="dialog"], [aria-hidden="true"], .trbar'
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x) }
const mix = (a, b, t) => a + (b - a) * t

function variantOf(el, i) {
  const tag = el.tagName
  if (tag === 'H1' || tag === 'H2' || tag === 'H3') return 'title'
  if (el.matches('.glass, .tg-item, .who-card, dl > div, figure, table, details')) return i % 2 ? 'unfold-side' : 'unfold'
  if (tag === 'LI') return 'slide'
  if (tag === 'P') return 'ink'
  return 'rise'
}
// Position on the page that ignores our own transforms (getBoundingClientRect would include them).
function pageTop(el) { let y = 0; for (let n = el; n; n = n.offsetParent) y += n.offsetTop; return y }

// ---- the crystal: a six-sided cut gem (two rings + two points), its proportions seeded per chapter ----
const cut = (i) => ({
  ra: 0.6 + 0.4 * hash(i * 13 + 1), rb: 0.45 + 0.5 * hash(i * 13 + 2),
  ya: -0.12 - 0.36 * hash(i * 13 + 3), yb: 0.12 + 0.36 * hash(i * 13 + 4),
  ht: 0.85 + 0.5 * hash(i * 13 + 5), hb: 0.85 + 0.5 * hash(i * 13 + 6), tw: hash(i * 13 + 7) * 0.52,
})
function drawGem(ctx, S, chapter, frac, s) {
  const a = cut(chapter), b = cut(chapter + 1), k = frac * frac * (3 - 2 * frac)
  const g = {}; for (const key in a) g[key] = mix(a[key], b[key], k)
  const burst = Math.pow(Math.abs(Math.cos(Math.PI * frac)), 10) * 0.42 // apart at each heading, whole in between
  const ry = s.scrollPosition * 0.0032 + s.time * 0.1, rx = 0.42 + (s.pointerOn ? s.pointerY * 0.18 : 0)
  const A = [], B = []
  for (let m = 0; m < 6; m++) {
    const t1 = (m / 6) * Math.PI * 2, t2 = t1 + g.tw
    A.push([Math.cos(t1) * g.ra, g.ya, Math.sin(t1) * g.ra]); B.push([Math.cos(t2) * g.rb, g.yb, Math.sin(t2) * g.rb])
  }
  const top = [0, -g.ht, 0], bot = [0, g.hb, 0], faces = []
  for (let m = 0; m < 6; m++) {
    const n = (m + 1) % 6
    faces.push([top, A[m], A[n]], [A[m], A[n], B[n], B[m]], [bot, B[n], B[m]])
  }
  const cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx)
  const light = s.ground === 'white', ink = light ? '15 23 47' : '255 255 255'
  const out = faces.map((f, fi) => {
    const c = [0, 0, 0]; f.forEach((p) => { c[0] += p[0] / f.length; c[1] += p[1] / f.length; c[2] += p[2] / f.length })
    const cl = Math.hypot(c[0], c[1], c[2]) || 1
    const pts = f.map((p) => {
      const x = p[0] + (c[0] / cl) * burst, y = p[1] + (c[1] / cl) * burst, z = p[2] + (c[2] / cl) * burst
      const x1 = x * cy + z * sy, z1 = -x * sy + z * cy
      return [x1, y * cx - z1 * sx, y * sx + z1 * cx]
    })
    const u = [pts[1][0] - pts[0][0], pts[1][1] - pts[0][1], pts[1][2] - pts[0][2]], v = [pts[2][0] - pts[0][0], pts[2][1] - pts[0][1], pts[2][2] - pts[0][2]]
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]], nl = Math.hypot(...n) || 1
    const shade = Math.abs((n[0] * -0.4 + n[1] * -0.7 + n[2] * 0.6) / nl)
    return { pts, z: pts.reduce((q, p) => q + p[2], 0) / pts.length, shade, pop: fi === (chapter * 5 + 4) % 18 || fi === (chapter * 7 + 11) % 18 }
  }).sort((p, q) => p.z - q.z)
  ctx.clearRect(0, 0, S, S); ctx.lineJoin = 'round'
  const sc = S * 0.27
  for (const f of out) {
    ctx.beginPath()
    f.pts.forEach((p, i) => { const px = S / 2 + p[0] * sc, py = S / 2 + p[1] * sc; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py) })
    ctx.closePath()
    ctx.fillStyle = f.pop ? `rgb(244 81 30 / ${(0.3 + 0.5 * f.shade).toFixed(3)})` : `rgb(${ink} / ${(0.02 + 0.15 * f.shade).toFixed(3)})`
    ctx.fill()
    ctx.strokeStyle = `rgb(${ink} / ${(0.28 + 0.4 * f.shade).toFixed(3)})`; ctx.lineWidth = 1; ctx.stroke()
  }
}

export default function ScrollStory({ children, gem = true }) {
  const root = useRef(null), canvas = useRef(null), count = useRef(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const el = root.current
    let items = [], heads = [], dirty = true, tick = 0, timer = 0, lastLabel = ''

    const collect = () => {
      const picked = new Set(), next = []
      el.querySelectorAll(SELECTOR).forEach((node) => {
        if (node.closest(SKIP)) return
        for (let a = node.parentElement; a && a !== el; a = a.parentElement) if (picked.has(a)) return
        picked.add(node)
        const old = items.find((it) => it.node === node)
        if (!node.dataset.scrub) node.dataset.scrub = variantOf(node, next.length)
        next.push(old || { node, t: -1, top: 0, col: 0 })
      })
      items.forEach((it) => { if (!picked.has(it.node)) clear(it.node) })
      items = next
      heads = [...el.querySelectorAll('h1, h2')].filter((h) => !h.closest(SKIP)).map((node) => ({ node, top: 0 }))
      measure()
    }
    const measure = () => {
      const W = window.innerWidth
      for (const it of items) { it.top = pageTop(it.node); it.col = clamp(it.node.getBoundingClientRect().left / W, 0, 1) }
      for (const h of heads) h.top = pageTop(h.node)
    }
    const clear = (node) => { delete node.dataset.scrub; node.removeAttribute('data-scrub-done'); node.style.removeProperty('--t') }

    const frame = (s) => {
      if (dirty) { dirty = false; collect() } else if (++tick % 45 === 0) measure() // images and fonts can move things
      const vh = window.innerHeight, y0 = s.scrollPosition
      const atEnd = y0 >= document.documentElement.scrollHeight - vh - 2
      for (const it of items) {
        let t
        if (it.top < vh * 0.85 || (atEnd && it.top - y0 < vh)) t = 1 // first screen, and whatever can never scroll further up
        else t = clamp((vh * 0.98 - (it.top - y0 + it.col * 110)) / (vh * 0.46), 0, 1) // columns arrive left to right
        t = Math.round(t * 50) / 50
        if (t === it.t) continue
        it.t = t
        it.node.style.setProperty('--t', t)
        it.node.toggleAttribute('data-scrub-done', t === 1) // done = no transform at all, so tooltips and sticky parts inside behave
      }
      if (!gem || !canvas.current || !heads.length) return
      let c = 0
      for (let i = 0; i < heads.length; i++) if (heads[i].top - y0 < vh * 0.5) c = i
      const a = heads[c].top, b = heads[c + 1] ? heads[c + 1].top : document.documentElement.scrollHeight
      const frac = clamp((y0 + vh * 0.5 - a) / Math.max(1, b - a), 0, 1)
      const cv = canvas.current, S = cv.clientWidth, pr = Math.min(window.devicePixelRatio || 1, 2)
      if (cv.width !== Math.round(S * pr)) { cv.width = cv.height = Math.round(S * pr) }
      const ctx = cv.getContext('2d'); ctx.setTransform(pr, 0, 0, pr, 0, 0)
      drawGem(ctx, S, c, frac, s)
      const label = `${String(c + 1).padStart(2, '0')} / ${String(heads.length).padStart(2, '0')}`
      if (label !== lastLabel) { lastLabel = label; count.current.textContent = label }
    }

    collect(); frame(state)
    const unsub = subscribe(frame)
    const mo = new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(() => { dirty = true }, 120) }) // filters, language, data arriving
    mo.observe(el, { childList: true, subtree: true })
    const onResize = () => { dirty = true }
    window.addEventListener('resize', onResize)
    return () => { unsub(); mo.disconnect(); clearTimeout(timer); window.removeEventListener('resize', onResize); items.forEach((it) => clear(it.node)) }
  }, [gem])

  return (
    <Plain.Provider value={true}>
      <div className="story" ref={root}>{children}</div>
      {gem && (
        <div className="gem" aria-hidden="true">
          <canvas ref={canvas} />
          <span ref={count} className="gem-count" />
        </div>
      )}
    </Plain.Provider>
  )
}
