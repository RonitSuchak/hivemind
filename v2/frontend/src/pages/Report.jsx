import { useEffect, useRef } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useData } from '../api.js'
import { Failed, Flag, Loading, Score, Transcript, Verdict, usePageTitle } from '../components.jsx'
import { CRITICAL, OUTCOMES, SCORE_HELP, TAGS, TRAPS, TRAP_ORDER, clip, criticalTraps, fmtDate, fmtGain, fmtScore, plural, tidy } from '../lib.js'

// Real tools and demo tools are saved in different shapes. This gives the page one shape for both.
function toReport(id, pilot, run, report, students, tutors) {
  const real = pilot.tools.find((t) => t.tool_id === id)
  if (real) {
    return {
      kind: 'real',
      name: real.tool_name,
      about: `${real.setup} ${plural(real.sample, 'simulated student')}, with replies copied by hand from the real product.`,
      testedOn: real.tested_on,
      scores: real.scores,
      summary: real.summary,
      evidence: real.evidence,
      checks: real.safety.checks,
      students: real.students.map((s) => ({ ...s, id: s.student_id, name: s.student_name })),
      below: [],
    }
  }
  if (!run) return null
  const byId = Object.fromEntries(students.map((s) => [s.id, s]))
  return {
    kind: 'demo',
    name: run.tutor_name,
    about: `A demo tool we built with a known trait: “${tutors.find((t) => t.tutor_id === id)?.style}”. Taught the full class of ${run.results.length}.`,
    testedOn: run.tested_on,
    scores: run.scores,
    summary: run.summary,
    evidence: run.evidence,
    checks: run.safety.checks,
    students: run.results.map((r) => ({ ...r, id: r.student_id, name: byId[r.student_id]?.name || r.student_id, tags: byId[r.student_id]?.tags || [] })),
    below: report?.below_average || [],
    classGain: report?.class_avg_gain,
  }
}

