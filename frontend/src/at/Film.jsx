import { useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import { useT } from '../i18n/index.js'
import { glideTo, state, stopScroll, subscribe } from './state.js'

// The home "film": a tall section whose scroll position is the playhead. Scroll down plays it, scroll up
// rewinds it. Every frame is a pure function of that playhead (p), so the rewind is exact.
//   - story cards (real DOM text) orbit a honeycomb tower on a spiral, like the Active Theory work page
//   - the tower and a swarm are drawn on a canvas with the same camera as the cards
//   - 30 of the swarm are the simulated class: they leave the swarm to form the class grid, then the
//     Hivemind mark
// Pointer effects (tilt, repel, cell hover) sit on top as offsets and never change the playhead.

const STEP = 46            // degrees between neighbouring cards on the ring
const RISE = 150           // px each card sits below the previous one
const P = 1100             // camera distance (CSS perspective), shared by cards and canvas
const PEEK = 0.42          // how solid the card before and the card after look (0 = hidden, 1 = solid)
const SCREEN = 0.78        // screens of scroll per chapter

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) }
const mix = (a, b, t) => a + (b - a) * t
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x) }
const TAU = Math.PI * 2
const YOU = 4 // which of the 30 dots is "the student like you" (it lands in the mark's orange cell at the end)
const MARK_CELLS = [[0, -0.62], [-0.55, 0.33], [0.55, 0.33]] // the logo's three cells, in units of the formation size

// Title decode (scrubbable): the closer a card is to the front, the more of its title has resolved.
function decode(el, k, time) {
  const text = el.dataset.text
  if (k >= 1) { if (el._k !== 1) { el.textContent = text; el._k = 1 } return }
  const chars = [...text], cut = Math.floor(chars.length * k), tick = Math.floor(time * 16)
  if (el._k === cut && el._t === tick) return
  el._k = cut; el._t = tick
  el.textContent = chars.map((c, j) => {
    if (j < cut || c === ' ') return c
    const r = chars[(j * 7 + tick * 13 + j * j) % chars.length] // scramble with the title's own letters (any script)
    return r === ' ' ? c : r
  }).join('')
}

// The three cells of the mark, as 30 points (10 per cell) for the class to land on.
const LOGO_POINTS = (() => {
  const out = []
  for (const [cx, cy] of MARK_CELLS) for (let k = 0; k < 10; k++) {
    const side = Math.floor((k / 10) * 6), f = (k / 10) * 6 - side
    const a0 = ((-90 + side * 60) * Math.PI) / 180, a1 = ((-90 + (side + 1) * 60) * Math.PI) / 180
    out.push([cx + 0.5 * mix(Math.cos(a0), Math.cos(a1), f), cy + 0.5 * mix(Math.sin(a0), Math.sin(a1), f)])
  }
  return out
})()

function Title({ text }) {
  return <h2 className="film-title" aria-label={text}><span aria-hidden="true" data-text={text}>{text}</span></h2>
}

