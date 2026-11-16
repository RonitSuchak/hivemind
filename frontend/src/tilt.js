import { useEffect } from 'react'

// Hover tilt. Any element with [data-tilt] inside `ref` leans toward the pointer: this hook only writes
// two CSS variables on it (--rx, --ry, in degrees) and a data-tilting flag; the CSS decides what turns.
// Mouse only, and off under reduced motion. `max` is the largest lean in degrees.
export function useTilt(ref, max = 9) {
  useEffect(() => {
    const root = ref.current
    if (!root) return
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let cur = null, frame = 0, px = 0, py = 0
    const clear = (el) => { el.style.removeProperty('--rx'); el.style.removeProperty('--ry'); el.removeAttribute('data-tilting') }
    const paint = () => {
      frame = 0
      if (!cur) return
      const r = cur.getBoundingClientRect()
      if (!r.width || !r.height) return
      const x = Math.max(-1, Math.min(1, ((px - r.left) / r.width) * 2 - 1))
      const y = Math.max(-1, Math.min(1, ((py - r.top) / r.height) * 2 - 1))
      cur.style.setProperty('--ry', `${(x * max).toFixed(2)}deg`)
      cur.style.setProperty('--rx', `${(-y * max).toFixed(2)}deg`)
      cur.setAttribute('data-tilting', '')
    }
    const move = (e) => {
      const el = e.target.closest?.('[data-tilt]')
      if (el !== cur) { if (cur) clear(cur); cur = el && root.contains(el) ? el : null }
      if (!cur) return
      px = e.clientX; py = e.clientY
      if (!frame) frame = requestAnimationFrame(paint)
    }
    const leave = () => { if (cur) clear(cur); cur = null }
    root.addEventListener('pointermove', move, { passive: true })
    root.addEventListener('pointerleave', leave)
    return () => {
      root.removeEventListener('pointermove', move)
      root.removeEventListener('pointerleave', leave)
      cancelAnimationFrame(frame)
      leave()
    }
  }, [ref, max])
}
