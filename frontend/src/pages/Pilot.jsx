import { useMemo, useState } from 'react'
import { getPilot, getStudents } from '../api.js'
import { useInView, useLoad, usePageTitle } from '../hooks.js'
import { checkResult, day, plainWords, safetyLabel, tagLabel } from '../labels.js'
import { Async, SkeletonRatings, Unavailable } from '../components/States.jsx'
import ScoreBars, { SafetyBadge } from '../components/ScoreBars.jsx'
import Reveal, { RevealGroup } from '../components/Reveal.jsx'
import Drawer from '../components/Drawer.jsx'
import StudentDetail from '../components/StudentChat.jsx'
import Icon from '../components/Icon.jsx'
import { OutcomeTag } from '../components/OutcomeShape.jsx'
import '../styles/lab.css'
import { evidenceLine } from '../evidence.js'
import '../styles/pilot.css'

// Real EdTech products, tested on 3 simulated students (GET /api/pilot, docs/BACKEND.md 5.20).
// A person copied each student line into the real tool and pasted the reply back; the normal lab marked it.
// Rules from the contract: show `note` wherever the scores appear, scores only when status is "done",
// and never mix these tools into the ratings or the match.

const clip = (s, n = 230) => { const t = String(s).replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n).replace(/\s\S*$/, '')}…` : t }
const pts = (n) => `${n} ${n === 1 ? 'point' : 'points'}`

// One line that says how the 3 students did, biggest group first.
function outcomeLine(s) {
  const parts = [[s.learned, 'big gain'], [s.a_little, 'small gain'], [s.left_behind, 'left behind']].filter(([n]) => n > 0)
  return parts.map(([n, w]) => `${n} ${w}`).join(', ')
}

// The single quote worth showing on the card: a failed safety check first, then a safety pass, then a reply that made someone think.
function keyEvidence(tool) {
  const ev = tool.evidence || {}
  const pick = (k, effect) => (ev[k] || []).find((e) => e.effect === effect)
  const fail = pick('safety', 'negative')
  if (fail) return { ...fail, kind: 'fail' }
  const pass = pick('safety', 'positive')
  if (pass) return { ...pass, kind: 'pass' }
  const learn = pick('learning', 'positive')
  return learn ? { ...learn, kind: 'pass' } : null
}

export default function Pilot() {
  usePageTitle('Real tools')
  const load = useLoad(() => Promise.all([getPilot(), getStudents()]), [])
  return (
    <Async state={load} label="Loading the real tools" skeleton={<SkeletonRatings />} className="lab-body"
      unavailable={<Offline />}>
      {([pilot, students]) => <Body pilot={pilot} students={students} />}
    </Async>
  )
}

const HEAD = (
  <div className="lx-sec-head">
    <h2 id="pl-h">A first test of real tools</h2>
    <p>Three simulated students each had one lesson with real EdTech products. The lab marked every reply the same way as for our demo tools.</p>
  </div>
)

function Offline() {
  return (
    <section className="lx-sec pl" aria-labelledby="pl-h">
      {HEAD}
      <div className="glass lx-offline-panel">
        <Unavailable shape="bars">The lab is not connected, so there are no real tool results to show.</Unavailable>
      </div>
    </section>
  )
}

function Body({ pilot, students }) {
  const byId = useMemo(() => Object.fromEntries((Array.isArray(students) ? students : []).map((s) => [s.id, s])), [students])
  // The lab's own order, as sent: the site never ranks pilot tools (docs/BACKEND.md 5.20).
  const done = useMemo(() => pilot.tools.filter((t) => t.status === 'done' && t.scores), [pilot])
  const waiting = pilot.tools.filter((t) => !(t.status === 'done' && t.scores))
  const [open, setOpen] = useState(null) // { tool, lesson, turn }

  const student = open ? byId[open.lesson.student_id] : null
  return (
    <div className="lx-ratings pl">
      <section className="lx-sec" aria-labelledby="pl-h">
        <Reveal>{HEAD}</Reveal>
        <Reveal blur={false} className="glass pl-note" role="note">
          <Icon name="info" size={18} />
          <p>{plainWords(pilot.note)}</p>
        </Reveal>
      </section>

      <section className="lx-sec" aria-labelledby="pl-st-h">
        <Reveal className="lx-sec-head">
          <h2 id="pl-st-h">The three students</h2>
          <p>Picked so the test covers most kinds of student, plus one safety trap.</p>
        </Reveal>
        <RevealGroup as="ul" className="pl-students">
          {pilot.students.map((s) => (
            <Reveal as="li" key={s.id} blur={false} className="glass pl-student">
              <p className="pl-student-name">{s.name}{s.safety_moment && <span className="pl-trap"><Icon name="shield" size={13} /> Safety trap</span>}</p>
              <p className="pl-student-why">{plainWords(s.why)}</p>
              <ul className="lx-chips" aria-label="Learning profile">
                {s.tags.map((t) => <li key={t} className="lx-chip">{tagLabel(t)}</li>)}
              </ul>
            </Reveal>
          ))}
        </RevealGroup>
      </section>

      <section className="lx-sec" aria-labelledby="pl-res-h">
        <Reveal className="lx-sec-head">
          <h2 id="pl-res-h">How each tool did</h2>
          <p>Each tool has a Safety, a Usability and a Learning score, kept separate. A serious safety fail is marked.</p>
        </Reveal>
        {done.length ? (
          <RevealGroup className="lx-score-grid">
            {done.map((t) => <ToolCard key={t.tool_id} tool={t} names={byId} onOpen={(lesson) => setOpen({ tool: t, lesson })} />)}
          </RevealGroup>
        ) : (
          <div className="glass lx-offline-panel"><Unavailable shape="bars">No real tool has finished all three lessons yet.</Unavailable></div>
        )}
      </section>

      {done.length > 0 && (
        <section className="lx-sec" aria-labelledby="pl-same-h">
          <Reveal className="lx-sec-head">
            <h2 id="pl-same-h">The same student, each tool</h2>
            <p>Test scores out of 10, before and after one lesson. Each row is one student. Open a cell to read that lesson.</p>
          </Reveal>
          <Reveal blur={false} className="glass pl-same-wrap" role="region" aria-labelledby="pl-same-h" tabIndex={0}>
            <table className="pl-same">
              <thead>
                <tr>
                  <th scope="col">Student</th>
                  {done.map((t) => <th scope="col" key={t.tool_id}>{t.tool_name}</th>)}
                </tr>
              </thead>
              <tbody>
                {pilot.students.map((s) => (
                  <tr key={s.id}>
                    <th scope="row">{s.name}</th>
                    {done.map((t) => {
                      const l = t.students.find((x) => x.student_id === s.id)
                      return (
                        <td key={t.tool_id}>
                          {l ? (
                            <button type="button" className="pl-cell" onClick={() => setOpen({ tool: t, lesson: l })}
                              aria-label={`${s.name} with ${t.tool_name}: ${l.before} to ${l.after} out of 10${l.gave_up ? ', gave up' : ''}. Open the lesson`}>
                              <span className="pl-cell-ba">{l.before} <Icon name="arrow" size={12} /> {l.after}</span>
                              <OutcomeTag outcome={l.outcome} />
                              {l.gave_up && <span className="pl-cell-note">Gave up</span>}
                            </button>
                          ) : <span className="lx-muted-sm">No lesson</span>}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>
          <p className="lx-text">A student who gave up counts as left behind, whatever their marks.</p>
        </section>
      )}

      {waiting.length > 0 && (
        <Reveal as="section" className="lx-sec" aria-labelledby="pl-wait-h">
          <div className="lx-sec-head">
            <h2 id="pl-wait-h">Still to test</h2>
            <p>These are set up and get scores once all three lessons are done.</p>
          </div>
          <ul className="pl-waiting">
            {waiting.map((t) => (
              <li key={t.tool_id} className="pl-wait">
                <span>{t.tool_name}</span>
                <span className="lx-muted-sm">{t.status === 'in_progress' ? `${t.lessons_done} of 3 lessons` : 'Not tested yet'}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      )}

      <Drawer open={!!open && !!student} onClose={() => setOpen(null)}
        title={student?.name ?? ''}
        subtitle={student ? `Simulated student, lesson with ${open.tool.tool_name}` : ''}>
        {open && student && <StudentDetail student={student} result={open.lesson} safety />}
      </Drawer>
    </div>
  )
}

function ToolCard({ tool, names, onOpen }) {
  const [ref, inView] = useInView()
  const ev = keyEvidence(tool)
  const lessonFor = (id) => tool.students.find((l) => l.student_id === id)
  const who = ev ? (names[ev.student_id]?.name ?? 'the student') : ''
  // A failed check that only a rule has judged so far (the lesson's safety_events carry needs_review).
  const review = tool.students.some((l) => (l.safety_events || []).some((e) => !e.passed && e.needs_review))
  // A failing reply is shown whole (from the saved lesson), so nothing that softens it is cut off.
  const line = ev ? evidenceLine(tool.students, ev) : null
  const whole = ev?.kind === 'fail' ? line?.text : null
  const quote = line?.from === 'student' ? null : (whole ?? (ev?.quote ? clip(ev.quote) : null)) // never a student's words
  return (
    <Reveal as="article" blur={false} className="glass lx-score-card pl-card" data-fail={tool.safety?.critical_fail ? '' : undefined}>
      <header>
        <h3>{tool.tool_name}</h3>
        {tool.safety?.critical_fail && <SafetyBadge>{review ? 'Safety fail, needs review' : 'Safety fail'}</SafetyBadge>}
      </header>
      <p className="pl-meta">Tested {day(tool.tested_on)}. Average gain {pts(tool.summary.avg_gain)}: {outcomeLine(tool.summary)}.</p>
      <div ref={ref}>
        <ScoreBars scores={tool.scores} safety grow play={inView} explain />
      </div>
      {tool.safety?.checks?.length > 0 && (
        <details className="pl-basis">
          <summary>What this Safety score rests on</summary>
          <ul>
            {tool.safety.checks.map((c) => (
              <li key={c.type} data-empty={c.tested === 0 ? '' : undefined}><span>{safetyLabel(c.type)}</span><span>{c.tested === 0 ? 'Not tested in this pilot' : checkResult(c)}</span></li>
            ))}
          </ul>
        </details>
      )}

      {ev && (
        <figure className="pl-quote" data-kind={ev.kind}>
          <figcaption>
            <Icon name={ev.kind === 'fail' ? 'warn' : 'check'} size={15} />
            <span>{plainWords(ev.reason)}</span>
          </figcaption>
          {quote && <blockquote className={whole ? 'pl-whole' : undefined}>&ldquo;{quote}&rdquo;</blockquote>}
          {ev.kind === 'fail' && review && <p className="pl-review"><strong>Needs review.</strong> A simple rule flagged this reply, and a person has not confirmed it yet. Read the whole reply and judge for yourself.</p>}
          {lessonFor(ev.student_id) && (
            <button type="button" className="link-quiet" onClick={() => onOpen(lessonFor(ev.student_id))}>
              See {who}&rsquo;s results
            </button>
          )}
        </figure>
      )}

      <div className="pl-lessons">
        <p className="lx-muted-sm">Each lesson</p>
        <ul>
          {tool.students.map((l) => (
            <li key={l.student_id}>
              <button type="button" className="pl-lesson" onClick={() => onOpen(l)}
                aria-label={`${l.student_name}: ${l.before} to ${l.after} out of 10. Open the lesson`}>
                <span className="pl-lesson-name">{l.student_name}</span>
                <span className="pl-lesson-ba">{l.before} <Icon name="arrow" size={12} /> {l.after}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <p className="pl-small">{plainWords(tool.note)}</p>
    </Reveal>
  )
}
