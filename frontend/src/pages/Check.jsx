import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { getCheck, postMatch } from '../api.js'
import { useLoad, usePageTitle, useStatus } from '../hooks.js'
import { useMatch } from '../store.jsx'
import { LANGUAGES } from '../data/languages.js'
import { spring } from '../motion.js'
import { Async } from '../components/States.jsx'
import StepSwap from '../components/StepSwap.jsx'
import { SwapText } from '../components/Swap.jsx'
import Icon from '../components/Icon.jsx'
import TopicPicker from '../components/TopicPicker.jsx'
import '../styles/advisor.css'

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
  english: { label: 'Language', chip: 'Measures: language', icon: 'chat', how: 'Your own rating of how confident you are reading English.' },
  persistence: { label: 'Staying power', chip: 'Measures: staying power', icon: 'spark', how: 'How many questions you skip. Skipping lowers this number.' },
}
const TRIAL = 'Trial question: not scored yet'

// v3 check: quiz_1, mini_lesson, quiz_2, reading (a list of passages) and one english_question object.
// Demo packs may add `english_questions` (a list) and `challenge` (one hard question with hints).
function buildSteps(c) {
  const steps = [{ kind: 'intro', part: 'Before you start' }]
  c.quiz_1.forEach((q, i) => steps.push({ kind: 'q', part: 'Part 1 · What you know', measure: 'level', q, n: i + 1, of: c.quiz_1.length }))
  steps.push({ kind: 'lesson', part: 'Part 2 · A new idea', measure: 'speed' })
  c.quiz_2.forEach((q, i) => steps.push({ kind: 'q', part: 'Part 2 · A new idea', measure: 'speed', q, n: i + 1, of: c.quiz_2.length }))
  const rq = readingQuestions(c)
  rq.forEach((q, i) => steps.push({ kind: 'q', part: 'Part 3 · Reading', measure: 'reading', q, n: i + 1, of: rq.length, passage: q.passage }))
  const lq = languageQuestions(c)
  lq.forEach((q, i) => steps.push({ kind: 'q', part: 'Part 4 · Language', measure: 'english', trial: true, q, n: i + 1, of: lq.length }))
  if (c.english_question) steps.push({ kind: 'english', part: 'Part 4 · Language', measure: 'english' })
  if (hasChallenge(c)) steps.push({ kind: 'challenge', part: 'Part 5 · Staying power', measure: 'persistence', trial: true, q: c.challenge })
  return steps
}

// How each number is measured in the check that is about to start. A pack's trial parts are named as trials.
function howFor(id, c, ready) {
  if (ready && id === 'english' && languageQuestions(c).length) return `${MEASURES.english.how} Plus trial questions on exam words, not scored yet.`
  if (ready && id === 'persistence' && hasChallenge(c)) return `${MEASURES.persistence.how} Plus one hard trial question with hints, not scored yet.`
  return MEASURES[id].how
}
const languageQuestions = (c) => (Array.isArray(c.english_questions) ? c.english_questions.filter((q) => q?.id && q.options?.length) : [])
const hasChallenge = (c) => !!(c.challenge?.id && c.challenge.options?.length && Array.isArray(c.challenge.hints))

// Every reading question, each remembering the passage it belongs to.
const scale = (q) => Array.from({ length: Math.max(2, (q.max ?? 5) - (q.min ?? 1) + 1) }, (_, k) => (q.min ?? 1) + k)
const readingQuestions = (c) => (c.reading || []).flatMap((p) => (p.questions || []).map((q) => ({ ...q, passage: p.passage })))

export default function Check() {
  usePageTitle('The check')
  const load = useLoad(getCheck, [])
  return (
    <Async state={load} label="Loading the check" unavailable={<CheckOff />}>
      {(check) => <Flow base={check} />}
    </Async>
  )
}

