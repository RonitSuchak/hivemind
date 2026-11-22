import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { load, post, useBackend, useData } from '../api.js'
import { Failed, Flag, Loading, Score, usePageTitle } from '../components.jsx'
import { TYPES, fmtGain } from '../lib.js'

const AXES = [['start_level', 'Starting level'], ['learn_speed', 'Learning speed'], ['reading', 'Reading'], ['english', 'English'], ['persistence', 'Persistence']]

function Radar({ values }) {
  const point = (i, r) => {
    const a = (Math.PI * 2 * i) / AXES.length - Math.PI / 2
    return [190 + Math.cos(a) * r, 120 + Math.sin(a) * r]
  }
  const ring = (r) => AXES.map((_, i) => point(i, r).join(',')).join(' ')
  const shape = AXES.map(([key], i) => point(i, 80 * Math.max(0.04, values[key] ?? 0)).join(',')).join(' ')
  return (
    <svg className="radar" viewBox="0 0 380 240" role="img" aria-label={`Learner profile. ${AXES.map(([k, l]) => `${l} ${Math.round((values[k] ?? 0) * 10)} out of 10`).join(', ')}.`} style={{ width: '100%', maxWidth: 420 }}>
      {[80, 53, 27].map((r) => <polygon key={r} points={ring(r)} fill="none" stroke="rgba(255,255,255,0.14)" />)}
      {AXES.map((_, i) => { const [x, y] = point(i, 80); return <line key={i} x1="190" y1="120" x2={x} y2={y} stroke="rgba(255,255,255,0.1)" /> })}
      <polygon points={shape} fill="rgba(255,214,10,0.22)" stroke="#ffd60a" strokeWidth="2" strokeLinejoin="round" />
      {AXES.map(([key, label], i) => { const [x, y] = point(i, 100); return <text key={key} x={x} y={y + 4} textAnchor={Math.abs(x - 190) < 10 ? 'middle' : x > 190 ? 'start' : 'end'}>{label}</text> })}
    </svg>
  )
}

