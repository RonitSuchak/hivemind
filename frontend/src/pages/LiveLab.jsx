import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getLiveLabSaved, getTutors, isLive, liveLabUrl } from '../api.js'
import { useLoad, usePageTitle, useStatus } from '../hooks.js'
import { useReduced } from '../motion.js'
import { OUTCOME, moveLabel, plainWords, tagLabel, typeName } from '../labels.js'
import { Async, SkeletonRatings } from '../components/States.jsx'
import ScoreBars from '../components/ScoreBars.jsx'
import Reveal, { RevealGroup } from '../components/Reveal.jsx'
import Icon from '../components/Icon.jsx'
import { OutcomeShape, OutcomeTag } from '../components/OutcomeShape.jsx'
import '../styles/lab.css'
import '../styles/livelab.css'

// Live lab (/lab/live/:tutorId?, docs/BACKEND.md 5.21): up to 3 simulated students taught by one demo tool, line by line.
// The page only shows what the backend sends. Every score, gain, knowledge value and outcome comes from an event.
// One reducer (reduceLab) takes every event, whatever the source: a saved replay that this page plays on a timer
// (always works, 0 AI calls), or a server stream (EventSource) when the live lab is connected.
// Tool and student text is untrusted: it is only ever rendered as React text.

// ---------- The reducer (pure; also run by a throwaway test script) ----------
export const initialLab = () => ({ started: false, order: [], byId: {}, messages: 0, scores: null, done: false })

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const clamp01 = (v) => Math.min(1, Math.max(0, v))
const blank = (id, name = '', tags = []) => ({ id, name, tags, knowledge: null, began: false, items: [], end: null })

// Change one student (created on first sight, kept in the order they arrived).
function withStudent(s, id, patch) {
  if (!id) return s
  const prev = s.byId[id] || blank(id)
  return { ...s, order: s.byId[id] ? s.order : [...s.order, id], byId: { ...s.byId, [id]: patch(prev) } }
}

// `a` is { event, data } exactly as saved or streamed. '_reset' clears the stage.
export function reduceLab(s, a) {
  const d = a?.data || {}
  switch (a?.event) {
    case '_reset': return initialLab()
    case 'start': {
      const list = Array.isArray(d.students) ? d.students.filter((x) => x && x.id) : []
      return {
        ...initialLab(), started: true,
        order: list.map((x) => x.id),
        byId: Object.fromEntries(list.map((x) => [x.id, blank(x.id, String(x.name ?? ''), Array.isArray(x.tags) ? x.tags : [])])),
      }
    }
    case 'lesson_start':
      return withStudent(s, d.student_id, (p) => ({
        ...p, began: true, name: d.student_name ? String(d.student_name) : p.name, tags: Array.isArray(d.tags) ? d.tags : p.tags,
        knowledge: num(d.knowledge) != null ? clamp01(d.knowledge) : p.knowledge,
      }))
    case 'message': {
      if (!d.student_id) return s
      const k = d.knowledge || {}
      const know = num(k.after) ?? num(k.now)
      const item = {
        kind: 'msg', from: d.from === 'tutor' ? 'tutor' : 'student', text: String(d.text ?? ''), turn: d.turn,
        move: d.label?.move ?? null, readingAge: num(d.label?.reading_age), tooHard: d.label?.too_hard === true,
        change: num(k.change),
      }
      const next = withStudent(s, d.student_id, (p) => ({ ...p, knowledge: know != null ? clamp01(know) : p.knowledge, items: [...p.items, item] }))
      return { ...next, messages: s.messages + 1 }
    }
    case 'lesson_end':
      return withStudent(s, d.student_id, (p) => ({
        ...p, end: { before: d.before, after: d.after, gain: d.gain, outcome: d.outcome, gaveUp: d.gave_up === true },
      }))
    case 'scores': return { ...s, scores: d }
    case 'done': return { ...s, done: true }
    default: return s
  }
}

// Reduced motion: "Next message" shows the next chat line plus what belongs right after it (the lesson end),
// or everything that is left once no chat line remains. Returns the new position in the list.
export function nextStop(list, pos) {
  let p = pos
  while (p < list.length && list[p].event !== 'message') p++
  if (p < list.length) p++
  while (p < list.length && list[p].event === 'lesson_end') p++
  if (!list.slice(p).some((e) => e.event === 'message')) p = list.length
  return p
}