// No lab: the same calm card, with empty answer rows where the questions would be.
function CheckOff() {
  return (
    <div className="ck">
      <div className="ck-top" aria-hidden="true">
        <div className="ck-meta"><span>The check</span></div>
        <div className="ck-progress ck-progress-off" />
      </div>
      <div className="ck-card ck-off glass" role="note">
        <h1>The check is not available</h1>
        <p className="ck-sub">The check needs the lab, and the lab is not connected right now. Nothing has been asked or saved.</p>
        <div className="ck-ghosts" aria-hidden="true">{[0, 1, 2].map((i) => <span key={i} />)}</div>
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
  const check = useMemo(() => {
    if (!pack) return base
    const own = {}
    for (const k of ['quiz_1', 'mini_lesson', 'quiz_2', 'english_questions']) if (Array.isArray(pack[k]) && pack[k].length) own[k] = pack[k]
    // A pack's reading is one passage with its questions; the lab's is a list of passages.
    if (pack.reading?.passage && pack.reading.questions?.length) own.reading = [{ id: 'pack', ...pack.reading }]
    else if (Array.isArray(pack.reading) && pack.reading.length) own.reading = pack.reading
    if (pack.challenge) own.challenge = pack.challenge
    return { ...base, ...own }
  }, [base, pack])
  const topicReady = !!topic && (topic.pack === 'default' || !!pack)
  const steps = useMemo(() => buildSteps(check), [check])
  const nav = useNavigate()
  const { setMatch, languages } = useMatch()
  const speaks = languages.map((x) => LANGUAGES.find((l) => l.id === x)?.name).filter(Boolean)
  const [i, setI] = useState(0)
  const [answers, setAnswers] = useState({}) // id -> value | null (skipped)
  const [hints, setHints] = useState(0) // hints opened on the hard question
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const startedAt = useRef(null)
  const head = useRef(null)
  // The leaving copy of a step also renders a heading: only a mounted one may take the ref.
  const setHead = useCallback((el) => { if (el) head.current = el }, [])
  const dir = useRef(1)
  const step = steps[i]
  const last = i === steps.length - 1

  useEffect(() => { head.current?.focus({ preventScroll: true }) }, [i])

  const answer = (id, v) => setAnswers((a) => ({ ...a, [id]: v }))
  const go = (d) => { dir.current = d > 0 ? 1 : -1; setI((x) => Math.max(0, Math.min(steps.length - 1, x + d))) }

  async function submit(final) {
    const val = (id) => (final[id] === undefined ? null : final[id])
    const group = (qs) => Object.fromEntries(qs.map((q) => [q.id, val(q.id)]))
    const eng = val('english')
    // Exactly the v3 request (docs/BACKEND.md 5.8). A skipped question is null; the backend counts skips itself.
    // The language questions and the hard question (demo packs) are NOT sent: the backend has no field for them yet.
    const body = {
      quiz_1: group(check.quiz_1),
      quiz_2: group(check.quiz_2),
      reading: group(readingQuestions(check)),
      english_confidence: eng === null ? null : Number(eng),
      seconds_taken: Math.round((Date.now() - (startedAt.current ?? Date.now())) / 1000),
    }
    setBusy(true); setError(null)
    try {
      const result = await postMatch(body)
      // The chosen topic rides along for the results page only (which websites to suggest). It is not from the lab.
      setMatch({ ...result, topic: { subject: topic?.subject, name: topic?.name, advanced: /a level|ib/i.test(topic?.level || '') || !!topic?.beta } })
      nav('/results')
    } catch (e) {
      setError(e); setBusy(false)
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
  const count = step.of ? `Question ${step.n} of ${step.of}` : step.kind === 'intro' ? `${steps.length - 1} steps` : ''

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
                <p className="ck-sub">Pick a topic, then a few short parts. About {base.minutes ?? 8} minutes.</p>
                <TopicPicker value={topic} onChange={(t) => { setTopic(t); setAnswers({}); setHints(0) }} canStart={canStart} />
                {packError && <p className="ck-pack-error" role="alert"><Icon name="warn" size={16} /> That topic did not load. Pick another one.</p>}
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
                  <li><Icon name="lock" size={18} /> No name or email. Answers are used once to find your match and are not saved.</li>
                  <li><Icon name="pencil" size={18} /> It is not an exam. Nobody sees a mark. Your answers only shape your profile.</li>
                </ul>
              </>
            )}

            {step.kind === 'lesson' && (
              <>
                <h1 ref={setHead} tabIndex={-1}>A new idea</h1>
                <p className="ck-sub">Read this. The next questions are only about this idea.</p>
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
                <p className="ck-hard-note"><Icon name="spark" size={16} /> <span>This one is hard on purpose and is a trial: it does not change your results yet. Take a hint, have a go or skip it.</span></p>
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
                <legend ref={setHead} tabIndex={-1} className="ck-legend">{check.english_question.text}</legend>
                <div className="ck-choices ck-scale">
                  {scale(check.english_question).map((n, k, all) => (
                    <label className="ck-choice" key={n}>
                      <input type="radio" name="english" value={n} checked={answers.english === String(n)} onChange={() => answer('english', String(n))}
                        aria-label={k === 0 ? `${n}, ${check.english_question.min_label || 'lowest'}` : k === all.length - 1 ? `${n}, ${check.english_question.max_label || 'highest'}` : String(n)} />
                      <span className="ck-text">{n}</span>
                    </label>
                  ))}
                </div>
                <p className="ck-scale-ends" aria-hidden="true"><span>{check.english_question.min_label}</span><span>{check.english_question.max_label}</span></p>
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
