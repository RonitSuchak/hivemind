import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useIsPresent } from 'motion/react'
import { spring, useReduced } from '../motion.js'
import Icon from './Icon.jsx'

const FOCUSABLE = 'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])'

// Side drawer (frosted glass): Escape closes, focus stays inside, focus returns to what opened it.
// Springs in from the right and back out the same way (faster on the way out); the scrim fades.
// Interruptible: reopening mid-exit reverses from wherever it is. Rendered in <body> so no page
// transform or sticky header can trap or cover it. While it leaves, it keeps its last content.
export default function Drawer({ open, onClose, title, subtitle, children }) {
  const panel = useRef(null)
  const last = useRef({})
  if (open) last.current = { title, subtitle, children }
  const view = open ? { title, subtitle, children } : last.current

  // Focus, scroll lock and focus return follow `open`, not the end of the exit animation.
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panel.current?.focus()
    return () => {
      document.body.style.overflow = overflow
      if (prev && prev.focus) prev.focus()
    }
  }, [open])

  const onKey = (e) => {
    if (!open) return
    if (e.key === 'Escape') { e.stopPropagation(); onClose() }
    if (e.key !== 'Tab' || !panel.current) return
    const els = [...panel.current.querySelectorAll(FOCUSABLE)]
    if (!els.length) return
    const first = els[0], lastEl = els[els.length - 1]
    if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { e.preventDefault(); lastEl.focus() }
    else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus() }
  }

  return createPortal(
    <AnimatePresence>
      {open && <Panel key="drawer" panel={panel} view={view} onClose={onClose} onKey={onKey} />}
    </AnimatePresence>,
    document.body,
  )
}

function Panel({ panel, view, onClose, onKey }) {
  const present = useIsPresent()
  const reduced = useReduced()
  // Reduced motion: no slide, a short fade instead.
  const off = reduced ? { opacity: 0 } : { x: '100%' }
  const on = reduced ? { opacity: 1 } : { x: 0 }
  return (
    <div className="drawer-root" onKeyDown={onKey} style={present ? undefined : { pointerEvents: 'none' }}>
      <motion.div className="drawer-backdrop" onClick={onClose}
        initial={{ opacity: 0 }} animate={{ opacity: 1, transition: spring('drawer') }} exit={{ opacity: 0, transition: spring('drawer-out') }} />
      <motion.aside className="drawer glass glass-strong" role="dialog" aria-modal="true" aria-labelledby="drawer-title" tabIndex={-1} ref={present ? panel : undefined}
        inert={present ? undefined : ''}
        initial={off} animate={{ ...on, transition: spring('drawer') }} exit={{ ...off, transition: spring('drawer-out') }}>
        <header className="drawer-head">
          <div>
            <h2 id="drawer-title">{view.title}</h2>
            {view.subtitle && <p className="muted">{view.subtitle}</p>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </header>
        <div className="drawer-body">{view.children}</div>
      </motion.aside>
    </div>
  )
}
