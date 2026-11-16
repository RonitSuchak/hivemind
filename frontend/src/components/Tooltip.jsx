import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { tokenMs } from '../hooks.js'

// Tooltip that waits (--dur-tip-delay) before showing and disappears instantly.
// If one was just open, the next shows with no delay. The delay runs on a JS timer so it also
// holds under prefers-reduced-motion. Rendered in <body> so no scroll box can clip it.
let lastHidden = 0

export function useTooltip() {
  const [tip, setTip] = useState(null)
  const timer = useRef(0)
  const open = useRef(false)

  const hide = useCallback(() => {
    clearTimeout(timer.current)
    if (open.current) { open.current = false; lastHidden = performance.now() }
    setTip(null)
  }, [])

  const show = useCallback((el, text) => {
    clearTimeout(timer.current)
    const wait = performance.now() - lastHidden < 500 ? 0 : tokenMs('--dur-tip-delay', 400)
    timer.current = setTimeout(() => {
      const r = el.getBoundingClientRect()
      const x = Math.min(Math.max(r.left + r.width / 2, 130), window.innerWidth - 130)
      const below = r.top < 56
      open.current = true
      setTip({ text, x, y: below ? r.bottom + 8 : r.top - 8, below })
    }, wait)
  }, [])

  useEffect(() => {
    if (!tip) return
    window.addEventListener('scroll', hide, true)
    return () => window.removeEventListener('scroll', hide, true)
  }, [tip, hide])
  useEffect(() => () => clearTimeout(timer.current), [])

  const bind = (text) => ({
    onPointerEnter: (e) => { if (e.pointerType === 'mouse') show(e.currentTarget, text) },
    onPointerLeave: hide,
    onPointerDown: hide, // a click opens something: get out of the way
    onFocus: (e) => { if (e.currentTarget.matches(':focus-visible')) show(e.currentTarget, text) },
    onBlur: hide,
  })

  const node = tip && createPortal(
    <div className={`tip glass glass-strong ${tip.below ? "tip-below" : ""}`} style={{ left: tip.x, top: tip.y }} aria-hidden="true">{tip.text}</div>,
    document.body,
  )
  return { bind, node }
}
