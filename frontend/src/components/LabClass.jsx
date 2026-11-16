import { useEffect, useMemo, useRef, useState } from 'react'
import { animate, motion, useMotionValue, useMotionValueEvent, useSpring, useTransform } from 'motion/react'
import { tokenMs } from '../hooks.js'
import { spring, useReduced } from '../motion.js'
import { OUTCOME, OUTCOME_ORDER, OUTCOME_PHRASE } from '../labels.js'
import { useTooltip } from './Tooltip.jsx'
import { OutcomeShape } from './OutcomeShape.jsx'
import Icon from './Icon.jsx'

// The class of 30 and its fast-forward replay (Lab only).
//
// One clock drives everything: `clock` runs 0 -> total ms (--replay-total). Each tutor message is one
// step of `stepMs`. A seat's knowledge glides between its real values (before/10, then progress[]),
// starting --stagger-dot later than the seat before it, so the class ripples. A student settles one
// step after their own last message: the knowledge disc gives way to their outcome shape and the
// counts tick up. React state only changes when a seat settles or the message number changes.
// Reduced motion: no clock animation; "Next message" sets the clock to whole steps.

// `progress` is the student's knowledge at the start and after each demo tool message (BACKEND.md 5.4).
const values = (r) => (r.progress.length ? r.progress : [r.before / 10])
const messages = (r) => Math.max(0, r.progress.length - 1)
const easeStep = (f) => 0.5 * f + 0.5 * (f < 0.5 ? 2 * f * f : 1 - 2 * (1 - f) * (1 - f)) // gentle beat per message
function knowledgeAt(vals, s) {
  if (s <= 0) return vals[0]
  const last = vals.length - 1
  if (s >= last) return vals[last]
  const i = Math.floor(s)
  return vals[i] + (vals[i + 1] - vals[i]) * easeStep(s - i)
}

function useTimeline(results, reduced) {
  return useMemo(() => {
    const N = Math.max(1, ...results.map(messages))
    const lastStep = N + (reduced ? 0 : 1)
    const total = tokenMs('--replay-total', 5400)
    const stagger = reduced ? 0 : tokenMs('--stagger-dot', 14)
    const tail = reduced ? 0 : (results.length - 1) * stagger + tokenMs('--dur-ui', 240) + 200
    const stepMs = reduced ? 1000 : Math.max(160, (total - tail) / lastStep)
    const offset = (i) => i * stagger
    const settleAt = results.map((r, i) => offset(i) + (messages(r) + (reduced ? 0 : 1)) * stepMs)
    const order = results.map((r, i) => [settleAt[i], i]).sort((a, b) => a[0] - b[0])
    return { N, total: reduced ? N * stepMs : total, stepMs, offset, settleAt, order }
  }, [results, reduced])
}

