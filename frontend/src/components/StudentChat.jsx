import Radar from './Radar.jsx'
import Icon from './Icon.jsx'
import BestTools from './BestTools.jsx'
import { mostEffective } from '../data/tools.js'
import { OutcomeTag } from './OutcomeShape.jsx'
import { MOMENT_LABEL, flagLabel, moveLabel, safetyLabel, tagLabel, typeName } from '../labels.js'

// Drawer content for one simulated student: who they are, what changed, the three websites that suit
// them (ordered by how they did with each demo tool, see bestToolsFor in data/tools.js), and the lesson tucked away below.
// Every tutor and student line is rendered as plain text (React text nodes), never as HTML.

// A failed event quotes the tutor's words, sometimes cut short with "…". Match the reply by prefix.
const andList = (xs) => (xs.length < 2 ? xs[0] ?? '' : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)
const listTypes = (ids) => andList(ids.map((id) => typeName(id)))
const listNames = (ids, names) => andList(ids.map((id) => names[id] || typeName(id)))
const stem = (s) => String(s || '').replace(/[….]+\s*$/, '').trim()

export default function StudentDetail({ student, result, tutorName, gains, flagged = [], names = {} }) {
  const best = mostEffective(gains, { flagged })
  const failed = result.safety_events.filter((e) => !e.passed)
  const stems = failed.map((e) => [stem(e.evidence), e]).filter(([s]) => s.length > 8)
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
        {student.tags.map((t) => <li key={t} className="lx-chip">{tagLabel(t)}</li>)}
      </ul>
      {result.flags.length > 0 && (
        <ul className="lx-chips" aria-label="Problems found">
          {result.flags.map((f) => <li key={f} className="lx-chip lx-chip-flag">{flagLabel(f)}</li>)}
        </ul>
      )}

      {best.known && (best.none ? (
        <p className="lx-best-nothing"><Icon name="info" size={16} /> <span>No type of tool helped {student.name} gain a point in this lesson, so no sites are suggested.</span></p>
      ) : (
        <BestTools title={`Most effective for ${student.name}: ${listTypes(best.groups)} sites${best.groups.length > 1 ? ' (a tie)' : ''}`}
          note={`${student.name} gained most with ${listNames(best.groups, names)}, our demo ${best.groups.length > 1 ? 'tools for these types' : 'tool for this type'}. The sites are examples of ${best.groups.length > 1 ? 'those types' : 'this type'}. They have not been tested themselves.`}
          items={best.items.map(({ tool }) => ({ tool, line: '' }))} />
      ))}

      <details className="lx-lesson">
        <summary><span>Read the lesson with {tutorName}</span><span className="lx-muted-sm">{result.transcript.length} messages</span></summary>
      <ol className="lx-chat">
        {result.transcript.map((m, i) => {
          const isTutor = m.from === 'tutor'
          const ev = failedFor(m)
          const moment = !isTutor && m.safety_moment
          return (
            <li key={i} className="lx-msg" data-from={isTutor ? 'tutor' : 'student'} data-moment={moment ? '' : undefined} data-failed={ev ? '' : undefined}>
              {moment && (
                <p className="lx-moment"><Icon name="shield" size={13} /> Safety moment: {MOMENT_LABEL[m.safety_moment] || m.safety_moment}</p>
              )}
              <p className="lx-msg-meta">
                <span className="lx-msg-who">{isTutor ? 'Tool' : student.name}</span>
                {isTutor && m.move && <span className="lx-move">{moveLabel(m.move)}</span>}
                {isTutor && m.reading_age != null && <span className="lx-reading">Reading age {m.reading_age}</span>}
              </p>
              <p className="lx-msg-text">{m.text}</p>
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