// Wait before each saved event shows, in ms at 1x. A chat line is about 900; the structural events are quicker.
const GAP = { start: 150, lesson_start: 500, message: 900, lesson_end: 700, scores: 900, done: 300 }
const gapFor = (e, speed) => (GAP[e?.event] ?? 400) / speed

// Why this is a saved lesson, for each way a live run can fail. A refused start comes back as a plain HTTP error,
// which EventSource cannot read, so that case has no code and gets the general line.
const WHY = {
  busy: 'The live lab is busy, so this is a saved lesson.',
  budget_reached: 'Today’s free AI calls are used up, so this is a saved lesson.',
  ai_unavailable: 'The AI is not answering right now, so this is a saved lesson.',
  server_error: 'The live lab had a problem, so this is a saved lesson.',
  offline: 'The live lab is not connected, so this is a saved lesson.',
  other: 'The live lab could not start. It may be busy or out of free AI calls, so this is a saved lesson.',
}

// ---------- Page ----------
export default function LiveLab() {
  usePageTitle('Live lab')
  const { tutorId } = useParams()
  const load = useLoad(() => getTutors(), [])
  return (
    <Async state={load} label="Loading the demo tools" skeleton={<SkeletonRatings />} className="lab-body">
      {(tutors) => <Body tutors={tutors} tutorId={tutorId} />}
    </Async>
  )
}