function MatchResult({ match, example }) {
  return (
    <div className="stack" style={{ '--gap': '20px' }}>
      {example && <p className="banner">This is an example result saved from the backend, not your own. Run the backend to take the check yourself.</p>}
      {match.check_quality && !match.check_quality.reliable && (
        <p className="banner error"><strong>This result may not be reliable.</strong> {match.check_quality.reasons.map((r) => r.text || r).join(' ')}</p>
      )}
      <div className="grid grid-3">
        <div className="card">
          <p className="label">Your learner profile</p>
          <Radar values={match.radar} />
        </div>
        <div className="card">
          <p className="label">The simulated students most like you</p>
          {match.matches?.length ? (
            <ul style={{ margin: '14px 0 0', paddingLeft: 20 }} className="stack">
              {match.matches.map((m) => (
                <li key={m.student_id}><strong>{m.name}</strong> <span className="muted mono">counts for {Math.round(m.weight * 100)}%</span></li>
              ))}
            </ul>
          ) : <p style={{ marginTop: 14 }} className="muted">No simulated student was close enough.</p>}
          <p className="note">{match.note}</p>
        </div>
      </div>
      {match.enough_matches ? (
        <div className="table-wrap">
          <table className="results">
            <caption className="sr-only">Types of tool ranked by the gain predicted for students like you.</caption>
            <thead>
              <tr><th scope="col">Type of tool</th><th scope="col">Predicted gain</th><th scope="col">Learning</th><th scope="col">Why</th></tr>
            </thead>
            <tbody>
              {match.ranked.map((r) => (
                <tr key={r.tutor_id}>
                  <th scope="row">
                    {r.rank}. {TYPES[r.tutor_id] || r.tutor_name}
                    <span className="sub">Tested with our {r.tutor_name} demo tool</span>
                  </th>
                  <td data-label="Predicted gain"><span className="score-num">{fmtGain(r.predicted_gain, 1)}<small> marks</small></span></td>
                  <td data-label="Learning"><Score value={r.scores.learning} /></td>
                  <td className="verdict-cell">
                    {r.safety_warning ? <><Flag ok={false}>Safety concern</Flag> <span className="muted">{r.safety_warning}</span></> : <span className="muted">{r.why}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="banner"><strong>No ranking.</strong> {match.message || 'No simulated student is close enough to you, so Hivemind will not guess.'}</p>
      )}
      {match.follow_ups?.length > 0 && (
        <div className="card">
          <p className="label">Questions people ask</p>
          {match.follow_ups.map((f) => (
            <details key={f.id}><summary>{f.question}</summary><p style={{ paddingBottom: 14 }}>{f.answer}</p></details>
          ))}
        </div>
      )}
    </div>
  )
}

function Question({ q, value, onChange }) {
  return (
    <fieldset className="field">
      <legend>{q.text}</legend>
      <div className="options">
        {q.options.map((opt) => (
          <label className="option" key={opt}>
            <input type="radio" name={q.id} value={opt} checked={value === opt} onChange={() => onChange(opt)} />
            <span>{opt}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

const CHECK_STEPS = ['Quiz 1', 'Mini-lesson', 'Quiz 2', 'Reading', 'English']

function Check({ check }) {
  const [step, setStep] = useState(-1)
  const [answers, setAnswers] = useState({})
  const [english, setEnglish] = useState(null)
  const [state, setState] = useState({ sending: false, error: null, match: null })
  const started = useRef(0)
  const top = useRef(null)
  const set = (id, value) => setAnswers((a) => ({ ...a, [id]: value }))
  const inProgress = step >= 0 && !state.match

  useEffect(() => {
    if (!inProgress) return
    const warn = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [inProgress])
  useEffect(() => { if (step >= 0) top.current?.focus() }, [step, state.match])

  const pick = (qs) => Object.fromEntries(qs.map((q) => [q.id, answers[q.id] ?? null]))
  async function submit() {
    setState({ sending: true, error: null, match: null })
    try {
      const match = await post('match', {
        quiz_1: pick(check.quiz_1),
        quiz_2: pick(check.quiz_2),
        reading: pick(check.reading.flatMap((p) => p.questions)),
        english_confidence: english,
        seconds_taken: Math.round((Date.now() - started.current) / 1000),
      })
      setState({ sending: false, error: null, match })
    } catch (error) {
      setState({ sending: false, error, match: null })
    }
  }
  const next = () => (step === 4 ? submit() : setStep(step + 1))

  if (state.match) {
    return (
      <div className="stack" style={{ '--gap': '20px' }}>
        <h2 ref={top} tabIndex={-1}>Your result</h2>
        <MatchResult match={state.match} />
        <p><button type="button" className="btn" onClick={() => { setStep(-1); setAnswers({}); setEnglish(null); setState({ sending: false, error: null, match: null }) }}>Take the check again</button></p>
      </div>
    )
  }
  if (step === -1) {
    return (
      <div className="panel stack">
        <h2>The 8-minute check</h2>
        <p className="muted">A short fractions quiz, a two-minute mini-lesson, a second quiz, two short reading passages and one question about English. You can skip any question. It is not an exam, and it asks for no name, age or email.</p>
        <p><button type="button" className="btn btn-primary" onClick={() => { started.current = Date.now(); setStep(0) }}>Start the check</button></p>
      </div>
    )
  }
  const e = check.english_question
  return (
    <form className="panel" onSubmit={(ev) => { ev.preventDefault(); if (!state.sending) next() }}>
      <div className="progress" aria-hidden="true">{CHECK_STEPS.map((s, i) => <i key={s} className={i <= step ? 'done' : ''} />)}</div>
      <p className="label">Part {step + 1} of {CHECK_STEPS.length}</p>
      <h2 ref={top} tabIndex={-1} style={{ marginTop: 8, outline: 'none' }}>{CHECK_STEPS[step]}</h2>
      <div className="stack" style={{ '--gap': '26px', marginTop: 22 }}>
        {step === 0 && check.quiz_1.map((q) => <Question key={q.id} q={q} value={answers[q.id]} onChange={(v) => set(q.id, v)} />)}
        {step === 1 && (
          <ol className="stack" style={{ margin: 0, paddingLeft: 22, fontSize: '1.08rem', maxWidth: '62ch' }}>
            {check.mini_lesson.map((line) => <li key={line}>{line}</li>)}
          </ol>
        )}
        {step === 2 && check.quiz_2.map((q) => <Question key={q.id} q={q} value={answers[q.id]} onChange={(v) => set(q.id, v)} />)}
        {step === 3 && check.reading.map((p) => (
          <div key={p.id} className="stack" style={{ '--gap': '18px' }}>
            <p className="quote" style={{ marginTop: 0, fontSize: '1.05rem' }}>{p.passage}</p>
            {p.questions.map((q) => <Question key={q.id} q={q} value={answers[q.id]} onChange={(v) => set(q.id, v)} />)}
          </div>
        ))}
        {step === 4 && (
          <fieldset className="field">
            <legend>{e.text}</legend>
            <div className="options">
              {Array.from({ length: e.max - e.min + 1 }, (_, i) => e.min + i).map((n) => (
                <label className="option" key={n}>
                  <input type="radio" name="english" value={n} checked={english === n} onChange={() => setEnglish(n)} />
                  <span>{n}{n === e.min ? ` · ${e.min_label}` : n === e.max ? ` · ${e.max_label}` : ''}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {state.error && <p className="banner error" role="alert"><strong>Your answers were not sent.</strong> {state.error.message} Your answers are still here, so you can try again.</p>}
        <div className="btn-row">
          {step > 0 && <button type="button" className="btn" onClick={() => setStep(step - 1)}>Back</button>}
          <button type="submit" className="btn btn-primary" aria-disabled={state.sending}>
            {state.sending && <span className="spinner" aria-hidden="true" />}
            {step === 4 ? 'See my result' : 'Continue'}
          </button>
        </div>
      </div>
    </form>
  )
}

function Chat({ tutors }) {
  const open = tutors.filter((t) => t.live_chat)
  const [tutorId, setTutorId] = useState(open[0]?.tutor_id)
  const [session, setSession] = useState(null)
  const [lines, setLines] = useState([])
  const [left, setLeft] = useState(12)
  const [text, setText] = useState('')
  const [state, setState] = useState({ sending: false, error: null })
  const tutor = open.find((t) => t.tutor_id === tutorId)

  const reset = (id = tutorId) => { setTutorId(id); setSession(null); setLines([]); setLeft(12); setState({ sending: false, error: null }) }
  async function send(ev) {
    ev.preventDefault()
    const message = text.trim()
    if (state.sending) return
    if (!message) return setState({ sending: false, error: new Error('Type a maths question first.') })
    if (message.length > 500) return setState({ sending: false, error: new Error('Messages can be up to 500 characters.') })
    setState({ sending: true, error: null })
    setLines((l) => [...l, { from: 'student', text: message }])
    setText('')
    try {
      const res = await post('chat', { tutor_id: tutorId, session_id: session, message })
      setSession(res.session_id)
      setLeft(res.turns_left)
      setLines((l) => [...l, { from: 'tutor', text: res.reply, notice: res.notice }])
      setState({ sending: false, error: null })
    } catch (error) {
      setLines((l) => l.slice(0, -1))
      setText(message)
      setState({ sending: false, error })
    }
  }

  return (
    <div className="panel stack" style={{ '--gap': '18px' }}>
      <h2>Chat with a demo tool</h2>
      <p className="muted">Each demo tool was built with a known trait. Every reply goes through the same safety rules as the lab. Do not type personal details: nothing is saved, and the chat is forgotten after 30 minutes.</p>
      <div className="field">
        <label htmlFor="tutor">Demo tool</label>
        <select id="tutor" name="tutor" className="input" value={tutorId} onChange={(e) => reset(e.target.value)}>
          {open.map((t) => <option key={t.tutor_id} value={t.tutor_id}>{t.tutor_name}: {t.style}</option>)}
        </select>
      </div>
      <ol className="chat" aria-live="polite" style={{ margin: 0 }}>
        {lines.length === 0 && <li className="muted">Ask a maths question, like “how do I add 1/3 and 1/6?”</li>}
        {lines.map((line, i) => (
          <li key={i} className={`msg ${line.from}`}>
            <span className="msg-meta">{line.from === 'tutor' ? tutor?.tutor_name : 'You'}</span>
            {line.text}
            {line.notice && <span className="msg-meta" style={{ marginTop: 8, color: 'var(--yellow)' }}>{line.notice}</span>}
          </li>
        ))}
      </ol>
      {state.error && (
        <p className="banner error" role="alert">
          {state.error.message}{' '}
          {['session_expired', 'turn_limit'].includes(state.error.code) && <button type="button" className="link" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }} onClick={() => reset()}>Start a new chat</button>}
        </p>
      )}
      <form onSubmit={send} className="field">
        <label htmlFor="message">Your message <span className="muted" style={{ fontWeight: 400 }}>({left} of 12 turns left)</span></label>
        <div className="btn-row" style={{ flexWrap: 'nowrap' }}>
          <input id="message" name="message" className="input" type="text" autoComplete="off" value={text} onChange={(e) => setText(e.target.value)} placeholder="How do I add 1/3 and 1/6…" aria-describedby="count" />
          <button type="submit" className="btn btn-primary" aria-disabled={state.sending}>
            {state.sending && <span className="spinner" aria-hidden="true" />}Send
          </button>
        </div>
        <p id="count" className="note" style={{ marginTop: 8, color: text.length > 500 ? 'var(--fail)' : undefined }}>{text.length} of 500 characters</p>
      </form>
    </div>
  )
}

function Offline() {
  const [example, setExample] = useState({ data: null, error: null, loading: false })
  const show = () => {
    setExample({ data: null, error: null, loading: true })
    load('match-example').then((data) => setExample({ data, error: null, loading: false })).catch((error) => setExample({ data: null, error, loading: false }))
  }
  return (
    <div className="stack" style={{ '--gap': '20px' }}>
      <div className="panel stack">
        <h2>The live parts are switched off here</h2>
        <p className="muted">
          The chat and the 8-minute check need the Hivemind backend, which runs the AI and the matching. This copy of the site is showing saved results, so those two parts are off.
          Everything else on the site is real output from the backend.
        </p>
        <p><strong>Run it yourself.</strong> With Python installed, from the top folder of the project:</p>
        <pre className="code" translate="no">{`cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python -m app.serve`}</pre>
        <p className="muted">Then set <code className="mono" translate="no">VITE_API_URL=http://localhost:8000</code> in <code className="mono" translate="no">v2/frontend/.env</code> and restart the website. Live AI replies also need a free Gemini key in <code className="mono" translate="no">backend/.env</code>.</p>
        <div className="btn-row">
          <button type="button" className="btn btn-primary" onClick={show} aria-disabled={example.loading}>
            {example.loading && <span className="spinner" aria-hidden="true" />}See an example check result
          </button>
          <Link className="btn" to="/report/chatgpt?student=s09#lesson">Read a saved lesson</Link>
        </div>
      </div>
      {example.error && <Failed error={example.error} retry={show} />}
      <div aria-live="polite">{example.data && <MatchResult match={example.data} example />}</div>
    </div>
  )
}

export default function Try() {
  usePageTitle('Try it')
  const backend = useBackend()
  const [params, setParams] = useSearchParams()
  const view = params.get('view') === 'chat' ? 'chat' : 'check'
  const { data, error, loading, retry } = useData('check', 'tutors')

  return (
    <>
      <div className="wrap page-head">
        <p className="label label-yellow">Try it</p>
        <h1>Try Hivemind yourself</h1>
        <p className="lede">Take the 8-minute check to see which type of tool worked for simulated students like you, or chat with one of the demo tools and watch the safety rules work.</p>
        <p className={`status ${backend === 'live' ? 'live' : ''}`} style={{ marginTop: 16 }}>
          <i aria-hidden="true" />{backend === 'live' ? 'Live backend connected' : backend === 'checking' ? 'Checking for a backend…' : 'No backend connected: showing saved results'}
        </p>
      </div>
      <div className="wrap" style={{ paddingBottom: 'clamp(48px, 8vw, 96px)' }}>
        {backend === 'checking' && <Loading height={280} label="Checking for a backend…" />}
        {backend === 'saved' && <Offline />}
        {backend === 'live' && (
          <div className="stack" style={{ '--gap': '20px' }}>
            <nav className="nav" aria-label="What to try">
              {[['check', 'The 8-minute check'], ['chat', 'Chat with a demo tool']].map(([id, label]) => (
                <Link key={id} to={`?view=${id}`} replace preventScrollReset aria-current={view === id ? 'page' : undefined} onClick={(ev) => { ev.preventDefault(); setParams({ view: id }, { replace: true, preventScrollReset: true }) }}>{label}</Link>
              ))}
            </nav>
            {loading && <Loading height={280} />}
            {error && <Failed error={error} retry={retry} />}
            {data && (view === 'chat' ? <Chat tutors={data[1]} /> : <Check check={data[0]} />)}
          </div>
        )}
      </div>
    </>
  )
}
