import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import Icon from './Icon.jsx'

// A 1 to 10 slider where every level has its own sentence.
// - Dragging is continuous (the knob follows your finger exactly); on release it glides to the
//   nearest level. The fill and knob are drawn by us; a real <input type="range"> sits invisibly
//   on top, so mouse, touch, keyboard and screen readers all work as normal.
// - The sentence cross-fades slowly when the level changes, and the whole line goes from faint to
//   solid as you leave level 1 ("not sure").
// value / onChange use whole levels (1..max). Level 1 means "not sure".
export default function LevelSlider({ id, label, icon, levels, value, onChange }) {
  const max = levels.length
  const [raw, setRaw] = useState(value)     // continuous position while dragging
  const [dragging, setDragging] = useState(false)
  const level = Math.min(max, Math.max(1, Math.round(raw)))

  useEffect(() => { if (!dragging) setRaw(value) }, [value, dragging])
  // Release anywhere on the page ends the drag and snaps to the nearest level.
  useEffect(() => {
    if (!dragging) return
    const up = () => { setDragging(false); setRaw((r) => Math.round(r)) }
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => { window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up) }
  }, [dragging])

  const move = (r) => { setRaw(r); const l = Math.round(r); if (l !== value) onChange(l) }
  const step = (l) => { const n = Math.min(max, Math.max(1, l)); setRaw(n); if (n !== value) onChange(n) }
  const onKey = (e) => {
    const k = e.key
    const to = k === 'ArrowRight' || k === 'ArrowUp' ? value + 1 : k === 'ArrowLeft' || k === 'ArrowDown' ? value - 1
      : k === 'PageUp' ? value + 3 : k === 'PageDown' ? value - 3 : k === 'Home' ? 1 : k === 'End' ? max : null
    if (to === null) return
    e.preventDefault(); step(to)
  }

  const p = (raw - 1) / (max - 1)
  const ink = 0.4 + 0.6 * Math.min(1, raw - 1) // faint at "not sure", solid by level 2
  const text = levels[level - 1]

  return (
    <div className={`ls${level > 1 ? ' is-set' : ''}${dragging ? ' is-dragging' : ''}`} style={{ '--p': p }}>
      <div className="ls-head">
        <label htmlFor={id}><Icon name={icon} size={16} /> {label}</label>
        <span className="ls-count" aria-hidden="true">{level}<i> / {max}</i></span>
      </div>
      <p className="ls-say" aria-hidden="true" style={{ opacity: ink }}>
        <AnimatePresence initial={false}>
          <motion.span key={level}
            initial={{ opacity: 0, y: 8, filter: 'blur(5px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, filter: 'blur(5px)' }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>
            {text}
          </motion.span>
        </AnimatePresence>
      </p>
      <div className="ls-bar">
        <span className="ls-track" aria-hidden="true">
          <span className="ls-fill" />
          {levels.map((_, i) => <i key={i} className={i + 1 <= level ? 'on' : ''} style={{ '--t': i / (max - 1) }} />)}
        </span>
        <input id={id} className="ls-input" type="range" min="1" max={max} step={dragging ? 0.01 : 1} value={raw}
          aria-valuemin={1} aria-valuemax={max} aria-valuenow={level} aria-valuetext={`${level} of ${max}: ${text}`}
          onPointerDown={() => setDragging(true)} onChange={(e) => move(Number(e.target.value))} onKeyDown={onKey}
          onBlur={() => { setDragging(false); setRaw((r) => Math.round(r)) }} />
        <span className="ls-knob" aria-hidden="true"><b>{level}</b></span>
      </div>
      <div className="ls-ends" aria-hidden="true"><span>{levels[1]}</span><span>{levels[max - 1]}</span></div>
    </div>
  )
}
