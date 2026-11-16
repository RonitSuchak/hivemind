import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useIsPresent } from 'motion/react'
import { spring, useReduced } from '../motion.js'
import { GROUPS } from '../data/tools.js'
import Icon from './Icon.jsx'
import ToolPreview from './ToolPreview.jsx'

// A centred panel with the details of one EdTech tool: what it is, an "at a glance" estimate, who it may
// suit, and the four safety checks (all "Not tested yet"). Nothing here is a lab result.
// Behaviour follows Drawer.jsx: Escape and backdrop click close it, focus stays inside while it is open,
// the page behind does not scroll, and focus goes back to the card that opened it.

const FOCUSABLE = 'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])'
const GROUP = Object.fromEntries(GROUPS.map((g) => [g.id, g]))

// The seven traits, in the order shown. `want` completes "You may like this if you want ...".
// Both are written about students in general. Nothing here says more than the 0 to 2 trait itself.
const TRAITS = [
  { key: 'beginner', label: 'Good for beginners', want: 'to start from the basics' },
  { key: 'stretch', label: 'Stretches you', want: 'harder work that pushes you' },
  { key: 'lightReading', label: 'Little reading needed', want: 'little reading' },
  { key: 'languages', label: 'Helps while learning English', want: 'help while you learn English' },
  { key: 'motivation', label: 'Keeps you going', want: 'streaks or games to keep you going' },
  { key: 'guidance', label: 'Gives hints, not just answers', want: 'hints, not just answers' },
  { key: 'selfPaced', label: 'You set the pace', want: 'to set your own pace' },
]
const LEVEL = ['Low', 'Medium', 'High']

const CHECKS = ['Misinformation', 'Algorithmic bias', 'Privacy', 'Inappropriate content']

