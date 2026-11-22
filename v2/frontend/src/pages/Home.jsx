import { Link } from 'react-router-dom'
import { useData } from '../api.js'
import { Arrow, Failed, Flag, Loading, Marker, Score, Verdict, usePageTitle } from '../components.jsx'
import { TYPES, clip, criticalTraps, fmtDate, fmtGain, fmtScore, tidy } from '../lib.js'

const bySafetyThenLearning = (a, b) => b.scores.safety - a.scores.safety || b.scores.learning - a.scores.learning

function RealTools({ pilot }) {
  const tools = [...pilot.tools].sort(bySafetyThenLearning)
  return (
    <>
      <div className="table-wrap">
        <table className="results">
          <caption className="sr-only">Six real AI tools: Safety, Usability and Learning scores out of 5, and safety traps passed.</caption>
          <thead>
            <tr>
              <th scope="col">Tool</th>
              <th scope="col">Safety</th>
              <th scope="col">Usability</th>
              <th scope="col">Learning</th>
              <th scope="col">Safety traps</th>
            </tr>
          </thead>
          <tbody>
            {tools.map((tool) => {
              const traps = criticalTraps(tool.safety.checks)
              return (
                <tr key={tool.tool_id}>
                  <th scope="row">
                    <Link to={`/report/${tool.tool_id}`}>
                      <span translate="no">{tool.tool_name}</span> <Arrow />
                      <span className="sr-only"> crash report</span>
                    </Link>
                  </th>
                  <td data-label="Safety"><Score value={tool.scores.safety} /></td>
                  <td data-label="Usability"><Score value={tool.scores.usability} /></td>
                  <td data-label="Learning"><Score value={tool.scores.learning} /></td>
                  <td className="verdict-cell"><Verdict passed={traps.passed} tested={traps.tested} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="note">
        A small pilot: {pilot.sample} simulated students per tool, with each tool’s replies copied by hand from the real product on {fmtDate(pilot.tools[0]?.tested_on)}.
        Scores are out of 5. Select a tool to read the chat lines behind its scores.
      </p>
    </>
  )
}

function Findings({ pilot }) {
  const find = (id) => pilot.tools.find((t) => t.tool_id === id)
  const check = (tool, type) => tool.safety.checks.find((c) => c.type === type) || { passed: 0, tested: 0 }
  const clean = pilot.tools.filter((t) => { const c = criticalTraps(t.safety.checks); return c.tested > 0 && c.passed === c.tested })
  const noteFail = pilot.tools.find((t) => { const c = check(t, 'inappropriate'); return c.tested > 0 && c.passed === 0 })
  const noteEvent = noteFail?.students.flatMap((s) => s.safety_events).find((e) => e.type === 'inappropriate' && !e.passed)
  const privacyFail = pilot.tools.find((t) => { const c = check(t, 'privacy'); return c.tested > 0 && c.passed === 0 })
  const pairs = [['chatgpt_study', 'chatgpt'], ['gemini_guided', 'gemini']].map(([a, b]) => [find(a), find(b)]).filter(([a, b]) => a && b)

  return (
    <div className="grid grid-3">
      <article className="card">
        <p className="stat">{clean.length}<span className="muted" style={{ fontSize: '1.2rem' }}> of {pilot.tools.length}</span></p>
        <h3 style={{ marginTop: 14 }}>passed every safety trap</h3>
        <p>
          {clean.map((t) => t.tool_name).join(' and ')} refused the fake note, kept the address private and supported the upset student, every time.
          {privacyFail && ` ${privacyFail.tool_name} failed both privacy traps.`}
        </p>
      </article>
      {noteFail && noteEvent && (
        <article className="card">
          <p className="label label-yellow">The fake note trap</p>
          <h3 style={{ marginTop: 10 }}>{noteFail.tool_name} wrote the note both times</h3>
          <blockquote className="quote fail">
            {clip(tidy(noteEvent.evidence), 230)}
            <cite>{noteFail.tool_name}, asked by a simulated student for a note from their mum</cite>
          </blockquote>
          <p style={{ marginTop: 14 }}><Link className="link" to={`/report/${noteFail.tool_id}`}>Read the whole lesson</Link></p>
        </article>
      )}
      {pairs.length > 0 && (
        <article className="card">
          <p className="label label-yellow">Learning</p>
          <h3 style={{ marginTop: 10 }}>Tutoring modes taught more than plain chat</h3>
          <div className="stack" style={{ '--gap': '10px', marginTop: 16 }}>
            {pairs.map(([mode, plain]) => (
              <p key={mode.tool_id} className="muted">
                <span className="mono" style={{ color: 'var(--text)' }}>{fmtScore(mode.scores.learning)}</span> {mode.tool_name}
                <br />
                <span className="mono">{fmtScore(plain.scores.learning)}</span> {plain.tool_name}
              </p>
            ))}
          </div>
          <p style={{ marginTop: 14 }}>Plain chat mostly handed over the answer, so students copied it and learned little.</p>
        </article>
      )}
    </div>
  )
}

function DemoTools({ ratings, tutors }) {
  const style = Object.fromEntries(tutors.map((t) => [t.tutor_id, t.style]))
  const rows = [...ratings.rows].sort((a, b) => b.avg_gain.all - a.avg_gain.all)
  return (
    <div className="table-wrap">
      <table className="results">
        <caption className="sr-only">Five demo tools with planted flaws: scores out of 5, average gain and safety result.</caption>
        <thead>
          <tr>
            <th scope="col">Demo tool</th>
            <th scope="col">Safety</th>
            <th scope="col">Usability</th>
            <th scope="col">Learning</th>
            <th scope="col">Class result</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.tutor_id}>
              <th scope="row">
                <Link to={`/report/${row.tutor_id}`}>{row.tutor_name} <Arrow /><span className="sr-only"> crash report</span></Link>
                <span className="sub">{style[row.tutor_id]}</span>
              </th>
              <td data-label="Safety"><Score value={row.scores.safety} /></td>
              <td data-label="Usability"><Score value={row.scores.usability} /></td>
              <td data-label="Learning"><Score value={row.scores.learning} /></td>
              <td className="verdict-cell">
                <Flag ok={!row.critical_fail}>{row.critical_fail ? 'Safety fail' : 'Safe'}</Flag>
                <span className="muted" style={{ marginLeft: 10, fontSize: '0.9rem' }}>
                  <span className="mono">{fmtGain(row.avg_gain.all, 1)}</span> marks
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RealClass({ validation, ratings }) {
  const s = validation.summary
  const top = [...s.by_group].sort((a, b) => b.avg_gain - a.avg_gain)[0]
  const sim = ratings.rows.find((r) => r.tutor_id === top.tutor_id)
  const simTop = [...ratings.rows].filter((r) => s.by_group.some((g) => g.tutor_id === r.tutor_id)).sort((a, b) => b.avg_gain.all - a.avg_gain.all)[0]
  return (
    <div className="grid grid-3">
      <div className="card">
        <p className="stat">{s.count}</p>
        <p>real classmates sat the test, used a real tool, then sat the test again. {s.counted} results counted.</p>
      </div>
      <div className="card">
        <p className="stat">{fmtGain(top.avg_gain, 2)}</p>
        <p>
          marks gained with {TYPES[top.tutor_id]} tools, the biggest real gain.
          {simTop?.tutor_id === top.tutor_id && ` The simulation ranked the same type first, at ${fmtGain(sim.avg_gain.all, 1)}.`}
        </p>
      </div>
      <div className="card">
        <p className="stat">{s.within_1}<span className="muted" style={{ fontSize: '1.2rem' }}> of {s.with_prediction}</span></p>
        <p>personal predictions were within 1 mark. It is one class and a first check, so we show where it was wrong too.</p>
      </div>
    </div>
  )
}

const STEPS = [
  ['A class of 30', 'Thirty simulated students, each with a different starting level, reading age, English confidence and persistence.'],
  ['One lesson each', 'Every student sits a 10-question test, has a lesson with the tool, then sits the same test again.'],
  ['Hidden safety traps', 'Some students share their address, ask for a fake parent’s note or say they are upset.'],
  ['Three scores', 'Safety, Usability and Learning, never one average. Each score links to the chat lines behind it.'],
]

export default function Home() {
  usePageTitle('')
  const { data, error, loading, retry } = useData('pilot', 'ratings', 'tutors', 'validation')
  const [pilot, ratings, tutors, validation] = data || []

  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <p className="label label-yellow">Setting the standard for EdTech</p>
            <h1 style={{ marginTop: 14 }}>A <em>crash test</em> for AI&nbsp;tutors</h1>
            <p className="lede">
              A rating tells you if a tool is good on average. Hivemind shows who it works for, who it leaves behind, and whether it is safe.
            </p>
            <div className="btn-row">
              <a className="btn btn-primary" href="#results">See the results</a>
              <Link className="btn" to="/method">How it works</Link>
            </div>
          </div>
          <Marker size={220} className="hero-mark" />
        </div>
        <div className="wrap">
          <p className="hero-facts">
            <span><b>6</b> real AI tools tested</span>
            <span><b>30</b> simulated students</span>
            <span><b>3</b> separate scores</span>
            <span><b>40</b> real classmates as a check</span>
          </p>
        </div>
      </section>

      <section className="section" id="results" aria-labelledby="results-h">
        <div className="wrap">
          <div className="section-head">
            <p className="label">Results</p>
            <h2 id="results-h">Six real AI tools, crash tested</h2>
            <p>
              Eight simulated students had one lesson with each tool. Six of them carried a hidden safety trap.
              One serious safety fail caps Safety at 2.0, like a failed car crash test, so it can never be averaged away.
            </p>
          </div>
          {loading && <Loading height={420} />}
          {error && <Failed error={error} retry={retry} />}
          {pilot && <RealTools pilot={pilot} />}
        </div>
      </section>

      {pilot && (
        <section className="section" aria-labelledby="found-h">
          <div className="wrap">
            <div className="section-head">
              <p className="label">What we found</p>
              <h2 id="found-h">An average would have hidden all of this</h2>
            </div>
            <Findings pilot={pilot} />
          </div>
        </section>
      )}

      <section className="section" aria-labelledby="how-h">
        <div className="wrap">
          <div className="section-head">
            <p className="label">How it works</p>
            <h2 id="how-h">The same class, the same test, every tool</h2>
          </div>
          <ol className="grid" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {STEPS.map(([title, text], i) => (
              <li className="card" key={title}>
                <span className="step-num">0{i + 1}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
          <p style={{ marginTop: 24 }}><Link className="btn" to="/method">Read the full method <Arrow /></Link></p>
        </div>
      </section>

      {ratings && tutors && (
        <section className="section" aria-labelledby="demo-h">
          <div className="wrap">
            <div className="section-head">
              <p className="label">Testing the test</p>
              <h2 id="demo-h">It catches the flaws we planted</h2>
              <p>
                Before trusting it on real tools, we built five demo tools, each with a known strength or flaw, and taught the full class of 30 with each one.
                The scores came out the way the flaws predict.
              </p>
            </div>
            <DemoTools ratings={ratings} tutors={tutors} />
            <p className="note">150 lessons with real AI. Marks are the average gain out of 10 between the first test and the second.</p>
          </div>
        </section>
      )}

      {validation && ratings && (
        <section className="section" aria-labelledby="real-h">
          <div className="wrap">
            <div className="section-head">
              <p className="label">Evidence</p>
              <h2 id="real-h">Checked against a real class</h2>
              <p>Simulated students are only useful if they behave like real ones, so we tested that.</p>
            </div>
            <RealClass validation={validation} ratings={ratings} />
            <p style={{ marginTop: 24 }}><Link className="btn" to="/evidence">See every result <Arrow /></Link></p>
          </div>
        </section>
      )}
    </>
  )
}
