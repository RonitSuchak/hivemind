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

// What each part of the check measures: shown as a small chip on each step and as the list on the intro.
const MEASURES = {
  level: { label: 'Starting level', chip: 'starting level', icon: 'chart' },
  speed: { label: 'Learning speed', chip: 'learning speed', icon: 'clock' },
  reading: { label: 'Reading', chip: 'reading', icon: 'book' },
  english: { label: 'Language level', chip: 'language level', icon: 'chat' },
  persistence: { label: 'What you do when stuck', chip: 'what you do when stuck', icon: 'spark' },
}

// Optional parts: the live backend may not send them yet, so every one is checked before use.
function buildSteps(c) {
  const steps = [{ kind: 'intro', part: 'Before you start' }]
  c.quiz_1.forEach((q, i) => steps.push({ kind: 'q', part: 'Quiz 1', measure: 'level', q, n: i + 1, of: c.quiz_1.length }))
  steps.push({ kind: 'lesson', part: 'Mini-lesson', measure: 'speed' })
  c.quiz_2.forEach((q, i) => steps.push({ kind: 'q', part: 'Quiz 2', measure: 'speed', q, n: i + 1, of: c.quiz_2.length }))
  c.reading.questions.forEach((q, i) => steps.push({ kind: 'q', part: 'Reading', measure: 'reading', q, n: i + 1, of: c.reading.questions.length, passage: c.reading.passage }))
  const eq = extraQuestions(c)
  eq.forEach((q, i) => steps.push({ kind: 'q', part: 'Language', measure: 'english', q, n: i + 1, of: eq.length }))
  steps.push({ kind: 'english', part: 'About you', measure: 'english' })
  if (c.persistence_question?.options?.length) steps.push({ kind: 'q', part: 'About you', measure: 'persistence', q: c.persistence_question })
  return steps
}

const extraQuestions = (c) => (Array.isArray(c.english_questions) ? c.english_questions.filter((q) => q?.id && q.options?.length) : [])

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

// Demo topic packs live in public/demo/topics/. A pack swaps the first quiz, the lesson and the second quiz.
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
    if (!topic || topic.pack === 'default') return
    let off = false
    fetch(packUrl(topic.pack)).then((r) => (r.ok ? r.json() : Promise.reject())).then((p) => {
      if (off) return
      if (Array.isArray(p.quiz_1) && Array.isArray(p.quiz_2) && Array.isArray(p.mini_lesson)) setPack(p); else setPackError(true)
    }).catch(() => { if (!off) setPackError(true) })
    return () => { off = true }
  }, [topic])
  const check = useMemo(() => (pack ? { ...base, quiz_1: pack.quiz_1, mini_lesson: pack.mini_lesson, quiz_2: pack.quiz_2 } : base), [base, pack])
  const topicReady = !!topic && (topic.pack === 'default' || !!pack)
  const steps = useMemo(() => buildSteps(check), [check])
  const nav = useNavigate()
  const { setMatch, languages } = useMatch()
  const speaks = languages.map((x) => LANGUAGES.find((l) => l.id === x)?.name).filter(Boolean)
  const [i, setI] = useState(0)
  const [answers, setAnswers] = useState({}) // id -> value | null (skipped)
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
    const engQs = extraQuestions(check)
    const pq = check.persistence_question?.options?.length ? check.persistence_question : null
    const ids = [...check.quiz_1, ...check.quiz_2, ...check.reading.questions, ...engQs, ...(pq ? [pq] : [])].map((q) => q.id)
    const eng = val('english')
    const body = {
      quiz_1: group(check.quiz_1),
      quiz_2: group(check.quiz_2),
      reading: group(check.reading.questions),
      english_confidence: eng === null ? null : Number(eng),
      skipped: ids.filter((id) => val(id) === null).length + (eng === null ? 1 : 0),
      seconds_taken: Math.round((Date.now() - (startedAt.current ?? Date.now())) / 1000),
    }
    // Extra keys are sent only when the check has those parts, so the live backend's payload is unchanged.
    if (engQs.length) body.english_check = group(engQs)
    if (pq) body.persistence = val(pq.id)
    setBusy(true); setError(null)
    try {
      setMatch(await postMatch(body))
      nav('/results')
    } catch (e) {
      setError(e); setBusy(false)
    }
  }

  const key = step.kind === 'english' ? 'english' : step.q?.id
  const answered = key && answers[key] != null
  const canNext = step.kind === 'intro' ? topicReady : step.kind === 'lesson' || answered
  const asks = step.kind === 'q' || step.kind === 'english'

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
            <SwapText text={`Measures: ${measure.chip}`} />
          </p>
        )}
      </div>

      <div className="ck-card glass">
        <StepSwap id={i} dir={dir.current} className="ck-swap">
          <section className="ck-step" aria-live="polite">
            {step.kind === 'intro' && (
              <>
                <h1 ref={setHead} tabIndex={-1}>The check</h1>
                <p className="ck-sub">Pick a topic, then five short parts. About 5 minutes.</p>
                <TopicPicker value={topic} onChange={(t) => { setTopic(t); setAnswers({}) }} canStart={canStart} />
                {packError && <p className="ck-pack-error" role="alert"><Icon name="warn" size={16} /> That topic did not load. Pick another one.</p>}
                <h2 className="ck-parts-title">The 5 skills we measure</h2>
                <ul className="ck-parts" aria-label="The 5 skills we measure">
                  {Object.values(MEASURES).map((m) => (
                    <li key={m.label}><Icon name={m.icon} size={16} /> {m.label}</li>
                  ))}
                </ul>
                {speaks.length > 0 && <p className="ck-speaks"><Icon name="chat" size={16} /> You speak {speaks.join(', ')}.</p>}
                <ul className="ck-points">
                  <li><Icon name="skipfwd" size={18} /> Skip any question you like.</li>
                  <li><Icon name="lock" size={18} /> No name or email. Answers are used once to find your match and are not saved.</li>
                  <li><Icon name="pencil" size={18} /> It is not a test. There are no marks.</li>
                </ul>
              </>
            )}

            {step.kind === 'lesson' && (
              <>
                <h1 ref={setHead} tabIndex={-1}>Mini-lesson</h1>
                <p className="ck-sub">Read this, then try the next questions.</p>
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

            {step.kind === 'english' && (
              <fieldset className="ck-q">
                <legend ref={setHead} tabIndex={-1} className="ck-legend">{check.english_question}</legend>
                <div className="ck-choices ck-scale">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <label className="ck-choice" key={n}>
                      <input type="radio" name="english" value={n} checked={answers.english === String(n)} onChange={() => answer('english', String(n))}
                        aria-label={n === 1 ? '1, not at all' : n === 5 ? '5, very' : String(n)} />
                      <span className="ck-text">{n}</span>
                    </label>
                  ))}
                </div>
                <p className="ck-scale-ends" aria-hidden="true"><span>Not at all</span><span>Very</span></p>
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