const list = (items) => (items.length < 2 ? items[0] : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`)
const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1)

// "Who it may suit": 2 or 3 short sentences built only from the highest traits.
// Score 2 traits lead (up to 3 in the first sentence, any extra ones move to the second), then score 1 traits.
// With no score 2 trait, it says so gently. Score 0 traits are never used.
export function suitLines(traits) {
  const top = TRAITS.filter((t) => traits[t.key] === 2)
  const some = TRAITS.filter((t) => traits[t.key] === 1)
  const lines = []
  if (top.length) {
    lines.push(`You may like this if you want ${list(top.slice(0, 3).map((t) => t.want))}.`)
    const more = [...top.slice(3), ...some].slice(0, 3)
    if (more.length) lines.push(`It may also suit you if you want ${list(more.map((t) => t.want))}.`)
    lines.push('Only you can tell, so try it and see.')
  } else {
    lines.push('No strong lean either way. Try it and see.')
    if (some.length) lines.push(`You may still like it if you want ${list(some.slice(0, 3).map((t) => t.want))}.`)
  }
  return lines
}

export default function ToolPanel({ tool, opener, onClose }) {
  const open = !!tool
  const panel = useRef(null)
  const last = useRef(null)
  if (tool) last.current = tool
  const view = tool || last.current

  // Focus, scroll lock, Escape, the focus trap and focus return follow `open`, not the end of the exit animation.
  useEffect(() => {
    if (!open) return
    const prev = opener || document.activeElement
    const body = document.body
    const overflow = body.style.overflow
    const padding = body.style.paddingRight
    const gap = window.innerWidth - document.documentElement.clientWidth
    body.style.overflow = 'hidden'
    if (gap > 0) body.style.paddingRight = `${gap}px` // keep the page from jumping when the scrollbar goes
    panel.current?.focus()

    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return }
      if (e.key !== 'Tab' || !panel.current) return
      const els = [...panel.current.querySelectorAll(FOCUSABLE)]
      if (!els.length) { e.preventDefault(); return }
      const first = els[0], lastEl = els[els.length - 1], now = document.activeElement
      const inside = panel.current.contains(now)
      if (e.shiftKey && (!inside || now === first || now === panel.current)) { e.preventDefault(); lastEl.focus() }
      else if (!e.shiftKey && (!inside || now === lastEl)) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      body.style.overflow = overflow
      body.style.paddingRight = padding
      if (prev && prev.isConnected && prev.focus) prev.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return createPortal(
    <AnimatePresence>
      {open && view && <Panel key="tool-panel" panel={panel} tool={view} onClose={onClose} />}
    </AnimatePresence>,
    document.body,
  )
}

function Panel({ panel, tool, onClose }) {
  const present = useIsPresent()
  const reduced = useReduced()
  const group = GROUP[tool.group]
  const hid = `tpn-title-${tool.id}`
  // Reduced motion: no scale or lift, an instant change (no animation at all).
  const off = reduced ? { opacity: 1 } : { opacity: 0, scale: 0.96, y: 14 }
  const on = reduced ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }
  const fade = reduced ? { duration: 0 } : null

  return (
    <div className="tpn-root" style={present ? undefined : { pointerEvents: 'none' }}>
      <motion.div className="tpn-backdrop" onClick={onClose}
        initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1, transition: fade || spring('drawer') }}
        exit={{ opacity: reduced ? 1 : 0, transition: fade || spring('drawer-out') }} />
      <motion.div className="tpn-panel glass glass-strong" role="dialog" aria-modal="true" aria-labelledby={hid}
        tabIndex={-1} ref={present ? panel : undefined} inert={present ? undefined : ''}
        initial={reduced ? false : off} animate={{ ...on, transition: fade || spring('drawer') }}
        exit={{ ...off, transition: fade || spring('drawer-out') }}>
        <header className="tpn-head">
          <div className="tpn-head-text">
            <p className="tpn-kind">{tool.kind}</p>
            <h2 id={hid} className="tpn-name">{tool.name}</h2>
            {group && <span className="tpn-tag">{group.name}</span>}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </header>

        <div className="tpn-scroll" tabIndex={0}>
          <div className="tpn-intro">
            <div className="tpn-preview"><ToolPreview tool={tool} /></div>
            <section className="tpn-sec" aria-labelledby={`${hid}-sum`}>
              <h3 id={`${hid}-sum`} className="tpn-h">Summary</h3>
              <p className="tpn-text">{tool.blurb}</p>
              {group && <p className="tpn-text tpn-sub">It teaches like {group.name}: {lower(group.how)}.</p>}
            </section>
          </div>

          <section className="tpn-sec" aria-labelledby={`${hid}-glance`}>
            <h3 id={`${hid}-glance`} className="tpn-h">At a glance</h3>
            <ul className="tpn-traits">
              {TRAITS.map((t, i) => {
                const n = Math.max(0, Math.min(2, tool.traits[t.key] | 0))
                return (
                  <li key={t.key} className="tpn-trait">
                    <span className="tpn-trait-row">
                      <span className="tpn-trait-label">{t.label}</span>
                      <span className="tpn-trait-level">{LEVEL[n]}</span>
                    </span>
                    <span className="tpn-meter" aria-hidden="true">
                      <motion.span className="tpn-fill" style={{ width: `${(n / 2) * 100}%` }}
                        initial={reduced ? false : { scaleX: 0 }}
                        animate={{ scaleX: 1, transition: reduced ? { duration: 0 } : spring('bar', { delay: 0.12 + i * 0.04 }) }} />
                    </span>
                  </li>
                )
              })}
            </ul>
            <p className="tpn-note">Our estimate from the tool&rsquo;s public features. Not a lab result.</p>
          </section>

          <section className="tpn-sec" aria-labelledby={`${hid}-suit`}>
            <h3 id={`${hid}-suit`} className="tpn-h">Who it may suit</h3>
            {suitLines(tool.traits).map((l) => <p key={l} className="tpn-text">{l}</p>)}
          </section>

          <section className="tpn-sec" aria-labelledby={`${hid}-safe`}>
            <h3 id={`${hid}-safe`} className="tpn-h">Safety and risk</h3>
            <ul className="tpn-checks">
              {CHECKS.map((c) => (
                <li key={c} className="tpn-check">
                  <span className="tpn-check-name">{c}</span>
                  <span className="tpn-check-state">Not tested yet</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <footer className="tpn-foot">
          <a className="btn btn-primary" href={tool.url} target="_blank" rel="noopener noreferrer">
            Visit site <Icon name="arrow" size={16} className="icon-nudge" /><span className="sr-only"> (opens in a new tab)</span>
          </a>
          <button type="button" className="btn" onClick={onClose}>Close</button>
        </footer>
      </motion.div>
    </div>
  )
}