// Small pictures, one per card (n = the card's number). Plain line drawings on a 240 x 80 grid: shapes sit on
// 4px steps between x 4 and 236, y 8 and 72, so every picture has the same height and starts at the text's left edge.
// The CSS in sections/home.css draws them in when the card is in front (--i is each part's turn).
const hexPts = (cx, cy, r) => [0, 1, 2, 3, 4, 5].map((k) => { const a = ((k * 60 - 90) * Math.PI) / 180; return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}` }).join(' ')
const box = (x, y, w, h, r = 4) => `M${x + r} ${y} H${x + w - r} A${r} ${r} 0 0 1 ${x + w} ${y + r} V${y + h - r} A${r} ${r} 0 0 1 ${x + w - r} ${y + h} H${x + r} A${r} ${r} 0 0 1 ${x} ${y + h - r} V${y + r} A${r} ${r} 0 0 1 ${x + r} ${y} Z`
const ROWS = [28, 44, 60]            // answer rows on a quiz sheet
const NEAR = [[104, 40], [152, 40], [128, 16], [128, 64]] // the four students nearest "you" (you sit at 128, 40)
const KNOBS = [148, 92, 180, 116, 68] // where each of the five scales is set
const PAIRS = [[64, 48], [80, 72], [40, 88], [72, 56]] // per tool type: easy-to-use bar, learning bar
const STEPS = [[26, 60], [70, 48], [114, 36], [158, 24], [202, 12]] // one dot per stair
const RANKS = [192, 152, 120, 88]     // the ranked list, best first

// A quiz sheet: a title line and three answer rows. Ticked rows show a tick where the box would be.
function Sheet({ x, ticks, at }) {
  const i = (k) => ({ '--i': k })
  return (<>
    <g className="a" style={i(at)}>
      <rect x={x} y="8" width="56" height="64" rx="4" />
      <path d={`M${x + 8} 16 H${x + 32}`} />
      {ROWS.map((y, r) => (
        <g key={r}>
          {r >= ticks && <rect x={x + 8} y={y - 4} width="8" height="8" rx="2" />}
          <path className="dim" d={`M${x + 24} ${y} H${x + 48}`} />
        </g>
      ))}
    </g>
    {ROWS.slice(0, ticks).map((y, r) => <path key={r} className="d ok" style={i(at + 1 + r)} pathLength="1" d={`M${x + 8} ${y} l4 4 l8 -8`} />)}
  </>)
}

function Fig({ n }) {
  const i = (k, extra) => ({ '--i': k, ...extra })
  let body = null
  if (n === 0) body = [0, 1].map((row) => [0, 1, 2, 3, 4, 5].slice(row).map((k) => ( // a small honeycomb, one cell picked
    <polygon key={`${row}${k}`} className={`a${row === 1 && k === 3 ? ' pick' : ''}`} style={i(k + row)} points={hexPts(18 + k * 32 - row * 16, 26 + row * 27.7, 16)} />
  )))
  else if (n === 1) body = (<> {/* quiz, then a mini-lesson (a hint bubble), then the same quiz with more right */}
    <Sheet x={4} ticks={1} at={0} />
    <path className="d" style={i(2)} pathLength="1" d="M68 40 H84 M80 36 L84 40 L80 44" />
    <g className="a" style={i(3)}>
      <path d="M96 8 H144 A4 4 0 0 1 148 12 V52 A4 4 0 0 1 144 56 H112 L100 68 V56 H96 A4 4 0 0 1 92 52 V12 A4 4 0 0 1 96 8 Z" />
      <path className="dim" d="M100 20 H140 M100 32 H132 M100 44 H120" />
    </g>
    <path className="d" style={i(4)} pathLength="1" d="M156 40 H172 M168 36 L172 40 L168 44" />
    <Sheet x={180} ticks={3} at={5} />
  </>)
  else if (n === 2) body = (<> {/* the class of 30 as a grid; you (orange) and the four students nearest you, ringed */}
    {Array.from({ length: 30 }, (_, k) => {
      const x = 8 + (k % 10) * 24, y = 16 + Math.floor(k / 10) * 24
      if (x === 128 && y === 40) return <circle key={k} className="a fillpop" style={i(10)} cx={x} cy={y} r="5" />
      const near = NEAR.some(([a, b]) => a === x && b === y)
      return <circle key={k} className={`a ${near ? 'keep' : 'dim'}`} style={i(k % 10)} cx={x} cy={y} r="4" />
    })}
    {NEAR.map(([x, y], k) => <circle key={k} className="a" style={i(11)} cx={x} cy={y} r="8" />)}
  </>)
  else if (n === 3) body = PAIRS.map(([a, b], k) => ( // each tool type: a bar for easy to use, a bar for learning
    <g key={k}>
      <polygon className="a" style={i(k * 3)} points={hexPts(10, 16 + k * 16, 6)} />
      <rect className="gx soft" style={i(k * 3 + 1)} x="28" y={12 + k * 16} width={a} height="8" rx="2" />
      <rect className="gx okbar" style={i(k * 3 + 2)} x="136" y={12 + k * 16} width={b} height="8" rx="2" />
    </g>
  ))
  else if (n === 4) body = KNOBS.map((x, k) => { // five scales, one per way students differ, each set somewhere different
    const y = 16 + k * 12
    return (
      <g key={k}>
        <path className="dim" d={`M4 ${y - 4} V${y + 4} M4 ${y} H236 M236 ${y - 4} V${y + 4}`} />
        <circle className="s keep" style={i(k * 2, { '--dx': `${120 - x}px` })} cx={x} cy={y} r="4.5" />
      </g>
    )
  })
  else if (n === 5) body = (<> {/* easy to use: even steps, reached one after another */}
    <path className="d" style={i(0, { '--len': '1.2s' })} pathLength="1" d="M4 68 H48 V56 H92 V44 H136 V32 H180 V20 H224" />
    {STEPS.map(([x, y], k) => <circle key={k} className={`a ${k === 4 ? 'fillpop' : 'keep'}`} style={i(2 + k * 2)} cx={x} cy={y} r="4" />)}
  </>)
  else if (n === 6) body = (<> {/* helps you learn: before, after, and the gain marked in teal */}
    <path className="dim" d="M4 68 H236" />
    <rect className="gy soft" style={i(0)} x="28" y="44" width="64" height="24" rx="2" />
    <rect className="gy soft" style={i(2)} x="128" y="16" width="64" height="52" rx="2" />
    <rect className="gy okfill" style={i(5)} x="129" y="17" width="62" height="27" />
    <path className="d dim" style={i(4)} pathLength="1" d="M92 44 H192" />
    <path className="d ok" style={i(6)} pathLength="1" d="M208 44 V16 M202 22 L208 16 L214 22" />
  </>)
  else if (n === 7) body = (<> {/* safe: one specific product (a browser window) with a shield and tick on it */}
    <path className="d" style={i(0, { '--len': '1s' })} pathLength="1" d={box(4, 8, 232, 64)} />
    <path className="d" style={i(1)} pathLength="1" d="M4 24 H236" />
    {[14, 22, 30].map((x, k) => <circle key={x} className="a dim" style={i(2 + k)} cx={x} cy="16" r="2" />)}
    <rect className="a dim" style={i(3)} x="44" y="12" width="104" height="8" rx="4" />
    <rect className="a" style={i(4)} x="16" y="36" width="24" height="24" rx="6" />
    <path className="d" style={i(5)} pathLength="1" d="M52 42 H124" />
    <path className="d dim" style={i(6)} pathLength="1" d="M52 54 H100" />
    <path className="d ok" style={i(7)} pathLength="1" d="M196 32 L212 36 V46 C212 55 204 60 196 64 C188 60 180 55 180 46 V36 Z" />
    <path className="d ok" style={i(10)} pathLength="1" d="M188 48 L194 54 L204 44" />
  </>)
  else if (n === 8) body = RANKS.map((w, k) => ( // the ranked list: best match first, in orange
    <g key={k}>
      <polygon className={`a${k === 0 ? ' pick' : ''}`} style={i(k * 3)} points={hexPts(10, 16 + k * 16, 6)} />
      <rect className={`gx ${k === 0 ? 'fillpop' : 'soft'}`} style={i(k * 3 + 1)} x="28" y={12 + k * 16} width={w} height="8" rx="2" />
    </g>
  ))
  // viewBox starts at x 3 so the drawings' left edge (x 4, minus half a stroke) lines up with the card text
  return <svg className="fig" viewBox="3 0 240 80" aria-hidden="true" focusable="false">{body}</svg>
}

export default function Film() {
  const t = useT()
  const film = useRef(null), ring = useRef(null), canvas = useRef(null)
  const range = useRef(null), hint = useRef(null)
  const cards = useRef([]), navs = useRef([])
  // words drawn on the canvas, kept in a ref so they follow the site language
  const labels = useRef({})
  // only the two scores a tool type has; safety is for specific EdTech tools, so it is never named over the class
  labels.current = { klass: t('class.list'), you: t('film.you'), scores: [t('checks.easy.title'), t('checks.learn.title')] }
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])

  const how = [1, 2, 3], checks = ['easy', 'learn', 'safe'] // cards 5, 6, 7: the two tool-type scores, then safety
  const N = 9
  const groups = [ // the chapter list in the HUD: label + the card it jumps to
    { at: 0, label: 'Hivemind' },
    { at: 1, label: t('how.title') },
    { at: 4, label: t('class.title') },
    { at: 5, label: t('checks.title') },
    { at: 8, label: t('cta.check') },
  ]

  useEffect(() => {
    if (reduced) return
    const el = film.current, cv = canvas.current, ctx = cv.getContext('2d')
    let W = 1, H = 1, pr = 1, R = 480, wide = true, axis = 0.5, top = 0, travel = 1, lastP = -1, cardRise = RISE
    const hidden = []

    const measure = () => {
      W = window.innerWidth; H = window.innerHeight
      wide = W >= 900
      axis = wide ? 0.4 : 0.5
      R = wide ? clamp(W * 0.36, 380, 560) : W * 0.95
      cardRise = wide ? clamp(H * 0.33, 220, 300) : clamp(H * 0.3, 200, 280) // how far below the last card the next one sits
      pr = Math.min(window.devicePixelRatio || 1, state.qualityLevel === 'high' ? 1.5 : 1)
      cv.width = Math.round(W * pr); cv.height = Math.round(H * pr)
      ring.current.style.perspectiveOrigin = `${axis * 100}% 50%`
      const r = el.getBoundingClientRect()
      top = r.top + window.scrollY; travel = Math.max(1, r.height - H)
      lastP = -1
    }

    const project = (x, y, z) => { const s = P / (P - z); return [W * axis + x * s, H * 0.5 + y * s, s] }

    // ---- one frame, from the playhead p (0 .. N-1) ----
    const render = (p, s) => {
      const phi = (-p * STEP * Math.PI) / 180          // the whole scene turns with the playhead
      const light = s.ground === 'white', ink = light ? '15 23 47' : '255 255 255' // lines are ink on white, white on midnight
      const lift = p * RISE
      const px = s.pointerOn ? s.pointerX : 0, py = s.pointerOn ? s.pointerY : 0
      const vtop = cv.getBoundingClientRect().top // the view is only at the top of the screen once pinned
      const mx = s.pointerOn ? s.sx : -9999, my = s.pointerOn ? s.sy - vtop : -9999

      // Cards on the spiral
      for (let i = 0; i < N; i++) {
        const c = cards.current[i]; if (!c) continue
        const d = i - p, ad = Math.abs(d)
        const active = ad < 0.5
        if (c._active !== active) { c._active = active; c.inert = !active; c.classList.toggle('is-active', active) } // before the early exit: a jump can skip past a card
        if (ad > 2.2) { if (!hidden[i]) { c.style.visibility = 'hidden'; hidden[i] = true } continue }
        if (hidden[i] !== false) { c.style.visibility = 'visible'; hidden[i] = false }
        const near = clamp(1 - ad, 0, 1)
        const th = d * STEP * (wide ? 1 : 0.85) * (1 + 0.12 * Math.abs(s.vel))   // the ring opens up a little at speed; on a narrow screen the neighbours sit closer so more of them shows
        // a neighbour is pushed back a little, so its near edge never pokes in front of the card you are reading
        c.style.transform = `translate(-50%, -50%) translateZ(${(-Math.min(ad, 1.2) * 150 - R).toFixed(1)}px) rotateY(${th.toFixed(3)}deg) translateY(${(d * cardRise).toFixed(2)}px) translateZ(${R}px) rotateX(${(py * 3.5 * near).toFixed(3)}deg) rotateY(${(px * 5 * near).toFixed(3)}deg) rotateZ(${(-s.vel * 2.5).toFixed(3)}deg)`
        // the card in front is solid; the one before and the one after stay on screen, dimmed; the rest are gone
        c.style.opacity = (ad < 0.45 ? 1 : ad < 1 ? 1 - ((ad - 0.45) / 0.55) * (1 - PEEK) : PEEK * clamp(1 - (ad - 1) / 0.7, 0, 1)).toFixed(3)
        const k = clamp(1 - (ad - 1.05) * 3.2, 0, 1) // readable on the front card and its two neighbours; scrambles only further away
        for (const tEl of c._titles) decode(tEl, k, s.time)
      }

      // HUD: scrub bar, timecode, current chapter
      const f = p / (N - 1)
      if (document.activeElement !== range.current || !range.current.matches(':active')) range.current.value = Math.round(f * 1000)
      range.current.style.setProperty('--f', f.toFixed(4))
      hint.current.style.opacity = clamp(1 - p * 3, 0, 1)
      let cur = 0
      groups.forEach((g, gi) => { if (p >= g.at - 0.5) cur = gi })
      navs.current.forEach((b, gi) => { if (b) b.classList.toggle('is-current', gi === cur) })

      // ---- canvas: honeycomb tower + swarm, same camera as the cards ----
      ctx.setTransform(pr, 0, 0, pr, 0, 0); ctx.clearRect(0, 0, W, H)
      const q = s.qualityLevel
      const rt = R * 0.3, size = 0.6046 * rt, hh = size * 1.5
      const yOff = lift * 0.85, base = Math.floor(yOff / hh), J = Math.ceil((H * 1.5) / hh / 2) + 1
      const cells = []
      for (let j = -J; j <= J; j++) {
        const id = j + base, y = id * hh - yOff
        for (let k = 0; k < 6; k++) {
          const a = (k * 60 + (id & 1) * 30) * Math.PI / 180 + phi
          cells.push({ id, k, a, y, f: Math.cos(a) })
        }
      }
      cells.sort((u, v) => u.f - v.f) // back cells first
      ctx.lineJoin = 'round'
      const formed = smooth(3.15, 3.75, p)            // 1 once the class has formed up
      const dim = 1 - (wide ? 0.3 : 0.82) * formed    // the tower steps back so the class is never drawn on top of a busy pattern
      ctx.globalAlpha = dim
      for (const c of cells) {
        const h = hash(c.id * 8 + c.k)
        const breathe = 1 + 0.07 * Math.sin(s.time * 0.8 + c.id * 1.7 + c.k * 2.1)
        const [cx0, cy0, s0] = project(Math.sin(c.a) * rt, c.y, -R + Math.cos(c.a) * rt)
        const hover = c.f > 0 ? clamp(1 - Math.hypot(cx0 - mx, cy0 - my) / (size * s0 * 1.2), 0, 1) : 0
        const rr = rt * breathe + hover * 34
        const tx = Math.cos(c.a), tz = -Math.sin(c.a)
        const ox = Math.sin(c.a) * rr, oz = -R + Math.cos(c.a) * rr
        ctx.beginPath()
        for (let m = 0; m < 6; m++) {
          const va = (m * 60 + 30) * Math.PI / 180, e = size * 0.9
          const [sx, sy] = project(ox + tx * Math.cos(va) * e, c.y + Math.sin(va) * e, oz + tz * Math.cos(va) * e)
          m ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy)
        }
        ctx.closePath()
        const v0 = project(ox, c.y, oz)
        const face = Math.max(0, c.f), mid = 1 - clamp(Math.abs(c.y) / (H * 0.55), 0, 1) // brightest at the playhead row
        const pop = h < 0.07 || hover > 0.35
        if (pop) { ctx.fillStyle = `rgb(244 81 30 / ${(0.10 + 0.55 * face * (0.4 + 0.6 * mid) + hover * 0.3).toFixed(3)})`; ctx.fill() }
        else if (h < 0.3) { ctx.fillStyle = `rgb(${ink} / ${(0.02 + 0.16 * face * mid).toFixed(3)})`; ctx.fill() }
        ctx.strokeStyle = pop ? `rgb(255 122 82 / ${(0.25 + 0.6 * face).toFixed(3)})` : `rgb(${ink} / ${(0.05 + 0.34 * face * (0.35 + 0.65 * mid)).toFixed(3)})`
        ctx.lineWidth = 1 + face * 0.8
        ctx.stroke()
        if (face > 0.15) { // crystal facets: three cuts through the centre of each cell
          ctx.beginPath()
          for (let m = 0; m < 6; m++) {
            const va = (m * 60 + 30) * Math.PI / 180, e = size * 0.9
            const [sx, sy] = project(ox + tx * Math.cos(va) * e, c.y + Math.sin(va) * e, oz + tz * Math.cos(va) * e)
            ctx.moveTo(v0[0], v0[1]); ctx.lineTo(sx, sy)
          }
          ctx.lineWidth = 0.6; ctx.globalAlpha = 0.35 * dim; ctx.stroke(); ctx.globalAlpha = dim
        }
      }

      ctx.globalAlpha = 1
      if (q === 'low') return
      // Swarm: specks orbiting the tower. Angle and height depend only on p (plus a slow idle drift).
      ctx.globalCompositeOperation = light ? 'source-over' : 'lighter'
      ctx.globalAlpha = 1 - 0.5 * formed // the loose specks thin out too
      const count = q === 'high' ? 420 : 220
      for (let i = 0; i < count; i++) {
        const h1 = hash(i), h2 = hash(i + 0.37), h3 = hash(i + 0.71)
        const a = h1 * TAU + phi * (0.5 + h2) + s.time * 0.05 * (h3 - 0.5)
        const r = rt * 1.25 + (R * 1.25 - rt) * h2 * h2
        const span = H * 1.6
        const y = ((((h3 * span - lift * (0.5 + h1 * 0.6)) % span) + span) % span) - span / 2
        let [sx, sy, sc] = project(Math.sin(a) * r, y, -R + Math.cos(a) * r)
        const dx = sx - mx, dy = sy - my, dd = Math.hypot(dx, dy)
        if (dd < 130 && dd > 0.01) { const push = (1 - dd / 130) * 46; sx += (dx / dd) * push; sy += (dy / dd) * push } // the swarm parts around the pointer
        const z = (1 + Math.cos(a)) / 2, w = (0.8 + h3 * 1.7) * sc
        ctx.fillStyle = h1 < 0.14 ? `rgb(244 81 30 / ${(0.25 + 0.6 * z).toFixed(3)})` : `rgb(${ink} / ${(0.10 + 0.45 * z).toFixed(3)})`
        ctx.fillRect(sx - w / 2, sy - w / 2, w, w)
      }

      // The class of 30. A dot is ALWAYS one simulated student, and exactly one is orange: the student like you.
      // Playhead keyframes: swarm -> the class as a grid (it stays put while the two scores are named) -> the mark.
      ctx.globalAlpha = 1
      const fx = wide ? W * 0.80 : W * 0.5, fy = wide ? H * 0.5 : H * 0.2
      const g = wide ? clamp(W * 0.021, 20, 30) : clamp(W * 0.062, 18, 26)
      const u = wide ? clamp(W * 0.085, 80, 130) : Math.min(W * 0.13, H * 0.085)
      const wMark = smooth(7.1, 7.75, p), lab = labels.current
      if (wMark > 0.01) { // the mark's three cells, drawn softly behind the dots so the last shape reads as the logo
        ctx.globalCompositeOperation = 'source-over'
        MARK_CELLS.forEach(([mx0, my0], k) => {
          ctx.beginPath()
          for (let m = 0; m < 6; m++) { const va = ((-90 + m * 60) * Math.PI) / 180, hx = fx + (mx0 + 0.5 * Math.cos(va)) * u, hy = fy + (my0 + 0.5 * Math.sin(va)) * u; m ? ctx.lineTo(hx, hy) : ctx.moveTo(hx, hy) }
          ctx.closePath()
          ctx.fillStyle = k === 0 ? `rgb(244 81 30 / ${(0.16 * wMark).toFixed(3)})` : `rgb(${ink} / ${(0.05 * wMark).toFixed(3)})`
          ctx.fill()
        })
        ctx.globalCompositeOperation = light ? 'source-over' : 'lighter'
      }
      for (let i = 0; i < 30; i++) {
        const pp = p - i * 0.006                                // tiny stagger so they peel off one by one
        const h1 = hash(i + 100), h2 = hash(i + 200)
        const a = h1 * TAU + phi * (0.7 + h2 * 0.5), r = rt * 1.5 + R * 0.5 * h2
        const y0 = (h1 - 0.5) * H * 0.8 - Math.sin(lift * 0.004 + i) * 40
        let [x, y, sc] = project(Math.sin(a) * r, y0, -R + Math.cos(a) * r)
        let alpha = 0.35 + 0.3 * (1 + Math.cos(a)), rad = 2.6 * sc
        const grid = [fx + ((i % 10) - 4.5) * g, fy + (Math.floor(i / 10) - 1) * g * 1.25]
        const logo = [fx + LOGO_POINTS[i][0] * u, fy + LOGO_POINTS[i][1] * u]
        const wGrid = smooth(3.15, 3.75, pp), wLogo = smooth(7.1, 7.75, pp) // all land before the chapter's rest point, stagger included
        x = mix(x, grid[0], wGrid); y = mix(y, grid[1], wGrid)
        x = mix(x, logo[0], wLogo); y = mix(y, logo[1], wLogo)
        rad = mix(rad, 4.2, wGrid); alpha = mix(alpha, 1, wGrid)
        const dx = x - mx, dy = y - my, dd = Math.hypot(dx, dy)
        if (dd < 90 && dd > 0.01) { const push = (1 - dd / 90) * 22; x += (dx / dd) * push; y += (dy / dd) * push }
        const you = i === YOU
        ctx.fillStyle = you ? `rgb(244 81 30 / ${alpha.toFixed(3)})` : `rgb(${ink} / ${alpha.toFixed(3)})`
        ctx.beginPath(); ctx.arc(x, y, you ? rad * 1.15 : rad, 0, TAU); ctx.fill()
        ctx.fillStyle = you ? 'rgb(244 81 30 / 0.18)' : `rgb(${ink} / 0.10)`
        ctx.beginPath(); ctx.arc(x, y, rad * 2.6, 0, TAU); ctx.fill()
      }
      ctx.globalCompositeOperation = 'source-over'
      // Captions, so nobody has to guess what the dots are.
      const cap = formed * (1 - wMark)
      if (cap > 0.02) {
        ctx.textBaseline = 'middle'; ctx.textAlign = 'center'
        ctx.font = '500 13px "Figtree Variable", system-ui, sans-serif'
        const cy = fy + g * 1.25 + 32
        ctx.fillStyle = `rgb(${ink} / ${(0.75 * cap).toFixed(3)})`
        ctx.fillText(lab.klass, fx, cy)
        const tw = ctx.measureText(lab.you).width
        ctx.fillStyle = `rgb(244 81 30 / ${cap.toFixed(3)})`
        ctx.beginPath(); ctx.arc(fx - tw / 2 - 6, cy + 21, 4.2, 0, TAU); ctx.fill()
        ctx.fillStyle = `rgb(${ink} / ${(0.62 * cap).toFixed(3)})`
        ctx.fillText(lab.you, fx + 6, cy + 21)
        // the two scores are named above the class on their own cards (5 and 6); the one on screen is orange.
        // They fade out before the Safe card (7), because tool types get no safety score.
        const wS = smooth(4.3, 4.8, p) * (1 - smooth(6.5, 6.9, p))
        if (wS > 0.02) {
          const names = lab.scores, gap = 20, widths = names.map((n) => ctx.measureText(n).width)
          let x0 = fx - (widths.reduce((q, w) => q + w, 0) + gap * (names.length - 1)) / 2
          const y1 = fy - g * 1.25 - 30, active = clamp(Math.round(p) - 5, 0, names.length - 1)
          ctx.textAlign = 'left'
          names.forEach((n, k) => {
            ctx.fillStyle = k === active ? `rgb(244 81 30 / ${wS.toFixed(3)})` : `rgb(${ink} / ${(0.45 * wS).toFixed(3)})`
            ctx.fillText(n, x0, y1)
            if (k === active) ctx.fillRect(x0, y1 + 10, widths[k], 1.5)
            x0 += widths[k] + gap
          })
        }
      }
    }

    const playhead = () => clamp((window.scrollY - top) / travel, 0, 1) * (N - 1)
    cards.current.forEach((c) => { if (c) c._titles = [...c.querySelectorAll('[data-text]')] })
    measure()
    window.addEventListener('resize', measure)
    let lastQ = state.qualityLevel, tickN = 0
    const unsub = subscribe((s) => {
      if (s.qualityLevel !== lastQ) { lastQ = s.qualityLevel; measure() }
      if (++tickN % 90 === 0) { const r = el.getBoundingClientRect(); top = r.top + window.scrollY; travel = Math.max(1, r.height - H) } // layout can shift (fonts, notice)
      const r = el.getBoundingClientRect()
      if (r.bottom < -50 || r.top > H + 50) return // off screen: nothing to draw
      render(playhead(), s)
    })
    render(playhead(), state)
    // One swipe or wheel notch = one card. It never skips a card.
    // A trackpad swipe starts with tiny movements and ends with a long tail, so the movement is added up:
    // the card changes once the swipe has moved far enough, and the rest of that swipe is ignored.
    // Outside the film (above it, or past the first/last card) the wheel works as usual.
    let moved = 0, done = false, lockUntil = 0, lastWheel = 0, lastSize = 0
    const onWheel = (e) => {
      if (e.ctrlKey || e.metaKey || Math.abs(e.deltaX) > Math.abs(e.deltaY) || document.body.style.overflow === 'hidden') return
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * H : e.deltaY
      const y = window.scrollY, cur = clamp((y - top) / travel, 0, 1) * (N - 1)
      if (y < top - 2 || y > top + travel + 2) return
      const now = performance.now(), gap = now - lastWheel, size = Math.abs(dy)
      lastWheel = now
      // a new swipe: a pause, or (once the last move has landed) the wheel picking up speed again
      if (gap > 140 || (done && now > lockUntil && (size > 40 || size > lastSize * 1.6 + 6))) { moved = 0; done = false }
      lastSize = size
      const atEnd = (dy < 0 && cur < 0.02) || (dy > 0 && cur > N - 1.02)
      if (atEnd && !done && now > lockUntil) return // at the first/last card: let the page scroll on
      e.preventDefault(); e.stopImmediatePropagation()
      if (done || atEnd) return
      moved += dy
      if (Math.abs(moved) < 24) return
      done = true; lockUntil = now + 450
      const card = clamp(moved > 0 ? Math.floor(cur + 0.15) + 1 : Math.ceil(cur - 0.15) - 1, 0, N - 1)
      glideTo(top + (card / (N - 1)) * travel)
    }
    document.addEventListener('wheel', onWheel, { passive: false, capture: true })

    // For checking a single frame without playing: window.__film.seek(0..1)
    window.__film = { seek(v) { measure(); stopScroll(); window.scrollTo(0, top + clamp(v, 0, 1) * travel); render(clamp(v, 0, 1) * (N - 1), state) }, chapters: N }

    return () => { unsub(); document.removeEventListener('wheel', onWheel, true); window.removeEventListener('resize', measure); delete window.__film }
  }, [reduced, t('hero.line1')]) // eslint-disable-line react-hooks/exhaustive-deps -- re-collect titles when the language changes

  const jump = (card) => {
    const el = film.current, r = el.getBoundingClientRect()
    glideTo(r.top + window.scrollY + (card / (N - 1)) * (r.height - window.innerHeight))
  }
  const scrub = (e) => {
    const el = film.current, r = el.getBoundingClientRect()
    stopScroll(); window.scrollTo(0, r.top + window.scrollY + (e.target.value / 1000) * (r.height - window.innerHeight))
  }

  // A short plain label above a card's title, only where the card has one to give (the chapter list below already numbers them).
  const tag = (i, kicker) => (kicker && kicker !== 'Hivemind' ? <p className="film-tag" aria-hidden="true">{kicker}</p> : null)
  const set = (i) => (el) => { cards.current[i] = el }

  return (
    <section className={`film${reduced ? ' film-static' : ''}`} ref={film} style={reduced ? undefined : { height: `${(N - 1) * SCREEN * 100 + 100}svh` }} aria-labelledby="hero-h">
      <div className="film-view">
        <canvas className="film-canvas" ref={canvas} aria-hidden="true" />
        <div className="film-ring" ref={ring}>
          <article className="film-card film-hero glass" ref={set(0)}>
            <Fig n={0} />
            <h1 id="hero-h" className="film-title" aria-label={`${t('hero.line1')} ${t('hero.line2')}`}>
              <span aria-hidden="true" data-text={t('hero.line1')}>{t('hero.line1')}</span>{' '}
              <span aria-hidden="true" className="hero-accent" data-text={t('hero.line2')}>{t('hero.line2')}</span>
            </h1>
            <div className="actions">
              <Link to="/check" className="btn btn-primary btn-large">{t('cta.check')} <Icon name="arrow" size={18} className="icon-nudge" /></Link>
              <Link to="/lab" className="btn btn-large">{t('cta.lab')}</Link>
            </div>
          </article>
          {how.map((k, j) => (
            <article className="film-card glass" key={k} ref={set(1 + j)}>
              <Fig n={1 + j} />
              {tag(1 + j, t('how.title'))}
              <Title text={t(`how.${k}.title`)} />
              <p className="film-text">{t(`how.${k}.text`)}</p>
            </article>
          ))}
          <article className="film-card glass" ref={set(4)}>
            <Fig n={4} />
            {tag(4)}
            <Title text={t('class.title')} />
            <p className="film-text">{t('class.lede')}</p>
            <p className="muted small">{t('class.note')}</p>
          </article>
          {checks.map((k, j) => (
            <article className="film-card glass" key={k} ref={set(5 + j)}>
              <Fig n={5 + j} />
              {tag(5 + j, t('checks.title'))}
              <Title text={t(`checks.${k}.title`)} />
              <p className="film-text">{t.rich(`checks.${k}.text`)}</p>
              {j === 2 && <p className="muted small">{t.rich('checks.note')}</p>}
            </article>
          ))}
          <article className="film-card glass" ref={set(8)}>
            <Fig n={8} />
            {tag(8)}
            <Title text={t('finale.title')} />
            <div className="actions">
              <Link to="/check" className="btn btn-primary btn-large">{t('cta.check')} <Icon name="arrow" size={18} className="icon-nudge" /></Link>
              <Link to="/about" className="btn btn-large">{t('cta.method')}</Link>
            </div>
          </article>
        </div>

        <nav className="film-hud" aria-label="Chapters">
          {groups.map((g, gi) => (
            <button key={g.at} type="button" ref={(el) => { navs.current[gi] = el }} onClick={() => jump(g.at)}>
              <span aria-hidden="true">-&gt;</span> {g.label}
            </button>
          ))}
        </nav>
        <div className="film-bar">
          <input ref={range} className="film-range" type="range" min="0" max="1000" defaultValue="0" onInput={scrub} aria-label="Move through the story" />
          <span className="film-hint" ref={hint} aria-hidden="true">Scroll</span>
        </div>
      </div>
    </section>
  )
}
