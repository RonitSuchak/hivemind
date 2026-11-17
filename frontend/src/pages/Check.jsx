import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { getCheck, isFallback, postMatch } from '../api.js'
import { useLoad, usePageTitle, useStatus } from '../hooks.js'
import { useMatch } from '../store.jsx'
import { LANGUAGES } from '../data/languages.js'
import { EXAMPLE_STUDENTS } from '../data/exampleStudents.js'
import { spring } from '../motion.js'
import { Async } from '../components/States.jsx'
import StepSwap from '../components/StepSwap.jsx'
import { SwapText } from '../components/Swap.jsx'
import Icon from '../components/Icon.jsx'
import TopicPicker from '../components/TopicPicker.jsx'
import { buildSteps, estimate, hasChallenge, isTimed, languageQuestions, lengthLine, makeCheck, readingQuestions } from '../at/check-plan.js'
import { kitFor } from '../data/kit.js'
import { median } from '../at/pace.js'
import '../styles/advisor.css'
import '../at/check-extra.css'

// The five numbers in a learning profile, and what the lab works each one out from (the lab does the sums,
// not this page; see docs/BACKEND.md 5.7 and 5.8):
//   level        the first quiz, before any teaching
//   speed        the second quiz, after the mini-lesson
//   reading      the reading questions (every answer is in the text)
//   english      the student's own rating of how confident they are reading English
//   persistence  how many questions they skip
// Demo topic packs add two TRIAL parts the lab does not score yet: language questions and one hard question
// with hints. They are marked as trials on screen and are never sent.
const MEASURES = {
  level: { label: 'What you already know', chip: 'Measures: what you already know', icon: 'chart', how: 'A short quiz before any teaching.' },
  speed: { label: 'How fast you pick up new ideas', chip: 'Measures: how fast you pick up a new idea', icon: 'clock', how: 'A mini-lesson, then a second quiz.' },
  reading: { label: 'Reading', chip: 'Measures: reading', icon: 'book', how: 'Short texts. Every answer is in the text.' },
  english: { label: 'English', chip: 'Measures: reading in English (your own rating)', icon: 'chat', how: 'Your own rating of how confident you are reading English.' },
  persistence: { label: 'Staying power', chip: 'Measures: staying power', icon: 'spark', how: 'How many questions you skip. Skipping lowers this number.' },
}
const TRIAL = 'Trial question: not scored yet'
// Plain words for the points of the 1 to 5 English rating (the question and the scale itself come from the lab).
const ANCHORS = { 1: 'I need a translator', 3: 'I follow most of it', 5: 'As easy as my first language' }

// The steps, the plan and the length of the check live in at/check-plan.js.

// How each number is measured in the check that is about to start. A pack's trial parts are named as trials.
function howFor(id, c, ready) {
  if (ready && id === 'english' && languageQuestions(c).length) return `${MEASURES.english.how} Plus trial questions on exam words, not scored yet.`
  if (ready && id === 'persistence' && hasChallenge(c)) return `${MEASURES.persistence.how} Plus one hard trial question with hints, not scored yet.`
  return MEASURES[id].how
}

const scale = (q) => Array.from({ length: Math.max(2, (q.max ?? 5) - (q.min ?? 1) + 1) }, (_, k) => (q.min ?? 1) + k)

export default function Check() {
  usePageTitle('The check')
  const load = useLoad(getCheck, [])
  const offline = useStatus() === 'demo' && isFallback() // lab unreachable: only the saved example is possible
  if (offline) return <CheckOff saved />
  return (
    <Async state={load} label="Loading the check" unavailable={<CheckOff />}>
      {(check) => <Flow base={check} />}
    </Async>
  )
}

// No lab: the same calm card, with empty answer rows where the questions would be.
function CheckOff({ saved }) {
  const nav = useNavigate()
  const { setMatch } = useMatch()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  // In this mode the match is one fixed saved example. The results page labels it, so it is stored as returned.
  async function showSaved() {
    setBusy(true); setError(null)
    try {
      setMatch(await postMatch({}))
      nav('/results')
    } catch (e) {
      setError(e); setBusy(false)
    }
  }
  return (
    <div className="ck">
      <div className="ck-top" aria-hidden="true">
        <div className="ck-meta"><span>The check</span></div>
        <div className="ck-progress ck-progress-off" />
      </div>
      <div className="ck-card ck-off glass" role="note">
        <h1>{saved ? 'The check needs the live lab' : 'The check is not available'}</h1>
        <p className="ck-sub">{saved ? 'The lab is not connected right now, so answers cannot be matched. Nothing has been asked or saved.' : 'The check needs the lab, and the lab is not connected right now. Nothing has been asked or saved.'}</p>
        {saved ? (
          <>
            {error && <p className="ck-error" role="alert"><Icon name="warn" size={18} /> <span>{error.message}</span></p>}
            <button type="button" className="btn" onClick={showSaved} disabled={busy} aria-busy={busy}>
              {busy && <span className="spinner spinner-sm" aria-hidden="true" />}See a saved example result
            </button>
          </>
        ) : <div className="ck-ghosts" aria-hidden="true">{[0, 1, 2].map((i) => <span key={i} />)}</div>}
      </div>
    </div>
  )
}

