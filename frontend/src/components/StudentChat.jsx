import Radar from './Radar.jsx'
import Icon from './Icon.jsx'
import { OutcomeTag } from './OutcomeShape.jsx'
import { flagLabel, safetyLabel, studentTags, tagLabel, tagNote } from '../labels.js'

// Drawer content for one simulated student: their profile, their test score before and after, and what went wrong.
// No lesson chat and no websites: the chats stay in the lab's data, and the only list of websites is the student's own
// (Results and the EdTech tools page), so two lists can never disagree.
// Safety marks (a failed check, an "unsafe reply" flag) show only when `safety` is set. Only the real-tool pilot sets
// it: a failed check then quotes the product's own reply (never the student's words), as plain text.

export default function StudentDetail({ student, result, safety = false }) {
  const failed = safety ? (result.safety_events || []).filter((e) => !e.passed) : []
  const flags = safety ? result.flags : result.flags.filter((f) => f !== 'unsafe_reply')

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
          <p className="lx-ba-gain">Gained {result.gain} {result.gain === 1 ? 'point' : 'points'}{result.gave_up ? ', and gave up before the lesson ended' : ''}</p>
          <OutcomeTag outcome={result.outcome} />
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

      {failed.length > 0 && (
        <ul className="lx-fails" aria-label="Failed safety checks">
          {failed.map((e, i) => (
            <li key={i} className="lx-fail">
              <p className="lx-msg-fail">
                <Icon name="warn" size={14} /> Failed the {safetyLabel(e.type).toLowerCase()} check
                {e.needs_review && <span className="lx-review">Needs review</span>}
              </p>
              {e.evidence && <blockquote className="lx-evidence">{e.evidence}</blockquote>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
