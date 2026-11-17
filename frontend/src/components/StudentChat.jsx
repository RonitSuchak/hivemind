import { useEffect, useRef } from 'react'
import Radar from './Radar.jsx'
import Icon from './Icon.jsx'
import BestTools from './BestTools.jsx'
import { getStudentTools, isHidden } from '../api.js'
import { useLoad } from '../hooks.js'
import { fromBackend, mostEffective, teaches } from '../data/tools.js'
import { OutcomeTag } from './OutcomeShape.jsx'
import { MOMENT_LABEL, TYPE, flagLabel, moveLabel, plainWords, safetyLabel, studentTags, tagLabel, tagNote, typeName } from '../labels.js'

// Drawer content for one simulated student: who they are, what changed, the three websites that suit
// them (ordered by how they did with each demo tool, see bestToolsFor in data/tools.js), and the lesson tucked away below.
// Every tutor and student line is rendered as plain text (React text nodes), never as HTML.
// Safety marks (a failed check, a safety moment, an "unsafe reply" flag) show only when `safety` is set.
// Only the real-tool pilot sets it. A chat with a demo tool never shows them.

// A failed event quotes the tutor's words, sometimes cut short with "…". Match the reply by prefix.
const andList = (xs) => (xs.length < 2 ? xs[0] ?? '' : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)
const listTypes = (ids) => andList(ids.map((id) => typeName(id)))
const stem = (s) => String(s || '').replace(/[….]+\s*$/, '').trim()

// Which type of tool taught this student most, and real tools of that type. This is the lab's own answer
// (GET /api/real-tools?student=id): `best` names the top type or tied types, or says no type helped, and `tools`
// is already in the lab's order for this student. The site only leaves out study helpers and shows the first three.
// If that call fails (an older backend), the same rule runs here on the gains the page already has.
function useBest(student, gains, hide) {
  const load = useLoad(() => (hide ? Promise.resolve(null) : getStudentTools(student.id)), [student.id, hide])
  if (hide) return { known: false }
  if (load.status === 'error') return mostEffective(gains)
  const b = load.status === 'ok' ? load.data?.best : null
  if (!b) return { known: false }
  const groups = (b.tutor_ids || []).filter((id) => !isHidden(id)) // hidden tools never show
  if (!b.none && !groups.length) return { known: false }
  const items = (load.data.tools || []).filter((t) => groups.includes(t.type?.tutor_id)).map(fromBackend).filter(teaches).slice(0, 3).map((tool) => ({ tool }))
  return { known: true, none: !!b.none || items.length === 0, groups, items }
}

export default function StudentDetail({ student, result, tutorName, gains, focusTurn = null, hideBest = false, safety = false }) {
  const best = useBest(student, gains, hideBest)
  // A demo tool's own name becomes "the Guided hints demo tool". A named product keeps its name.
  const typed = plainWords(tutorName)
  const toolWords = Object.values(TYPE).some((t) => t.name === typed) ? `the ${typed} demo tool` : tutorName
  const failed = safety ? (result.safety_events || []).filter((e) => !e.passed) : []
  const stems = failed.map((e) => [stem(e.evidence), e]).filter(([s]) => s.length > 8)
  // Opened from an evidence line: the tool's reply on that turn gets marked and scrolled into view.
  const target = focusTurn == null ? -1 : result.transcript.findIndex((m) => m.from === 'tutor' && m.turn === focusTurn)
  const flags = safety ? result.flags : result.flags.filter((f) => f !== 'unsafe_reply')
  const lesson = useRef(null)
  const line = useRef(null)
  useEffect(() => {
    if (target < 0) return
    if (lesson.current) lesson.current.open = true
    // Instant: smooth scrolling does nothing while the drawer is still sliding in
    line.current?.scrollIntoView({ block: 'center', behavior: 'instant' })
  }, [target, student.id])
  const failedFor = (m) => (m.from === 'tutor' ? stems.find(([s]) => String(m.text).startsWith(s))?.[1] : undefined)

  return (
    <div className="lx-student">
      <div className="lx-student-top">
        <div className="lx-student-radar">
          <Radar profile={student} compact staged label={`${student.name}'s learning profile`} />
        </div>
        <div className="lx-student-facts">
          <p className="lx-ba" aria-label={`Test score ${result.before} before, ${result.after} after, out of 10`}>
            <span className="lx-ba-num">{result.before}</span>
            <Icon name="arrow" size={20} />
            <span className="lx-ba-num">{result.after}</span>
            <span className="lx-ba-of">of 10</span>
          </p>
          <p className="lx-ba-gain">Gained {result.gain} {result.gain === 1 ? 'point' : 'points'}</p>
          <OutcomeTag outcome={result.outcome} />
          {result.gave_up && <p className="lx-muted-sm">Gave up before the lesson ended.</p>}
        </div>
      </div>

      <ul className="lx-chips" aria-label="Learning profile">
        {studentTags(student).map((t) => <li key={t} className="lx-chip" title={tagNote(t)}>{tagLabel(t)}</li>)}
      </ul>
      {flags.length > 0 && (
        <ul className="lx-chips" aria-label="Problems found">
          {flags.map((f) => <li key={f} className="lx-chip lx-chip-flag">{flagLabel(f)}</li>)}
        </ul>
      )}

      {best.known && (best.none ? (
        <p className="lx-best-nothing"><Icon name="info" size={16} /> <span>No type of tool helped {student.name} gain a point in this lesson, so no sites are suggested.</span></p>
      ) : (
        <BestTools title={best.groups.length > 1 ? `${student.name} gained the same with ${listTypes(best.groups)} tools` : `${student.name} gained most with ${listTypes(best.groups)} tools`}
          note={`The sites are examples of ${best.groups.length > 1 ? 'those types' : 'this type'}. They have not been tested themselves.`}
          items={best.items.map(({ tool }) => ({ tool, line: '' }))} />
      ))}

      <details className="lx-lesson" ref={lesson}>
        <summary><span>Read the lesson with {toolWords}</span><span className="lx-muted-sm">{result.transcript.length} messages</span></summary>
      <ol className="lx-chat">
        {result.transcript.map((m, i) => {
          const isTutor = m.from === 'tutor'
          const ev = failedFor(m)
          const moment = safety && !isTutor && m.safety_moment
          return (
            <li key={i} className="lx-msg" data-from={isTutor ? 'tutor' : 'student'} data-moment={moment ? '' : undefined} data-failed={ev ? '' : undefined}
              data-evidence={i === target ? '' : undefined} ref={i === target ? line : undefined}>
              {moment && (
                <p className="lx-moment"><Icon name="shield" size={13} /> Safety moment: {MOMENT_LABEL[m.safety_moment] || m.safety_moment}</p>
              )}
              <p className="lx-msg-meta">
                <span className="lx-msg-who">{isTutor ? 'Tool' : student.name}</span>
                {isTutor && m.move && <span className="lx-move">{moveLabel(m.move)}</span>}
                {isTutor && m.reading_age != null && <span className="lx-reading">Reading age {m.reading_age}</span>}
              </p>
              <p className="lx-msg-text">{m.text}</p>
              {i === target && <p className="lx-msg-ev">Evidence line</p>}
              {ev && (
                <p className="lx-msg-fail">
                  <Icon name="warn" size={14} /> Failed the {safetyLabel(ev.type).toLowerCase()} check
                  {ev.needs_review && <span className="lx-review">Needs review</span>}
                </p>
              )}
            </li>
          )
        })}
      </ol>
      </details>
    </div>
  )
}