// Demo topic packs live in public/demo/topics/. A pack swaps the first quiz, the lesson and the second quiz,
// and may bring its own reading text, language questions and hard question. `default.json` only ADDS the
// language questions and hard question to the check the lab serves (demo mode only).
const packUrl = (id) => `${import.meta.env.BASE_URL}demo/topics/${id}.json`

function Flow({ base }) {
  const demo = useStatus() === 'demo'
  const live = useStatus() === 'live'
  // Topic: chosen on the first step. 'default' is the check the lab serves; other packs exist in demo mode only.
  const [topic, setTopic] = useState(null)
  const [pack, setPack] = useState(null)
  const [packError, setPackError] = useState(false)
  const canStart = useCallback((t) => t.pack === 'default' || (demo && !!t.pack), [demo])
  useEffect(() => {
    setPack(null); setPackError(false)
    if (!topic || (topic.pack === 'default' && !demo)) return
    let off = false
    const extras = topic.pack === 'default' // the lab's own check plus the demo extras: never blocks the start
    fetch(packUrl(topic.pack)).then((r) => (r.ok ? r.json() : Promise.reject())).then((p) => {
      if (off) return
      if (extras || (Array.isArray(p.quiz_1) && Array.isArray(p.quiz_2) && Array.isArray(p.mini_lesson))) setPack(p); else setPackError(true)
    }).catch(() => { if (!off && !extras) setPackError(true) })
    return () => { off = true }
  }, [topic, demo])
  // The check that will really run: the lab's check, the pack on top, shortened for one exact topic (at/check-plan.js).
  const check = useMemo(() => makeCheck(base, pack, topic), [base, pack, topic])
  const topicReady = !!topic && (topic.pack === 'default' || !!pack)
  const steps = useMemo(() => buildSteps(check), [check])
  const plan = useMemo(() => estimate(steps, check), [steps, check])
  const kit = topic ? kitFor(topic.pack) : []
  const nav = useNavigate()
  const { setMatch, languages, setPace } = useMatch()
  const speaks = languages.map((x) => LANGUAGES.find((l) => l.id === x)?.name).filter(Boolean)
  const [i, setI] = useState(0)
  const [answers, setAnswers] = useState({}) // id -> value | null (skipped)
  const [hints, setHints] = useState(0) // hints opened on the hard question
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [sendingId, setSendingId] = useState(null) // which example student is being sent
  const startedAt = useRef(null)
  // Quiet pace timer. No clock on screen. Only the two quizzes are timed: from when a question is shown to when it is
  // first answered, paused while the tab is hidden. The student can switch it off before starting.
  const [timeMe, setTimeMe] = useState(true)
  const timings = useRef({})                          // question id -> seconds to the first answer
  const clock = useRef({ id: null, spent: 0, since: null }) // the question on screen: time already spent, and when it was last shown
  const head = useRef(null)
  // The leaving copy of a step also renders a heading: only a mounted one may take the ref.
  const setHead = useCallback((el) => { if (el) head.current = el }, [])
  const dir = useRef(1)
  const step = steps[i]
  const last = i === steps.length - 1

  useEffect(() => { head.current?.focus({ preventScroll: true }) }, [i])

  useEffect(() => {
    if (!timeMe || !isTimed(step)) { clock.current = { id: null, spent: 0, since: null }; return }
    clock.current = { id: step.q.id, spent: 0, since: document.hidden ? null : performance.now() }
    const onVisible = () => {
      const c = clock.current
      if (document.hidden) { if (c.since != null) { c.spent += performance.now() - c.since; c.since = null } }
      else if (c.since == null) c.since = performance.now()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [step, timeMe])

  const answer = (id, v) => {
    const c = clock.current
    // Keep only the FIRST timing of a question: changing an answer or coming back later never replaces it.
    if (timeMe && v != null && c.id === id && timings.current[id] === undefined) timings.current[id] = (c.spent + (c.since != null ? performance.now() - c.since : 0)) / 1000
    setAnswers((a) => ({ ...a, [id]: v }))
  }
  // Pace = the median seconds per answered quiz question, or null when timing is off or fewer than 3 were timed. Memory only.
  const paceOf = (final) => {
    if (!timeMe) return null
    const t = [...check.quiz_1, ...check.quiz_2].filter((q) => final[q.id] != null && timings.current[q.id] !== undefined).map((q) => timings.current[q.id])
    return t.length >= 3 ? { median: Math.round(median(t) * 10) / 10, count: t.length } : null
  }
  const go = (d) => { dir.current = d > 0 ? 1 : -1; setI((x) => Math.max(0, Math.min(steps.length - 1, x + d))) }

  async function submit(final) {
    const val = (id) => (final[id] === undefined ? null : final[id])
    const group = (qs) => Object.fromEntries(qs.map((q) => [q.id, val(q.id)]))
    const eng = val('english')
    // Exactly the v3 request (docs/BACKEND.md 5.8). A skipped question is null; the backend counts skips itself.
    // `topic` only narrows the real tools the lab sends back to the chosen subject (it changes no score or match).
    // The language questions and the hard question (demo packs) are not sent: the lab can store them as `extras`,
    // but it does not score them, and they stay labelled as trial questions on screen.
    const advanced = /a level|ib/i.test(topic?.level || '') || !!topic?.beta
    const body = {
      ...(topic?.subject ? { topic: { subject: String(topic.subject).slice(0, 40), advanced } } : {}),
      quiz_1: group(check.quiz_1),
      quiz_2: group(check.quiz_2),
      reading: group(readingQuestions(check)),
      english_confidence: eng === null ? null : Number(eng),
      // Total time is sent only when timing is on. Pace is never sent.
      ...(timeMe ? { seconds_taken: Math.round((Date.now() - (startedAt.current ?? Date.now())) / 1000) } : {}),
    }
    setBusy(true); setError(null)
    try {
      const result = await postMatch(body)
      setPace(paceOf(final))
      // The chosen topic rides along for the results page only (which websites to suggest). It is not from the lab.
      setMatch({ ...result, topic: { subject: topic?.subject, name: topic?.name, advanced: /a level|ib/i.test(topic?.level || '') || !!topic?.beta } })
      nav('/results')
    } catch (e) {
      setError(e); setBusy(false)
    }
  }

  // An example student: preset answers go through the same request as the real check, and the result is marked.
  async function tryExample(ex) {
    setBusy(true); setSendingId(ex.id); setError(null)
    try {
      const result = await postMatch({ ...ex.answers, seconds_taken: 300 })
      setPace(null) // preset answers: no pace
      setMatch({ ...result, example: { id: ex.id, title: ex.title } })
      nav('/results')
    } catch (e) {
      setError(e); setBusy(false); setSendingId(null)
    }
  }

  const key = step.kind === 'english' ? 'english' : step.q?.id
  const answered = key && answers[key] != null
  const canNext = step.kind === 'intro' ? topicReady : step.kind === 'lesson' || answered
  const asks = step.kind === 'q' || step.kind === 'english' || step.kind === 'challenge'

  function skip() {
    const next = { ...answers, [key]: null }
    setAnswers(next)
    if (last) submit(next); else go(1)
  }
  function next() {
    if (!canNext || busy) return
    if (step.kind === 'intro') startedAt.current = Date.now()
    if (last) submit(answers); else go(1)
  }
  // Enter moves on (from an answer row too). Selecting an answer never moves on by itself:
  // arrow keys change the selection.
  function onKeyDown(e) {
    if (e.key === 'Enter' && e.target.type === 'radio') { e.preventDefault(); next() }
    if (e.key === 'Enter' && e.target.getAttribute?.('role') === 'combobox') e.preventDefault()
  }

  const pct = Math.round((i / (steps.length - 1)) * 100)
  const measure = MEASURES[step.measure]
  const eq = check.english_question
  const anchored = !!eq && (eq.min ?? 1) === 1 && (eq.max ?? 5) === 5 // the plain anchors below fit a 1 to 5 scale only
  const count = step.of ? `Question ${step.n} of ${step.of}` : step.kind === 'intro' ? (topicReady ? `${steps.length - 1} steps` : '') : ''

  return (
    <form className="ck" onSubmit={(e) => { e.preventDefault(); next() }} onKeyDown={onKeyDown} noValidate>
      <div className="ck-top">
        <div className="ck-meta">
          <SwapText text={step.part} />
          <SwapText text={count} />
        </div>
        <div className="ck-progress" role="progressbar" aria-label="Progress through the check" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
          <motion.span initial={false} animate={{ transform: `scaleX(${Math.max(pct, 1.5) / 100})` }} transition={spring('ui')} />
        </div>
        {measure && (
          <p className="ck-measure">
            <Icon name={measure.icon} size={14} />
            <SwapText text={step.trial ? TRIAL : measure.chip} />
          </p>
        )}
      </div>

      <div className="ck-card glass">
        <StepSwap id={i} dir={dir.current} className="ck-swap">
          <section className="ck-step" aria-live="polite">
            {step.kind === 'intro' && (
              <>
                <h1 ref={setHead} tabIndex={-1}>The check</h1>
                <p className="ck-sub">{topicReady ? `${plan.questions} questions · about ${plan.minutes} minutes` : 'Pick a topic, then answer a few short parts. How long it takes depends on the topic.'}</p>
                <TopicPicker value={topic} onChange={(t) => { setTopic(t); setAnswers({}); setHints(0); timings.current = {} }} canStart={canStart} />
                {packError && <p className="ck-pack-error" role="alert"><Icon name="warn" size={16} /> That topic did not load. Pick another one.</p>}
                {topicReady && (
                  <>
                    <p className="ck-length"><Icon name="list" size={16} /> {lengthLine(topic, !!check.short)}</p>
                    <div className="ck-kit" role="group" aria-labelledby="ck-kit-h">
                      <p className="ck-kit-title" id="ck-kit-h">Have these ready</p>
                      <ul className="ck-kit-list">
                        {kit.map((k) => (
                          <li key={k.id} className={k.off ? 'is-off' : ''}>
                            {k.off ? <span className="icon-wrap"><Icon name={k.icon} size={18} /></span> : <Icon name={k.icon} size={18} />}
                            {k.label}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
                <h2 className="ck-parts-title">The 5 things we measure</h2>
                <ol className="ck-how" aria-label="The 5 things we measure">
                  {Object.entries(MEASURES).map(([id, m], k) => (
                    <li key={m.label}>
                      <span className="ck-how-n" aria-hidden="true">{k + 1}</span>
                      <span className="ck-how-text"><b>{m.label}</b><span>{howFor(id, check, topicReady)}</span></span>
                      <Icon name={m.icon} size={18} />
                    </li>
                  ))}
                </ol>
                {speaks.length > 0 && <p className="ck-speaks"><Icon name="chat" size={16} /> You speak {speaks.join(', ')}.</p>}
                <ul className="ck-points">
                  <li><Icon name="skipfwd" size={18} /> You can skip any question. Skips count towards staying power.</li>
                  <li>
                    <Icon name="info" size={18} />
                    <div className="ck-timing">
                      <span>We time the quiz questions quietly to see your pace. There is no time limit.</span>
                      <label className="ck-timing-check">
                        <input type="checkbox" checked={!timeMe} onChange={(e) => { setTimeMe(!e.target.checked); timings.current = {} }} /> Don't time me
                      </label>
                      <p className="ck-timing-note">Your pace stays on this device. Switching timing off also stops the total time being sent to the lab.</p>
                    </div>
                  </li>
                  <li><Icon name="pencil" size={18} /> It is not an exam. Nobody sees a mark. Your answers only shape your profile.</li>
                </ul>
                {live && (
                  <section className="ck-examples" aria-labelledby="ck-examples-h">
                    <h2 id="ck-examples-h" className="ck-parts-title">Try an example student if you are short on time</h2>
                    <p className="ck-examples-sub">These are preset answers, not yours, sent to the lab to get a real match.</p>
                    <div className="ck-examples-list">
                      {EXAMPLE_STUDENTS.map((ex) => (
                        <button key={ex.id} type="button" className="ck-example" onClick={() => tryExample(ex)} disabled={busy} aria-busy={sendingId === ex.id}>
                          <b>{sendingId === ex.id && <span className="spinner spinner-sm" aria-hidden="true" />}{ex.title}</b>
                          <span>{ex.detail}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}

            {step.kind === 'lesson' && (
              <>
                <h1 ref={setHead} tabIndex={-1}>A new idea</h1>
                <p className="ck-sub">Read this idea first, because the next questions are only about it.</p>
                <div className="ck-lesson">
                  {check.mini_lesson.map((l, k) => <p key={k}>{l}</p>)}
                </div>
              </>
            )}

            {step.kind === 'q' && step.passage && (
              <div className="ck-passage">
                <p className="ck-passage-label">Read this first</p>
                <p>{step.passage}</p>
              </div>
            )}
            {step.kind === 'q' && (
              <fieldset className="ck-q">
                <legend ref={setHead} tabIndex={-1} className="ck-legend">{step.q.text}</legend>
                <div className="ck-choices">
                  {step.q.options.map((o) => (
                    <label className="ck-choice" key={o}>
                      <input type="radio" name={step.q.id} value={o} checked={answers[step.q.id] === o} onChange={() => answer(step.q.id, o)} />
                      <span className="ck-radio" aria-hidden="true" />
                      <span className="ck-text">{o}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            {step.kind === 'challenge' && (
              <fieldset className="ck-q ck-hard">
                <legend ref={setHead} tabIndex={-1} className="ck-legend">{step.q.text}</legend>
                <p className="ck-hard-note"><Icon name="spark" size={16} /> <span>This question is hard on purpose and is only a trial, so it does not change your results yet. You can take a hint, try it or skip it.</span></p>
                <div className="ck-choices">
                  {step.q.options.map((o) => (
                    <label className="ck-choice" key={o}>
                      <input type="radio" name={step.q.id} value={o} checked={answers[step.q.id] === o} onChange={() => answer(step.q.id, o)} />
                      <span className="ck-radio" aria-hidden="true" />
                      <span className="ck-text">{o}</span>
                    </label>
                  ))}
                </div>
                {hints > 0 && (
                  <ol className="ck-hints" aria-live="polite">
                    {step.q.hints.slice(0, hints).map((h, k) => <li key={k}><b>Hint {k + 1}</b><span>{h}</span></li>)}
                  </ol>
                )}
                {hints < step.q.hints.length && (
                  <button type="button" className="btn btn-small ck-hint-btn" onClick={() => setHints((n) => n + 1)}>
                    <Icon name="spark" size={15} /> {hints === 0 ? 'Show a hint' : 'Show another hint'}
                  </button>
                )}
              </fieldset>
            )}

            {step.kind === 'english' && (
              <fieldset className="ck-q">
                <legend ref={setHead} tabIndex={-1} className="ck-legend">{eq.text}</legend>
                <p className="ck-why"><b>Why we ask.</b> Tools that use dense English worked differently in the lab for students still learning English, so your answer changes which we show first.</p>
                <div className="ck-choices ck-scale">
                  {scale(eq).map((n, k, all) => (
                    <label className="ck-choice" key={n}>
                      <input type="radio" name="english" value={n} checked={answers.english === String(n)} onChange={() => answer('english', String(n))}
                        aria-label={anchored && ANCHORS[n] ? `${n}, ${ANCHORS[n]}` : k === 0 ? `${n}, ${eq.min_label || 'lowest'}` : k === all.length - 1 ? `${n}, ${eq.max_label || 'highest'}` : String(n)} />
                      <span className="ck-text">{n}</span>
                    </label>
                  ))}
                </div>
                {anchored ? (
                  <ul className="ck-anchors" aria-hidden="true">
                    {Object.entries(ANCHORS).map(([n, text]) => <li key={n}><b>{n}</b><span>{text}</span></li>)}
                  </ul>
                ) : <p className="ck-scale-ends" aria-hidden="true"><span>{eq.min_label}</span><span>{eq.max_label}</span></p>}
              </fieldset>
            )}
          </section>
        </StepSwap>
      </div>

      {error && (
        <div className="ck-error" role="alert">
          <Icon name="warn" size={18} /> <span>{error.message}</span>
        </div>
      )}

      <div className="ck-actions">
        <button type="button" className={`btn btn-quiet ${i === 0 ? 'ck-hide' : ''}`} onClick={() => go(-1)} disabled={i === 0 || busy}>
          <Icon name="back" size={18} /> Back
        </button>
        <div className="ck-actions-right">
          {asks && <button type="button" className="btn btn-quiet" onClick={skip} disabled={busy}>Skip</button>}
          <button type="submit" className="btn btn-primary ck-next" disabled={!canNext || busy} aria-busy={busy}>
            {busy && <span className="spinner spinner-sm" aria-hidden="true" />}
            {step.kind === 'intro' ? 'Start' : last ? 'See results' : 'Next'}
            {!busy && <Icon name="arrow" size={18} className="icon-nudge" />}
          </button>
        </div>
      </div>
      {busy && <p className="ck-status" role="status">Finding students like you…</p>}
    </form>
  )
}
