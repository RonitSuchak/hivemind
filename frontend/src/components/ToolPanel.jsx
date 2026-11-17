import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useIsPresent } from 'motion/react'
import { spring, useReduced } from '../motion.js'
import { GROUPS, HELPER_RULE, helperKind } from '../data/tools.js'
import Icon from './Icon.jsx'
import ToolPreview from './ToolPreview.jsx'
import '../at/tools-film.css' // spec-sheet meters and the reviews block

// A centred panel with the details of one EdTech tool: what it is, an "at a glance" estimate, reviews (only
// ones with a source link), and the four safety checks of this one tool ("Not tested", or a link to the pilot for a piloted tool). Nothing here is a lab result.
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
// Each word is shown as a band on a 0 to 10 scale (the band is Hivemind's own reading, never one exact number).
const BAND = [[1, 3], [4, 7], [8, 10]]

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

// The one line that stays from "Who it may suit": only when the data has a top trait (score 2), and only the
// first sentence, which is built from those traits alone.
const suitLine = (traits) => (TRAITS.some((t) => traits[t.key] === 2) ? suitLines(traits)[0] : null)

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
  const helper = helperKind(tool) // a study helper has no tool type: it does not teach, so nothing stands in for it
  const group = helper ? null : GROUP[tool.group]
  const hid = `tpn-title-${tool.id}`
  // Only reviews that carry a quote, a source and a web link are shown. None are written here.
  const reviews = (Array.isArray(tool.reviews) ? tool.reviews : []).filter((r) => r && r.quote && r.source && /^https?:\/\//.test(r.url || ''))
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
            {helper && <span className="tpn-tag tpn-tag-helper">Study helper: {helper.name}</span>}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </header>

        <div className="tpn-scroll" tabIndex={0}>
          <div className="tpn-intro">
            <div className="tpn-preview"><ToolPreview tool={tool} /></div>
            <section className="tpn-sec" aria-labelledby={`${hid}-sum`}>
              <h3 id={`${hid}-sum`} className="tpn-h">Summary</h3>
              <p className="tpn-text">{tool.blurb}</p>
              {suitLine(tool.traits) && <p className="tpn-text tpn-sub">{suitLine(tool.traits)}</p>}
              {group && <p className="tpn-text tpn-sub">Tool type: {group.name}. {group.how}. Hivemind tested this type with our {group.name} demo tool, but has not tested {tool.name} itself.</p>}
              {helper && <p className="tpn-text tpn-sub">{helper.name}: {helper.how}. {HELPER_RULE}</p>}
            </section>
          </div>

          <section className="tpn-sec" aria-labelledby={`${hid}-glance`}>
            <h3 id={`${hid}-glance`} className="tpn-h">At a glance</h3>
            <ul className="tpn-spec">
              {TRAITS.map((t) => {
                const v = tool.traits?.[t.key]
                // Low / Medium / High (stored as 0, 1, 2) become a band on a 10-step meter.
                // Anything else is not shown as a score: the row says so instead of guessing.
                const known = v === 0 || v === 1 || v === 2
                const [lo, hi] = known ? BAND[v] : [0, 0]
                return (
                  <li key={t.key} className="tpn-spec-row">
                    <span className="tpn-spec-label">{t.label}</span>
                    {known ? (
                      <>
                        <span className="tpn-segs" aria-hidden="true">
                          {Array.from({ length: 10 }, (_, k) => <i key={k} data-on={k + 1 >= lo && k + 1 <= hi ? '' : undefined} />)}
                        </span>
                        <span className="tpn-spec-num"><span className="sr-only">{LEVEL[v]}, {lo} to {hi} out of 10</span><span aria-hidden="true">{lo}-{hi} / 10</span></span>
                      </>
                    ) : (
                      <span className="tpn-spec-none">Not estimated</span>
                    )}
                  </li>
                )
              })}
            </ul>
            <p className="tpn-foot-note">Hivemind&rsquo;s own reading of the tool&rsquo;s public features, on a 10-point scale. Not lab scores.</p>
          </section>

          <section className="tpn-sec" aria-labelledby={`${hid}-rev`}>
            <h3 id={`${hid}-rev`} className="tpn-h">Reviews</h3>
            {reviews.length ? (
              <ul className="tpn-reviews">
                {reviews.map((r, i) => (
                  <li key={i}>
                    <blockquote className="tpn-review">
                      <p>&ldquo;{r.quote}&rdquo;</p>
                      <cite><a href={r.url} target="_blank" rel="noopener noreferrer">{r.source}<span className="sr-only"> (opens in a new tab)</span></a></cite>
                    </blockquote>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="tpn-empty">No sourced reviews yet. Hivemind only shows reviews it can link to.</p>
            )}
          </section>

          <section className="tpn-sec" aria-labelledby={`${hid}-safe`}>
            <h3 id={`${hid}-safe`} className="tpn-h">Safety and risk</h3>
            {tool.piloted ? (
              <p className="tpn-text">
                Piloted with {tool.piloted.sample ?? 'a few'} simulated students ({list(tool.piloted.modes)}). It is a small pilot, not a rating.{' '}
                <Link to="/lab/real-tools" onClick={onClose}>See what happened</Link>
              </p>
            ) : (
            <ul className="tpn-checks">
              {CHECKS.map((c) => (
                <li key={c} className="tpn-check">
                  <span className="tpn-check-name">{c}</span>
                  <span className="tpn-check-state">Not tested</span>
                </li>
              ))}
            </ul>
            )}
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