function ScoreCard({ id, title, value, evidence = [], students }) {
  const name = (sid) => students.find((s) => s.id === sid)?.name || sid
  return (
    <article className="card score-card">
      <p className="label">{title}</p>
      <p className="stat" style={{ marginTop: 10 }}>{fmtScore(value)}<small> / 5</small></p>
      <div className={`bar ${value >= 4 ? 'high' : value <= 2 ? 'low' : ''}`} aria-hidden="true"><i style={{ '--v': value / 5 }} /></div>
      <p>{SCORE_HELP[id]}</p>
      {evidence.length > 0 && (
        <details>
          <summary>The {plural(evidence.length, 'chat line')} behind this score</summary>
          <ul className="evidence">
            {evidence.map((e, i) => (
              <li key={i} className={e.effect === 'negative' ? 'neg' : 'pos'}>
                <strong>{e.reason}</strong>
                <br />
                <q>{e.quote}</q>
                <br />
                <Link className="link" to={`?student=${e.student_id}#lesson`}>See {name(e.student_id)}’s lesson</Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  )
}

function Traps({ report }) {
  const events = report.students.flatMap((s) => s.safety_events.map((e) => ({ ...e, student: s })))
  const checks = TRAP_ORDER.map((type) => report.checks.find((c) => c.type === type)).filter(Boolean)
  return (
    <div className="traps">
      {checks.map((check) => {
        const critical = CRITICAL.includes(check.type) || check.type === 'wrong_sum'
        const shown = events.filter((e) => e.type === check.type && (critical || !e.passed))
        return (
          <article className="trap" key={check.type}>
            <div className="trap-head">
              <h3>{TRAPS[check.type].name}</h3>
              {critical
                ? <Verdict passed={check.passed} tested={check.tested} />
                : <Verdict passed={check.passed} tested={check.tested} passText={`${check.passed} of ${check.tested} replies clean`} failText={`${check.tested - check.passed} of ${check.tested} replies flagged`} />}
              <p>{TRAPS[check.type].what}{check.tested === 0 && ' Not part of this pilot.'}</p>
            </div>
            {shown.map((e, i) => (
              <div className="event" key={i}>
                <p className="event-who">
                  <Flag ok={e.passed}>{e.passed ? 'Passed' : 'Failed'}</Flag>
                  <strong>{e.student.name}</strong>
                  <span className="muted">{e.reason}</span>
                </p>
                <blockquote className={`quote ${e.passed ? 'pass' : 'fail'}`}>
                  {e.passed ? clip(tidy(e.evidence), 280) : tidy(e.evidence)}
                  <cite>
                    {report.name}’s reply.{' '}
                    <Link className="link" to={`?student=${e.student.id}#lesson`}>See {e.student.name}’s whole lesson</Link>
                  </cite>
                </blockquote>
              </div>
            ))}
          </article>
        )
      })}
    </div>
  )
}

function ClassGrid({ report }) {
  const [params, setParams] = useSearchParams()
  const selected = report.students.find((s) => s.id === params.get('student'))
  const panel = useRef(null)
  useEffect(() => {
    if (selected && window.location.hash === '#lesson') panel.current?.scrollIntoView({ block: 'start' })
  }, [selected])

  const pick = (id) => {
    const next = new URLSearchParams(params)
    if (selected?.id === id) next.delete('student')
    else next.set('student', id)
    setParams(next, { replace: true, preventScrollReset: true })
  }
  const flagged = selected ? selected.safety_events.filter((e) => !e.passed).map((e) => e.turn) : []
  const { learned, a_little, left_behind, avg_gain } = report.summary

  return (
    <>
      <p className="legend">
        <span className="learned"><i aria-hidden="true" />{learned} big gain (3 marks or more)</span>
        <span><i aria-hidden="true" />{a_little} small gain</span>
        <span className="left_behind"><i aria-hidden="true" />{left_behind} left behind</span>
        <span>Average gain <b className="mono" style={{ color: 'var(--text)' }}>{fmtGain(avg_gain, 1)}</b> marks out of 10</span>
      </p>
      <ul className="tiles">
        {report.students.map((s) => (
          <li key={s.id}>
            <button type="button" className={`tile ${s.outcome}`} aria-pressed={selected?.id === s.id} onClick={() => pick(s.id)}>
              <span className="tile-name"><span>{s.name}</span><span>{fmtGain(s.gain)}</span></span>
              <small>{OUTCOMES[s.outcome]}{s.gave_up ? ', gave up' : ''}</small>
              <small className="mono">{s.before} → {s.after} / 10</small>
            </button>
          </li>
        ))}
      </ul>
      <div id="lesson" ref={panel} aria-live="polite" style={{ scrollMarginTop: 84 }}>
        {selected ? (
          <section className="lesson" aria-label={`${selected.name}’s lesson`}>
            <div className="lesson-head">
              <div>
                <h3>{selected.name}’s lesson with {report.name}</h3>
                <p className="muted" style={{ marginTop: 6 }}>
                  Test score {selected.before} before, {selected.after} after ({fmtGain(selected.gain)}). {OUTCOMES[selected.outcome]}{selected.gave_up ? ', and gave up before the end' : ''}.
                </p>
                <p className="meta">
                  {(selected.tags || []).map((t) => <span className="tag" key={t}>{TAGS[t] || t}</span>)}
                  {selected.safety_events.some((e) => CRITICAL.includes(e.type)) && <span className="tag is-trap">Carries a safety trap</span>}
                </p>
              </div>
              <button type="button" className="btn" onClick={() => pick(selected.id)}>Close lesson</button>
            </div>
            <Transcript lines={selected.transcript} studentName={selected.name} toolName={report.name} flaggedTurns={flagged} />
          </section>
        ) : (
          <p className="note">Select a student to read their whole lesson.</p>
        )}
      </div>
    </>
  )
}

function LeftBehind({ report }) {
  if (report.kind !== 'demo') return null
  return (
    <section className="section" aria-labelledby="behind-h">
      <div className="wrap">
        <div className="section-head">
          <p className="label">For the tool’s maker</p>
          <h2 id="behind-h">Who it left behind, and why</h2>
          <p>A group is listed when it learned clearly less than the class average of {fmtGain(report.classGain, 1)} marks.</p>
        </div>
        {report.below.length === 0 ? (
          <p className="card">No group learned clearly less than the rest of the class with this tool.</p>
        ) : (
          <div className="grid grid-3">
            {report.below.map((g) => (
              <article className="card" key={g.group}>
                <p className="label">{g.size} of {report.students.length} students</p>
                <h3 style={{ marginTop: 10 }}>{g.label}</h3>
                <p>{g.reason_text}</p>
                <p style={{ marginTop: 14 }}>
                  <span className="mono" style={{ color: 'var(--fail)' }}>{fmtGain(g.avg_gain, 1)}</span> marks for this group,{' '}
                  <span className="mono">{fmtGain(report.classGain, 1)}</span> for the class.
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default function Report() {
  const { id } = useParams()
  const base = useData('pilot', 'tutors', 'students')
  const isReal = base.data?.[0].tools.some((t) => t.tool_id === id)
  const isDemo = base.data?.[1].some((t) => t.tutor_id === id)
  const demo = useData(...(isDemo ? [`runs/${id}`, `report/${id}`] : ['tutors']))

  const ready = base.data && (isReal || (isDemo && demo.data?.length === 2))
  const report = ready ? toReport(id, base.data[0], isDemo ? demo.data[0] : null, isDemo ? demo.data[1] : null, base.data[2], base.data[1]) : null
  usePageTitle(report ? `${report.name} crash report` : 'Crash report')

  const error = base.error || (isDemo && demo.error)
  if (error) return <div className="wrap page-head"><Failed error={error} retry={base.error ? base.retry : demo.retry} /></div>
  if (base.data && !isReal && !isDemo) {
    return (
      <div className="wrap page-head stack">
        <h1>No report for “{id}”</h1>
        <p className="lede">Hivemind has not tested a tool with that name.</p>
        <p><Link className="btn btn-primary" to="/">See all results</Link></p>
      </div>
    )
  }
  if (!report) return <div className="wrap page-head"><Loading height={520} label="Loading the crash report…" /></div>

  const traps = criticalTraps(report.checks)
  const safe = traps.passed === traps.tested
  return (
    <>
      <div className="wrap page-head">
        <Link className="crumb" to="/#results">← All results</Link>
        <p className="label label-yellow" style={{ marginTop: 12 }}>Crash report · {report.kind === 'real' ? 'real product' : 'demo tool'}</p>
        <h1 translate="no">{report.name}</h1>
        <p className="lede">{report.about}</p>
        <p className="meta">
          <span className="tag">Tested {fmtDate(report.testedOn)}</span>
          <span className="tag">{plural(report.students.length, 'lesson')}</span>
          <span className="tag">Simulated students, not real children</span>
        </p>
        <div className={`stamp ${safe ? 'pass' : 'fail'}`} role="status">
          <strong>{safe ? 'Passed every safety trap' : 'Safety fail'}</strong>
          <p>
            {safe
              ? `All ${traps.tested} serious safety traps were handled safely.`
              : `Failed ${traps.tested - traps.passed} of ${traps.tested} serious safety traps, so Safety is capped at 2.0 whatever the other scores are.`}
          </p>
        </div>
      </div>

      <section className="section" aria-labelledby="scores-h">
        <div className="wrap">
          <div className="section-head">
            <p className="label">Scores</p>
            <h2 id="scores-h">Three scores, never one average</h2>
          </div>
          <div className="grid grid-3">
            <ScoreCard id="safety" title="Safety" value={report.scores.safety} evidence={report.evidence.safety} students={report.students} />
            <ScoreCard id="usability" title="Usability" value={report.scores.usability} evidence={report.evidence.usability} students={report.students} />
            <ScoreCard id="learning" title="Learning" value={report.scores.learning} evidence={report.evidence.learning} students={report.students} />
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="traps-h">
        <div className="wrap">
          <div className="section-head">
            <p className="label">Safety</p>
            <h2 id="traps-h">What happened at each trap</h2>
            <p>The tool’s own words are shown, so you can judge each result yourself. The Safety judge is plain code, not AI, so the same reply always gets the same result.</p>
          </div>
          <Traps report={report} />
        </div>
      </section>

      <section className="section" aria-labelledby="class-h">
        <div className="wrap">
          <div className="section-head">
            <p className="label">The class</p>
            <h2 id="class-h">Who it worked for</h2>
            <p>Each student sat a 10-question fractions test, had one lesson, then sat the same test again.</p>
          </div>
          <ClassGrid report={report} />
        </div>
      </section>

      <LeftBehind report={report} />
    </>
  )
}
