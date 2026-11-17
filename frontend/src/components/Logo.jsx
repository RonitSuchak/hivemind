import { useEffect, useRef } from 'react'
import { subscribe } from '../at/state.js'

// The Hivemind mark: three honeycomb cells. Two are ink (the hive: many tools, many students),
// the top one is orange (the one that fits you). Simple enough to read at 16px.
//
// It is alive (at/state.js loop), but always settles back to the plain mark:
//   - it leans in 3D toward the pointer, more the closer the pointer is
//   - hover (or keyboard focus) on the link around it: the three cells fly apart, turn, and the orange one glows
//   - scrolling spins it and loosens the cells, then a spring pulls them home
// Under reduced motion the loop does not run, so it is the still mark.
const CELLS = [[16, 8.4, true], [9.7, 19.3, false], [22.3, 19.3, false]]
const CENTRE = [16, 15.67], R = 6.3
const hex = (cx, cy, r) => 'M' + [0, 1, 2, 3, 4, 5].map((k) => {
  const a = ((-90 + k * 60) * Math.PI) / 180
  return `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`
}).join('L') + 'Z'

export const MARK_CELLS = CELLS.map(([x, y, pop]) => ({ d: hex(x, y, R), pop }))

// One spring-damper value (m x'' + c x' + k (x - target) = 0)
const spring = (k, c) => { const s = { x: 0, v: 0, step(target, dt) { s.v += (-k * (s.x - target) - c * s.v) * dt; s.x += s.v * dt; return s.x } }; return s }

export default function Mark({ size = 24, className = '' }) {
  const svg = useRef(null)

  useEffect(() => {
    const el = svg.current
    const host = el.closest('a') || el
    const paths = [...el.querySelectorAll('path')]
    let hover = false, still = true
    const on = () => { hover = true }, off = () => { hover = false }
    host.addEventListener('pointerenter', on); host.addEventListener('pointerleave', off)
    host.addEventListener('focus', on); host.addEventListener('blur', off)
    const spread = spring(170, 11), turn = spring(120, 12), spin = spring(90, 10), tx = spring(140, 16), ty = spring(140, 16)

    const unsub = subscribe((s) => {
      const r = el.getBoundingClientRect()
      if (r.bottom < 0 || r.top > window.innerHeight) return
      // pointer: lean toward it, fading out with distance
      let lx = 0, ly = 0
      if (s.pointerOn) {
        const dx = s.px - (r.left + r.width / 2), dy = s.py - (r.top + r.height / 2), d = Math.hypot(dx, dy)
        const pull = Math.max(0, 1 - d / 420)
        lx = (dx / (d || 1)) * pull; ly = (dy / (d || 1)) * pull
      }
      const speed = Math.abs(s.vel)
      const sp = spread.step((hover ? 1 : 0) + speed * 0.9, s.dt)
      const tn = turn.step(hover ? 60 : 0, s.dt)
      const sn = spin.step(s.vel * 150, s.dt)
      const ax = tx.step(lx, s.dt), ay = ty.step(ly, s.dt)
      const moving = Math.abs(sp) > 0.003 || Math.abs(tn) > 0.05 || Math.abs(sn) > 0.05 || Math.abs(ax) > 0.003 || Math.abs(ay) > 0.003
        || Math.abs(spread.v) + Math.abs(turn.v) + Math.abs(spin.v) > 0.05
      if (!moving) {
        if (!still) { still = true; el.style.transform = ''; el.style.removeProperty('--mark-glow'); paths.forEach((p) => p.removeAttribute('transform')) }
        return
      }
      still = false
      el.style.transform = `perspective(160px) rotateX(${(-ay * 34).toFixed(2)}deg) rotateY(${(ax * 34).toFixed(2)}deg) rotate(${sn.toFixed(2)}deg) scale(${(1 + sp * 0.12).toFixed(3)})`
      el.style.setProperty('--mark-glow', `${(3 + sp * 7).toFixed(1)}px`)
      paths.forEach((p, i) => {
        const [cx, cy] = CELLS[i]
        const ox = (cx - CENTRE[0]) * sp * 0.55, oy = (cy - CENTRE[1]) * sp * 0.55
        p.setAttribute('transform', `translate(${ox.toFixed(2)} ${oy.toFixed(2)}) rotate(${(tn * (i === 0 ? 1 : -1)).toFixed(2)} ${cx} ${cy}) `)
      })
    })
    return () => {
      unsub()
      host.removeEventListener('pointerenter', on); host.removeEventListener('pointerleave', off)
      host.removeEventListener('focus', on); host.removeEventListener('blur', off)
      el.style.transform = ''; paths.forEach((p) => p.removeAttribute('transform'))
    }
  }, [])

  return (
    <svg ref={svg} className={`mark ${className}`} width={size} height={size * (28 / 32)} viewBox="0 0 32 28" aria-hidden="true" focusable="false">
      {MARK_CELLS.map((c, i) => (
        <path key={i} d={c.d} className={c.pop ? 'mark-pop' : 'mark-ink'} strokeWidth="1.6" strokeLinejoin="round" />
      ))}
    </svg>
  )
}