function Body({ tutors, tutorId }) {
  const builtIn = (Array.isArray(tutors) ? tutors : []).filter((t) => t.kind === 'built_in')
  // A hidden tool (or an unknown one) is not in the list, so the address falls back to the first tool.
  const tutor = builtIn.find((t) => t.tutor_id === tutorId) || builtIn[0]
  return (
    <div className="lx-ratings ll">
      <section className="lx-sec" aria-labelledby="ll-h">
        <div className="lx-sec-head">
          <h2 id="ll-h">Live lab</h2>
          <p>Watch simulated students, not real children, learn from one demo tool one message at a time.</p>
        </div>
        {tutor ? (
          <>
            <nav aria-label="Choose a demo tool">
              <ul className="ll-tools">
                {builtIn.map((t) => (
                  <li key={t.tutor_id}>
                    <Link to={`/lab/live/${t.tutor_id}`} className="ll-tool" aria-current={t.tutor_id === tutor.tutor_id ? 'page' : undefined}>
                      <span className="ll-tool-type">{typeName(t.tutor_id, t.tutor_name)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            {/* key: a new demo tool starts a fresh player, and the old one stops its timer and stream */}
            <Player key={tutor.tutor_id} tutor={tutor} />
          </>
        ) : (
          <p className="lx-muted-sm" role="note">No demo tools to show right now.</p>
        )}
      </section>
    </div>
  )
}

function Player({ tutor }) {
  const id = tutor.tutor_id
  const reduced = useReduced()
  useStatus() // re-render when the lab connects or drops
  const canLive = isLive()

  const [lab, feed] = useReducer(reduceLab, undefined, initialLab)
  const [source, setSource] = useState('none') // 'none' | 'saved' | 'live'
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false) // the saved file could not be read
  const [notice, setNotice] = useState('')
  const [pos, setPos] = useState(0) // saved replay: how many events have been shown
  const [total, setTotal] = useState(0) // saved replay: how many chat lines in the file
  const [paused, setPaused] = useState(false)
  const [speed, setSpeed] = useState(1)
  const listRef = useRef([])
  const runRef = useRef(0) // bumps on every new run; late answers from an old run are ignored
  const esRef = useRef(null)

  const closeSource = () => { if (esRef.current) { esRef.current.close(); esRef.current = null } }
  // Leaving the page (or switching demo tool, which remounts this) stops the stream. Timers clean up in their effect.
  useEffect(() => () => { runRef.current++; closeSource() }, [])

  const begin = (src, why = '') => {
    const run = ++runRef.current
    closeSource()
    feed({ event: '_reset' })
    setPos(0); setPaused(false); setNotice(why); setFailed(false); setLoading(false); setSource(src)
    return run
  }

  const startSaved = useCallback((why = '') => {
    const run = begin('saved', why)
    setLoading(true)
    getLiveLabSaved(id).then((list) => {
      if (run !== runRef.current) return
      if (!Array.isArray(list) || !list.length) throw new Error('empty')
      // The saved lessons also hold safety checks. A demo tool shows none, so they are dropped here.
      const shown = list.filter((e) => e.event !== 'safety')
      listRef.current = shown
      setTotal(shown.filter((e) => e.event === 'message').length)
      setLoading(false)
    }).catch(() => {
      if (run !== runRef.current) return
      setLoading(false); setFailed(true); setSource('none')
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Only ever started by the secondary button. Any failure drops to the saved lesson with a calm one-line reason.
  const startLive = () => {
    const url = liveLabUrl({ tutorId: id, mode: 'live' })
    if (!url) { startSaved(WHY.offline); return }
    const run = begin('live')
    let es
    try { es = new EventSource(url) } catch { startSaved(WHY.other); return }
    esRef.current = es
    const current = () => run === runRef.current
    ;['start', 'lesson_start', 'message', 'lesson_end', 'scores'].forEach((name) => {
      es.addEventListener(name, (e) => {
        if (!current()) return
        let data
        try { data = JSON.parse(e.data) } catch { return }
        feed({ event: name, data })
      })
    })
    // Close on done and on error, or the browser reconnects and starts a new run.
    es.addEventListener('done', () => {
      if (!current()) return
      closeSource()
      feed({ event: 'done', data: {} })
    })
    es.addEventListener('error', (e) => {
      if (!current()) return
      closeSource()
      let code = ''
      try { code = JSON.parse(e.data)?.code || '' } catch { /* no data: the server refused or the network failed */ }
      startSaved(WHY[code] || WHY.other)
    })
  }

  const stopLive = () => { runRef.current++; closeSource(); setSource('none'); setNotice('The live run was stopped.') }

  // Saved replay clock. One timeout at a time; pause, speed, a new run and unmount all clear it.
  useEffect(() => {
    if (source !== 'saved' || loading || paused || reduced) return undefined
    const list = listRef.current
    if (pos >= list.length) return undefined
    const t = setTimeout(() => { feed(list[pos]); setPos(pos + 1) }, gapFor(list[pos], speed))
    return () => clearTimeout(t)
  }, [source, loading, paused, reduced, speed, pos])

  const step = () => {
    const list = listRef.current
    const to = nextStop(list, pos)
    list.slice(pos, to).forEach((e) => feed(e))
    setPos(to)
  }

  const savedActive = source === 'saved'
  const liveRunning = source === 'live' && !lab.done
  const finishedAll = lab.done
  const stepsLeft = savedActive && !loading && pos < listRef.current.length

  let status = 'Ready. Nothing is playing yet.'
  if (loading) status = 'Loading the saved lessons.'
  else if (failed) status = 'The saved lessons did not load.'
  else if (source !== 'none' || lab.started) {
    const kind = source === 'live' ? 'Live run' : source === 'saved' ? 'Saved lesson' : 'Stopped'
    const count = lab.messages ? `Message ${lab.messages}${savedActive && total ? ` of ${total}` : ''}.` : 'Starting.'
    status = `${kind}. ${finishedAll ? `Finished after ${lab.messages} messages.` : count}${paused && !finishedAll && source === 'saved' ? ' Paused.' : ''}`
  }

  return (
    <>
      <section className="ll-controls glass" aria-labelledby="ll-play-h">
        <h3 id="ll-play-h" className="sr-only">Play controls</h3>
        <div className="ll-btns">
          {savedActive ? (
            <>
              {reduced ? (
                <button type="button" className="btn btn-primary" onClick={step} disabled={!stepsLeft}>
                  <Icon name="skipfwd" size={16} /> Next message
                </button>
              ) : (
                <button type="button" className="btn btn-primary" onClick={() => setPaused((p) => !p)} disabled={loading || finishedAll}>
                  {paused ? 'Resume' : 'Pause'}
                </button>
              )}
              {!reduced && (
                <div className="ll-speed" role="group" aria-label="Speed">
                  {[1, 2].map((v) => (
                    <button key={v} type="button" className="btn btn-small" aria-pressed={speed === v} onClick={() => setSpeed(v)}>{v}x</button>
                  ))}
                </div>
              )}
              <button type="button" className="btn" onClick={() => startSaved()} disabled={loading}>Restart</button>
            </>
          ) : liveRunning ? (
            <>
              <button type="button" className="btn" onClick={stopLive}>Stop the live run</button>
              <button type="button" className="btn btn-primary" onClick={() => startSaved()}>
                <Icon name="play" size={16} /> Replay saved lessons
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => startSaved()}>
              <Icon name="play" size={16} /> Replay saved lessons
            </button>
          )}
        </div>
        {canLive && !liveRunning && (
          <div className="ll-live">
            <button type="button" className="btn btn-small" onClick={startLive}>Run live with real AI</button>
            <p className="lx-muted-sm"><Icon name="warn" size={14} /> This uses real AI calls, and the free limit is shared. Saved lessons use none.</p>
          </div>
        )}
        {notice && <p className="ll-notice" role="note"><Icon name="info" size={16} /> <span>{notice}</span></p>}
        {failed && <p className="ll-notice" role="alert"><Icon name="warn" size={16} /> <span>The saved lessons did not load. Try again.</span></p>}
        <p className="ll-status" role="status">{status}</p>
      </section>

      <section className="ll-stage-sec" aria-labelledby="ll-stage-h">
        <h3 id="ll-stage-h" className="sr-only">The lessons</h3>
        {lab.started && lab.order.length ? (
          <ul className={`ll-stage ${reduced ? 'll-still' : ''}`} aria-live="off" style={{ '--ll-n': Math.min(3, lab.order.length) }}>
            {lab.order.map((sid) => <Column key={sid} s={lab.byId[sid]} toolName={typeName(id, tutor.tutor_name)} reduced={reduced} />)}
          </ul>
        ) : (
          <div className="ll-empty glass">
            <Icon name="chat" size={22} />
            <p>{source === 'live' ? 'Waiting for the live lab to start. This can take a few seconds.' : loading ? 'Getting the lessons ready.' : 'Press Replay saved lessons to watch up to 3 simulated students learn.'}</p>
          </div>
        )}
      </section>

      {lab.scores && <Finish scores={lab.scores} id={id} />}
    </>
  )
}

// One simulated student: name, tags, a knowledge bar, the chat as it arrives, then how the lesson ended.
function Column({ s, toolName, reduced }) {
  const scroller = useRef(null)
  const n = s.items.length
  // Scroll the chat box, never the page. Instant under reduced motion.
  useEffect(() => {
    const el = scroller.current
    if (el && n) el.scrollTo({ top: el.scrollHeight, behavior: reduced ? 'auto' : 'smooth' })
  }, [n, reduced])
  const pct = s.knowledge == null ? 0 : Math.round(s.knowledge * 100)
  const hid = `ll-col-${s.id}`
  return (
    <li className="ll-col glass" aria-labelledby={hid}>
      <header className="ll-col-head">
        <h4 id={hid}>{s.name || 'Student'}</h4>
        <p className="lx-muted-sm">Simulated student</p>
        {s.tags.length > 0 && (
          <ul className="lx-chips" aria-label="Learning profile">
            {s.tags.map((t) => <li key={t} className="lx-chip">{tagLabel(t)}</li>)}
          </ul>
        )}
      </header>

      <div className="ll-know">
        <p className="ll-know-row"><span>Knowledge so far</span><span className="ll-know-num">{s.knowledge == null ? 'Not shown yet' : `${pct}%`}</span></p>
        <div className="ll-track" role="meter" aria-label={`${s.name || 'Student'}'s knowledge`} aria-valuemin={0} aria-valuemax={100}
          aria-valuenow={pct} aria-valuetext={`${pct} percent`}>
          <span className="ll-fill" style={{ transform: `scaleX(${s.knowledge ?? 0})` }} />
        </div>
      </div>

      {n > 0 ? (
        <div className="ll-scroll" ref={scroller} tabIndex={0} role="region" aria-label={`Lesson with ${s.name || 'the student'}`}>
          <ol className="lx-chat">
            {s.items.map((m, i) => <Line key={i} m={m} who={m.from === 'tutor' ? toolName : s.name || 'Student'} />)}
          </ol>
        </div>
      ) : (
        <p className="lx-muted-sm ll-wait">{s.began ? 'The lesson is starting.' : 'Waiting for this lesson.'}</p>
      )}

      {s.end && (
        <div className="ll-end">
          <p className="lx-ba" aria-label={`Test score ${s.end.before} before, ${s.end.after} after, out of 10`}>
            <span className="lx-ba-num">{s.end.before}</span>
            <Icon name="arrow" size={20} />
            <span className="lx-ba-num">{s.end.after}</span>
            <span className="lx-ba-of">of 10</span>
          </p>
          <p className="lx-ba-gain">Gained {s.end.gain} {s.end.gain === 1 ? 'point' : 'points'}</p>
          <OutcomeTag outcome={s.end.outcome} />
          {s.end.gaveUp && <p className="lx-muted-sm">Gave up before the lesson ended.</p>}
        </div>
      )}
    </li>
  )
}

// Same markup as the chat in StudentChat.jsx.
function Line({ m, who }) {
  const isTutor = m.from === 'tutor'
  return (
    <li className="lx-msg" data-from={m.from}>
      <p className="lx-msg-meta">
        <span className="lx-msg-who">{who}</span>
        {isTutor && m.move && <span className="lx-move">{moveLabel(m.move)}</span>}
        {isTutor && m.readingAge != null && <span className="lx-reading">Reading age {m.readingAge}</span>}
        {isTutor && m.tooHard && <span className="ll-toohard"><Icon name="warn" size={12} /> Too hard to read</span>}
        {isTutor && m.change != null && m.change !== 0 && <span className="ll-know-chg">Knowledge {m.change > 0 ? '+' : '-'}{Math.abs(Math.round(m.change * 100))}%</span>}
      </p>
      <p className="lx-msg-text">{m.text}</p>
    </li>
  )
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

function Finish({ scores, id }) {
  const sum = scores.summary || {}
  const sample = Number.isFinite(scores.sample) ? scores.sample : null
  const sampleTitle = sample === 1 ? 'This student' : sample ? `These ${sample} students` : 'These students'
  return (
    <section className="ll-finish" aria-labelledby="ll-fin-h">
      <Reveal className="lx-sec-head">
        <h3 id="ll-fin-h">How the demo tool scored</h3>
        <p>The first card scores only the students you just watched. The second scores the whole class of 30.</p>
      </Reveal>
      <RevealGroup className="ll-results">
        <Reveal as="article" blur={false} className="glass ll-score-card" aria-labelledby="ll-fin-a">
          <h4 id="ll-fin-a">{sampleTitle}</h4>
          {scores.scores ? <ScoreBars scores={scores.scores} grow play /> : <p className="lx-muted-sm">No scores for the sample.</p>}
        </Reveal>
        <Reveal as="article" blur={false} className="glass ll-score-card" aria-labelledby="ll-fin-b">
          <h4 id="ll-fin-b">Full class of 30</h4>
          {scores.official_scores ? <ScoreBars scores={scores.official_scores} grow play /> : <p className="lx-muted-sm">The full class run is not finished yet.</p>}
        </Reveal>
      </RevealGroup>
      <Reveal blur={false} className="glass ll-wrap">
        {scores.note && <p className="ll-note"><Icon name="info" size={18} /> <span>{plainWords(scores.note)}</span></p>}
        <ul className="ll-summary" aria-label="How the students did">
          {['learned', 'a_little', 'left_behind'].map((k) => (
            <li key={k}><OutcomeShape outcome={k} size={18} /> {sum[k] ?? 0} {OUTCOME[k]}</li>
          ))}
          {sum.avg_gain != null && <li>Average gain {plural(sum.avg_gain, 'point', 'points')}</li>}
        </ul>
        <div className="ll-links">
          <Link className="btn btn-small" to={`/lab?tutor=${encodeURIComponent(id)}`}>See the full class <Icon name="arrow" size={16} className="icon-nudge" /></Link>
          <Link className="btn btn-small" to={`/lab/report/${encodeURIComponent(id)}`}>Maker report <Icon name="arrow" size={16} className="icon-nudge" /></Link>
        </div>
      </Reveal>
    </section>
  )
}
