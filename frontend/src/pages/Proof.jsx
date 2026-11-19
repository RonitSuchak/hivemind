import { useEffect, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { getTest, getValidation, postTestScore, postValidation } from '../api.js'
import { useLoad, usePageTitle, useStatus } from '../hooks.js'
import { plainWords, typeName } from '../labels.js'
import { useMatch } from '../store.jsx'
import { Async, Unavailable } from '../components/States.jsx'
import Reveal from '../components/Reveal.jsx'
import Icon from '../components/Icon.jsx'
import RealClass from '../components/RealClass.jsx'
import '../styles/lab.css'
import '../styles/proof.css'

// The real-classmate check (/lab/proof): a real student sits the 10-question test, tries one demo tool,
// sits the test again, and sees their real gain next to the predicted gain (docs/BACKEND.md 5.11 to 5.14).
// The backend marks the test and works out every gain. This page only sends answers and shows what comes back.
// Nothing about the person is saved in the browser. The flow lives in this module's memory only, so it
// survives a move to /try/{id} and back, and a page reload clears it.

// ---------- Flow state (memory only) ----------
const blankSide = () => ({ answers: {}, result: null }) // answers: { q1: '2/4' }; result: { score, out_of, answered } from the backend
const blank = (matchId, epoch) => ({ matchId, epoch, busy: false, error: null, errWhich: null, before: blankSide(), after: blankSide(), toolId: null, lessonDone: false, result: null })
let store = blank(null, 0)
const listeners = new Set()
const emit = () => listeners.forEach((l) => l())
const subscribe = (l) => (listeners.add(l), () => listeners.delete(l))
const useFlow = () => useSyncExternalStore(subscribe, () => store)
const patch = (p) => { store = { ...store, ...p }; emit() }
const reset = (matchId = store.matchId) => { store = blank(matchId, store.epoch + 1); emit() }
const putSide = (which, p) => patch({ [which]: { ...store[which], ...p } })
const setAnswer = (which, id, value) => {
  const answers = { ...store[which].answers }
  if (value == null) delete answers[id]; else answers[id] = value
  putSide(which, { answers })
}
const hasProgress = (s) => !!(Object.keys(s.before.answers).length || Object.keys(s.after.answers).length || s.before.result || s.toolId || s.lessonDone || s.result)

// ---------- Small helpers (display only) ----------
const num = (n) => (Number.isFinite(n) ? String(Math.round(n * 10) / 10) : 'n/a')
const signed = (n) => (Number.isFinite(n) && n > 0 ? `+${num(n)}` : num(n))
const markWord = (n) => (Math.abs(n) === 1 ? 'mark' : 'marks')
const errText = (e) => {
  const msg = e?.message || 'Something went wrong. Please try again.'
  return e?.code === 'rate_limited' && e.retryAfter ? `${msg} Please wait about ${e.retryAfter} seconds, then try again.` : msg
}
// The backend's own "within 1 mark" line decides which kind words to use.
const compareWords = (diff) => {
  if (!Number.isFinite(diff)) return ''
  if (Math.abs(diff) <= 1) return 'Your real gain was close to the prediction.'
  return diff > 0 ? 'Your real gain was higher than the prediction.' : 'Your real gain was lower than the prediction.'
}

export default function Proof() {
  usePageTitle('Real classmates')
  const s = useFlow()
  return (
    <div className="lx-ratings pf">
      <section className="lx-sec" aria-labelledby="pf-h">
        <Reveal className="lx-sec-head">
          <h2 id="pf-h">Do simulated students predict real ones?</h2>
          <p>Hivemind&rsquo;s scores come from simulated students, so we check them against real ones.</p>
          <p>A real student sits the same test before and after a lesson, and we compare their real gain with the prediction.</p>
        </Reveal>
      </section>

      <RealClass />
      <Results rev={s.result?.code ?? ''} />
      <TakePart />

      <section className="lx-sec" aria-labelledby="pf-read-h">
        <div className="lx-sec-head">
          <h2 id="pf-read-h">How to read this</h2>
        </div>
        <ul className="pf-read glass">
          <li>This is a first check and cannot give a final verdict.</li>
          <li>A few classmates is a small sample, so one result can be far off.</li>
        </ul>
      </section>
    </div>
  )
}

// ---------- 2. Results so far ----------
function Results({ rev }) {
  const load = useLoad(() => getValidation(), [rev])
  return (
    <section className="lx-sec" aria-labelledby="pf-res-h">
      <div className="lx-sec-head">
        <h2 id="pf-res-h">Results so far</h2>
        <p>Real classmates, with the real gain next to the predicted gain.</p>
      </div>
      <Async state={load} label="Loading the results" className="pf-res"
        unavailable={<div className="glass lx-offline-panel"><Unavailable shape="bars">The lab is not connected, so there are no results to show.</Unavailable></div>}>
        {(d) => <ResultsBody data={d} />}
      </Async>
    </section>
  )
}

const dash = (v) => (v == null ? 'n/a' : v)

function ResultsBody({ data }) {
  const entries = Array.isArray(data?.entries) ? data.entries : []
  const sum = data?.summary || {}
  const share = Number.isFinite(sum.within_1_share) ? `${Math.round(sum.within_1_share * 100)}% of them` : ''
  return (
    <div className="pf-res-body">
      <dl className="pf-stats">
        <div className="glass pf-stat"><dt>Students who took part</dt><dd>{dash(sum.count)}</dd></div>
        <div className="glass pf-stat">
          <dt>Average gap between predicted and real</dt>
          <dd>{sum.avg_error == null ? 'n/a' : num(sum.avg_error)}{sum.avg_error != null && <small> marks</small>}</dd>
        </div>
        <div className="glass pf-stat">
          <dt>Within 1 mark of the prediction{share && <span>{share}</span>}</dt>
          <dd>{dash(sum.within_1)}</dd>
        </div>
      </dl>

      {entries.length === 0 ? (
        <div className="glass pf-empty">
          <p className="state-title">No real students have taken part yet.</p>
          <p className="muted">Results appear here as soon as someone finishes.</p>
        </div>
      ) : (
        <ul className="pf-entries">
          {entries.map((e, i) => (
            <li key={e.code ?? i} className="glass pf-entry">
              <p className="pf-entry-head"><b>{e.code}</b><span className="lx-chip">{typeName(e.tutor_id)}</span></p>
              <dl className="pf-nums">
                <div><dt>Test, before and after</dt><dd>{dash(e.before)} to {dash(e.after)}</dd></div>
                <div><dt>Real gain</dt><dd>{signed(e.real_gain)}</dd></div>
                <div><dt>Predicted gain</dt><dd>{signed(e.predicted_gain)}</dd></div>
              </dl>
            </li>
          ))}
        </ul>
      )}
      {data?.note && <p className="lx-muted-sm pf-note">{plainWords(data.note)}</p>}
    </div>
  )
}

// ---------- 3. Take part ----------
const STEPS = ['Take the check', 'Sit the test', 'Have one lesson', 'Sit the test again']

function TakePart() {
  const status = useStatus()
  const { match } = useMatch()
  const s = useFlow()
  const test = useLoad(() => getTest(), [])

  const live = status === 'live'
  const real = !!(match && match.match_id && !match.example)
  const realId = real ? match.match_id : null
  useEffect(() => { if (s.matchId !== realId) reset(realId) }, [realId, s.matchId])

  const eligible = real
    ? (Array.isArray(match.ranked) ? match.ranked : []).filter((t) => typeof t.try_url === 'string' && t.try_url.startsWith('/try/'))
    : []
  const tool = eligible.find((t) => t.tutor_id === s.toolId) || eligible[0] || null

  const done = [real, !!s.before.result, s.lessonDone, !!s.result]
  const current = done.findIndex((d) => !d)
  const stateOf = (i) => (done[i] ? 'done' : i === current ? 'current' : 'todo')
  const off = (i) => !live || i !== current // controls disabled

  // One request at a time. If Start again or a new match changes the epoch while a request is out, its answer is dropped.
  const guarded = (which, fn) => async (body) => {
    if (store.busy) return
    const ep = store.epoch
    patch({ busy: true, error: null, errWhich: which })
    try { await fn(body, ep) } catch (e) { if (store.epoch === ep) patch({ error: e }) } finally { if (store.epoch === ep) patch({ busy: false }) }
  }
  const sendBefore = guarded('before', async (body, ep) => {
    const r = await postTestScore(body)
    if (store.epoch === ep) putSide('before', { result: r })
  })
  const sendAfter = guarded('after', async (body, ep) => {
    let after = store.after.result
    if (!after) {
      after = await postTestScore(body)
      if (store.epoch !== ep) return
      putSide('after', { result: after })
    }
    const base = { code: null, tutor_id: tool.tutor_id, before: store.before.result.score, after: after.score }
    let res
    try {
      res = await postValidation({ ...base, match_id: realId })
    } catch (e) {
      // A match is not always saved (BACKEND.md, match notes). The contract lets us send the 5 profile numbers instead of match_id.
      if (e?.code === 'not_found' && match?.profile && store.epoch === ep) res = await postValidation({ ...base, profile: match.profile })
      else throw e
    }
    if (store.epoch === ep) patch({ result: res })
  })

  return (
    <section className="lx-sec" aria-labelledby="pf-take-h">
      <div className="lx-sec-head">
        <h2 id="pf-take-h">Take part</h2>
        <p>Take the Hivemind check, sit a short test, have one lesson with a demo tool, then sit the same test again.</p>
      </div>

      <div className="glass pf-card">
        {!live && (
          <p className="pf-gate" role="note"><Icon name="info" size={18} /><span>Taking part needs the live lab, which is not connected right now. The steps below show how it works.</span></p>
        )}
        <ol className="pf-steps" key={s.epoch}>
          {STEPS.map((title, i) => (
            <li key={title} className="pf-step" data-state={stateOf(i)} aria-current={stateOf(i) === 'current' ? 'step' : undefined} aria-labelledby={`pf-s${i}`}>
              <span className="pf-n" aria-hidden="true">{stateOf(i) === 'done' ? <Icon name="check" size={16} /> : i + 1}</span>
              <div className="pf-step-main">
                <div className="pf-step-top">
                  <h3 id={`pf-s${i}`}>{title}</h3>
                  <span className="pf-tag">{{ done: 'Done', current: 'Your turn', todo: 'Later' }[stateOf(i)]}</span>
                </div>
                {i === 0 && <StepCheck real={real} example={!!match?.example} />}
                {i === 1 && (
                  <StepTest which="before" lead="One answer for each question. You can leave a question blank." state={s.before} data={test}
                    show={stateOf(1) !== 'todo'} busy={s.busy} error={s.errWhich === 'before' ? s.error : null} disabled={off(1)} button="Send my answers" onSend={sendBefore} />
                )}
                {i === 2 && (
                  <StepLesson eligible={eligible} tool={tool} real={real} state={stateOf(2)} disabled={off(2)} lessonDone={s.lessonDone} />
                )}
                {i === 3 && (
                  <>
                    <StepTest which="after" lead="The same questions again. You can leave a question blank." state={s.after} data={test}
                      show={stateOf(3) === 'current'} busy={s.busy} error={s.errWhich === 'after' ? s.error : null} finished={!!s.result} disabled={off(3)} locked={!!s.after.result} button="Send my answers and see the result" onSend={sendAfter} />
                    {s.result && <Outcome result={s.result} />}
                  </>
                )}
              </div>
            </li>
          ))}
        </ol>

        <div className="pf-foot">
          <button type="button" className="btn btn-small" onClick={() => reset()} disabled={!hasProgress(s) || s.busy}>Start again</button>
          <p className="lx-muted-sm"><Icon name="lock" size={14} /> Your answers stay in this page&rsquo;s memory only. Reloading the page clears them.</p>
        </div>
      </div>
    </section>
  )
}

function StepCheck({ real, example }) {
  if (real) return <p className="pf-line">Your check is done, so Hivemind has a prediction for you.</p>
  return (
    <>
      <p className="pf-line">The check gives Hivemind a prediction for students like you. You need it before the next steps.</p>
      {example && <p className="pf-line pf-soft">The example student you opened is not a real person, so it cannot be used here.</p>}
      <Link to="/check" className="btn btn-primary btn-small pf-act">Take the check <Icon name="arrow" size={16} className="icon-nudge" /></Link>
    </>
  )
}

function StepTest({ which, lead, state, data, show, disabled, busy, error: err, locked = false, finished = false, button, onSend }) {
  if (which === 'before' && state.result) {
    return <p className="pf-line pf-score">You scored {state.result.score} out of {state.result.out_of}. You answered {state.result.answered} of them.</p>
  }
  if (finished) return null
  if (!show) {
    return (
      <>
        <p className="pf-line">{lead}</p>
        <button type="button" className="btn btn-small pf-act" disabled>{button}</button>
      </>
    )
  }
  return (
    <>
      <p className="pf-line">{lead}</p>
      <Async state={data} label="Loading the test"
        unavailable={<Unavailable shape="bars">The test cannot load because the lab is not connected.</Unavailable>}>
        {(t) => {
          const questions = (Array.isArray(t?.questions) ? t.questions : []).filter((q) => q && q.id && Array.isArray(q.options))
          const answered = questions.filter((q) => state.answers[q.id] != null).length
          const frozen = disabled || busy || locked
          const send = (e) => {
            e.preventDefault()
            if (frozen || !answered) return
            onSend({ answers: Object.fromEntries(questions.map((q) => [q.id, state.answers[q.id] ?? null])) })
          }
          return (
            <form className="pf-test" onSubmit={send} noValidate>
              {questions.map((q, n) => (
                <fieldset className="pf-q" key={q.id} disabled={frozen}>
                  <legend>{n + 1}. {q.text}</legend>
                  <div className="pf-choices">
                    {q.options.map((o) => (
                      <label className="pf-choice" key={o}>
                        <input type="radio" name={`pf-${which}-${q.id}`} value={o} checked={state.answers[q.id] === o} onChange={() => setAnswer(which, q.id, o)} />
                        <span className="pf-radio" aria-hidden="true" />
                        <span>{o}</span>
                      </label>
                    ))}
                  </div>
                  {state.answers[q.id] != null && !frozen && (
                    <button type="button" className="link-quiet pf-clear" onClick={() => setAnswer(which, q.id, null)}>Clear my answer</button>
                  )}
                </fieldset>
              ))}
              {err && <p className="pf-error" role="alert"><Icon name="warn" size={16} /> <span>{errText(err)}</span></p>}
              <div className="pf-send">
                <button type="submit" className="btn btn-primary" disabled={disabled || busy || !answered} aria-busy={busy}>
                  {busy && <span className="spinner spinner-sm" aria-hidden="true" />}{err ? 'Try again' : button}
                </button>
                <span className="lx-muted-sm">{answered} of {questions.length} answered</span>
              </div>
            </form>
          )
        }}
      </Async>
    </>
  )
}

function StepLesson({ eligible, tool, real, state, disabled, lessonDone }) {
  const lead = 'The lesson opens on another page. Come back here when you have finished, and your place is kept.'
  if (lessonDone && tool) return <p className="pf-line">Lesson done with {typeName(tool.tutor_id, tool.tutor_name)}.</p>
  if (real && eligible.length === 0) {
    return <p className="pf-line">None of the demo tools in your results are open for a lesson here, so this step cannot run.</p>
  }
  return (
    <>
      <p className="pf-line">Pick one demo tool and have a short lesson. {lead}</p>
      {real && state !== 'todo' && eligible.length > 0 && (
        <fieldset className="pf-tools" disabled={disabled}>
          <legend>Choose a demo tool</legend>
          <div className="pf-choices pf-tool-list">
            {eligible.map((t) => (
              <label className="pf-choice" key={t.tutor_id}>
                <input type="radio" name="pf-tool" value={t.tutor_id} checked={tool?.tutor_id === t.tutor_id} onChange={() => patch({ toolId: t.tutor_id })} />
                <span className="pf-radio" aria-hidden="true" />
                <span className="pf-tool-text"><b>{typeName(t.tutor_id, t.tutor_name)}</b><span>Predicted gain {signed(t.predicted_gain)} {markWord(t.predicted_gain)}</span></span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <div className="pf-acts">
        {state === 'current' && !disabled && tool
          ? <Link to={tool.try_url} className="btn btn-small">Open the lesson <Icon name="arrow" size={16} className="icon-nudge" /></Link>
          : <button type="button" className="btn btn-small" disabled>Open the lesson</button>}
        <button type="button" className="btn btn-primary btn-small" disabled={disabled || !tool} onClick={() => patch({ toolId: tool.tutor_id, lessonDone: true })}>I have finished the lesson</button>
      </div>
    </>
  )
}

function Outcome({ result }) {
  const gain = result.real_gain
  const pred = result.predicted_gain
  return (
    <div className="pf-outcome" role="status">
      <div className="pf-versus">
        <div><p className="pf-big">{signed(gain)}<small> {markWord(gain)}</small></p><p className="lx-muted-sm">Your real gain</p></div>
        <div><p className="pf-big">{signed(pred)}<small> {markWord(pred)}</small></p><p className="lx-muted-sm">Predicted for students like you</p></div>
      </div>
      <p className="pf-line">You scored {result.before} before and {result.after} after. {compareWords(result.difference)}</p>
      <p className="pf-line pf-soft">One result is a tiny sample. A gap can come from many things, like how the day went, and it says nothing about you.</p>
      {result.code && <p className="lx-muted-sm">Your anonymous code is <b>{result.code}</b>. It is added to the results above.</p>}
    </div>
  )
}
