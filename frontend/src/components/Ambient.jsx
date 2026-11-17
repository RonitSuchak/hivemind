import { useEffect, useMemo, useRef } from 'react'
import { motion, useMotionValue, useScroll, useSpring, useTransform } from 'motion/react'
import { tokenPx, useReduced } from '../motion.js'

// Background behind the glass. Decorative: hidden from assistive tech.
// 1) soft colour fields that drift very slowly (CSS, transform only)
// 2) patterns: dot grid, concentric rings, diagonal stripes, a row of lime ticks (CSS only)
// 3) "chalkboard" glyphs: equations and two short quotes that bob in place. Bring the pointer near
//    one and it floats away; move off and it drifts back (small spring loop below, mouse only)
// 4) a soft lime glow that trails the pointer (mouse only)
// `parallax` (Home only) moves the fields a small fraction of the scroll (--ambient-parallax).

const sup = (b, e) => <>{b}<sup>{e}</sup></>
// x / y: position in % of the viewport. s: size in rem. r: tilt in degrees. near: brighter. pop: lime.
export const GLYPHS = [
  { c: <>{sup('e', 'iπ')} + 1 = 0</>, x: 60, y: 15, s: 2.6, r: -6, near: true, pop: true },
  { c: <>E = {sup('mc', '2')}</>, x: 5, y: 66, s: 2.3, r: 5, near: true },
  { c: <>{sup('a', '2')} + {sup('b', '2')} = {sup('c', '2')}</>, x: 84, y: 47, s: 1.7, r: 8 },
  { c: <>F = ma</>, x: 46, y: 7, s: 1.5, r: -3 },
  { c: <>Δx · Δp ≥ ħ / 2</>, x: 58, y: 84, s: 1.9, r: 4, near: true },
  { c: <>∇ · E = ρ / ε<sub>0</sub></>, x: 22, y: 21, s: 1.6, r: -8 },
  { c: <>x = (−b ± √({sup('b', '2')} − 4ac)) / 2a</>, x: 28, y: 91, s: 1.4, r: -2 },
  { c: <>Σ 1/{sup('n', '2')} = {sup('π', '2')}/6</>, x: 87, y: 76, s: 1.8, r: -7, pop: true },
  { c: <>∫ {sup('e', '−x²')} dx = √π</>, x: 3, y: 37, s: 1.7, r: 7 },
  { c: <>PV = nRT</>, x: 64, y: 34, s: 1.3, r: 3, wide: true },
  { c: <>λ = h / p</>, x: 39, y: 53, s: 1.3, r: -5, wide: true },
  { c: <>MR = MC</>, x: 14, y: 83, s: 1.3, r: 6, wide: true },
  { c: <>&ldquo;The mind is not a vessel to be filled, but a fire to be kindled.&rdquo; <i>Plutarch</i></>, x: 60, y: 60, s: 1.2, r: -2, quote: true, wide: true },
  { c: <>&ldquo;If I have seen further, it is by standing on the shoulders of giants.&rdquo; <i>Newton</i></>, x: 8, y: 7, s: 1.15, r: 2, quote: true, wide: true },
]

// Spring feel of the flee-and-return: low stiffness + light damping = a slow, floaty drift.
const STIFF = 0.022, DAMP = 0.9

export default function Ambient({ parallax = false }) {
  const reduced = useReduced()
  const k = useMemo(() => tokenPx('--ambient-parallax', 0.06), [])
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, (v) => (parallax && !reduced ? -v * k : 0))

  const gx = useMotionValue(-9999), gy = useMotionValue(-9999)
  const glowX = useSpring(gx, { stiffness: 60, damping: 20 }), glowY = useSpring(gy, { stiffness: 60, damping: 20 })
  const board = useRef(null)

  useEffect(() => {
    if (reduced || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    const reach = tokenPx('--glyph-reach', 190), push = tokenPx('--glyph-push', 130)
    const els = [...(board.current?.querySelectorAll('.glyph') ?? [])]
    // Resting centre of each glyph (layout position; the small bob is ignored on purpose).
    let items = []
    const measure = () => {
      items = els.map((el, i) => ({
        el, cx: el.offsetLeft + el.offsetWidth / 2, cy: el.offsetTop + el.offsetHeight / 2,
        x: items[i]?.x ?? 0, y: items[i]?.y ?? 0, vx: items[i]?.vx ?? 0, vy: items[i]?.vy ?? 0,
      }))
    }
    measure()
    let mx = -9999, my = -9999, frame = 0
    const step = () => {
      frame = 0
      let moving = false
      for (const g of items) {
        // Flee from where the glyph currently is, so it keeps moving away while the pointer follows it.
        const dx = g.cx + g.x - mx, dy = g.cy + g.y - my
        const d = Math.hypot(dx, dy) || 1
        let tx = 0, ty = 0
        if (d < reach) {
          const f = (1 - d / reach) * push
          tx = g.x + (dx / d) * f; ty = g.y + (dy / d) * f
          // never wander further than `push` from home
          const far = Math.hypot(tx, ty); if (far > push) { tx *= push / far; ty *= push / far }
        }
        g.vx = (g.vx + (tx - g.x) * STIFF) * DAMP
        g.vy = (g.vy + (ty - g.y) * STIFF) * DAMP
        g.x += g.vx; g.y += g.vy
        if (Math.abs(g.vx) + Math.abs(g.vy) > 0.02 || Math.abs(tx - g.x) + Math.abs(ty - g.y) > 0.3) moving = true
        g.el.style.transform = `translate3d(${g.x.toFixed(2)}px, ${g.y.toFixed(2)}px, 0)`
      }
      if (moving) frame = requestAnimationFrame(step)
    }
    const kick = () => { if (!frame) frame = requestAnimationFrame(step) }
    const move = (e) => { mx = e.clientX; my = e.clientY; gx.set(mx); gy.set(my); kick() }
    const away = () => { mx = -9999; my = -9999; kick() }
    window.addEventListener('pointermove', move, { passive: true })
    document.documentElement.addEventListener('pointerleave', away)
    window.addEventListener('blur', away)
    window.addEventListener('resize', measure)
    return () => {
      window.removeEventListener('pointermove', move)
      document.documentElement.removeEventListener('pointerleave', away)
      window.removeEventListener('blur', away)
      window.removeEventListener('resize', measure)
      cancelAnimationFrame(frame)
      els.forEach((el) => { el.style.transform = '' })
    }
  }, [reduced, gx, gy])

  return (
    <div className="ambient" aria-hidden="true">
      <motion.div className="ambient-fields" style={{ y }}>
        <span className="ambient-field ambient-a" />
        <span className="ambient-field ambient-b" />
        <span className="ambient-field ambient-c" />
        <span className="ambient-field ambient-d" />
      </motion.div>
      <span className="pattern pattern-dots" />
      <span className="pattern pattern-rings" />
      <span className="pattern pattern-stripes" />
      <span className="pattern pattern-ticks" />
      <motion.span className="ambient-glow" style={{ x: glowX, y: glowY }} />
      <div className="glyphs" ref={board}>
        {GLYPHS.map((g, i) => (
          <span key={i} className={`glyph${g.near ? ' glyph-near' : ''}${g.pop ? ' glyph-pop' : ''}${g.quote ? ' glyph-quote' : ''}${g.wide ? ' glyph-wide' : ''}`}
            style={{ left: `${g.x}%`, top: `${g.y}%`, fontSize: `${g.s}rem`, '--r': `${g.r}deg`, '--i': i }}>
            {g.c}
          </span>
        ))}
      </div>
      <span className="ambient-grain" />
    </div>
  )
}