export default function ClassPanel({ run, students, openId, onOpen, busy }) {
  const reduced = useReduced()
  const tip = useTooltip()
  const results = run.results
  const tl = useTimeline(results, reduced)
  const clock = useMotionValue(0)
  const ctrl = useRef(null)
  const [phase, setPhase] = useState('idle') // idle | playing | stepping
  const [done, setDone] = useState(false)
  const [gen, setGen] = useState(0)
  const [settledN, setSettledN] = useState(0)
  const [msg, setMsg] = useState(0)
  const live = phase !== 'idle'

  const sync = (v) => {
    let n = 0
    while (n < tl.order.length && tl.order[n][0] <= v + 0.5) n++
    setSettledN(n)
    setMsg(Math.min(tl.N, Math.max(0, Math.floor((v + 0.5) / tl.stepMs))))
  }
  useMotionValueEvent(clock, 'change', sync)

  // A new tutor (or a change in motion preference) ends any replay.
  useEffect(() => () => ctrl.current?.stop(), [])
  useEffect(() => {
    ctrl.current?.stop()
    setPhase('idle'); setDone(false); clock.set(0)
  }, [run.tutor_id, reduced, clock])

  const start = () => {
    if (live && !reduced) return
    ctrl.current?.stop()
    setGen((g) => g + 1); setDone(false)
    clock.jump(0); sync(0)
    if (reduced) { setPhase('stepping'); return }
    setPhase('playing')
    ctrl.current = animate(clock, tl.total, {
      duration: tl.total / 1000, ease: 'linear',
      onComplete: () => { setPhase('idle'); setDone(true) },
    })
  }
  const stop = () => { ctrl.current?.stop(); setPhase('idle') }
  const next = () => {
    if (msg >= tl.N) { setPhase('idle'); setDone(true); return }
    clock.set((msg + 1) * tl.stepMs)
  }

  const settled = useMemo(() => new Set(tl.order.slice(0, settledN).map(([, i]) => i)), [tl, settledN])
  const counts = live
    ? Object.fromEntries(OUTCOME_ORDER.map((o) => [o, results.filter((r, i) => r.outcome === o && settled.has(i)).length]))
    : run.summary
  const byId = useMemo(() => Object.fromEntries(students.map((s) => [s.id, s])), [students])
  const progress = useTransform(clock, (v) => `scaleX(${Math.min(1, v / tl.total)})`)
  const label = phase === 'playing' ? 'Replaying' : done ? 'Replay again' : 'Replay lesson'

  return (
    <>
      <div className="lx-class-head">
        <div className="lx-class-title">
          <h3 id="class-h">The class of {results.length}</h3>
          <p className="lx-note">Simulated students, not real children.</p>
        </div>
        <div className="lx-replay">
          {phase === 'stepping' && (
            <button className="btn btn-small btn-primary" onClick={next}>
              {msg >= tl.N ? 'Finish' : 'Next message'} <Icon name="arrow" size={16} className="icon-nudge" />
            </button>
          )}
          {live
            ? <button className="btn btn-small btn-quiet" onClick={stop}><Icon name="close" size={16} /> Stop</button>
            : <button className="btn btn-small btn-primary lx-replay-btn" onClick={start} disabled={busy}><Icon name="play" size={16} /> {label}</button>}
        </div>
      </div>

      <div className="lx-status" data-live={live}>
        {live ? (
          <div className="lx-progress" aria-live={phase === 'stepping' ? 'polite' : undefined}>
            <span className="lx-progress-text">{msg === 0 ? 'Before the lesson' : <>Message <b>{msg}</b> of {tl.N}</>}</span>
            <span className="lx-progress-track" aria-hidden="true">
              {reduced
                ? <span className="lx-progress-fill" style={{ transform: `scaleX(${msg / tl.N})` }} />
                : <motion.span className="lx-progress-fill" style={{ transform: progress }} />}
            </span>
          </div>
        ) : (
          <p className="lx-hint">{done ? 'Replay finished. Select a student to see how they did.' : 'Select a student to see how they did, or replay the class.'}</p>
        )}
      </div>

      <ul className="lx-seats" aria-label="Students" data-live={live} aria-busy={busy || undefined}>
        {results.map((r, i) => {
          const s = byId[r.student_id]
          if (!s) return null
          return (
            <Seat key={r.student_id} i={i} r={r} s={s} tl={tl} clock={clock} live={live} on={settled.has(i)}
              selected={openId === r.student_id} onOpen={onOpen} tip={tip} />
          )
        })}
      </ul>
      <span className="sr-only" role="status">{done ? 'Replay finished.' : ''}</span>

      <div className="lx-tally">
        <ul className="lx-counts" aria-label="How the class did">
          {OUTCOME_ORDER.map((o) => (
            <li key={o}>
              <OutcomeShape outcome={o} size={22} />
              <Count key={`${o}-${gen}`} value={counts[o] ?? 0} />
              <span className="lx-count-label">{OUTCOME[o]}</span>
            </li>
          ))}
        </ul>
        <p className="lx-gain">Average gain <b>{run.summary.avg_gain.toFixed(1)}</b> of 10 points · tested {run.tested_on}</p>
      </div>
      {tip.node}
    </>
  )
}

function Seat({ i, r, s, tl, clock, live, on, selected, onOpen, tip }) {
  const vals = useMemo(() => values(r), [r])
  const level = useTransform(clock, (v) => {
    const k = knowledgeAt(vals, (v - tl.offset(i)) / tl.stepMs)
    return `translateY(${((1 - Math.max(0, Math.min(1, k))) * 100).toFixed(2)}%)`
  })
  const state = live && !on ? 'learning' : 'settled'
  const name = `${s.name} ${OUTCOME_PHRASE[r.outcome]}: score ${r.before} to ${r.after} out of 10`
  return (
    <li style={{ '--i': i }}>
      <button className="lx-seat" data-state={state} data-selected={selected || undefined}
        onClick={() => onOpen(r.student_id)} aria-haspopup="dialog" aria-label={name} {...tip.bind(name)}>
        <span className="lx-seat-orb">
          <span className="lx-know" aria-hidden="true"><motion.span className="lx-know-level" style={{ transform: level }} /></span>
          <OutcomeShape key={r.outcome} outcome={r.outcome} className="lx-seat-shape" />
        </span>
        <span className="lx-seat-name">{s.name}</span>
      </button>
    </li>
  )
}

// A count that springs to its new value (so it settles rather than flips). Starts where it mounts.
function Count({ value }) {
  const reduced = useReduced()
  const mv = useSpring(value, spring('ui'))
  const shown = useTransform(mv, (v) => Math.round(v))
  useEffect(() => { mv.set(value) }, [mv, value])
  return <span className="lx-count-num">{reduced ? value : <motion.span>{shown}</motion.span>}</span>
}
