import { Link, NavLink, useParams } from 'react-router-dom'
import { getReport, getStudents, getTutors } from '../api.js'
import { useInView, useLoad, usePageTitle } from '../hooks.js'
import { day, groupPeople, moveLabel, plainWords, typeName } from '../labels.js'
import { Async, SkeletonRatings, Unavailable } from '../components/States.jsx'
import ScoreBars from '../components/ScoreBars.jsx'
import Reveal, { RevealGroup } from '../components/Reveal.jsx'
import { OutcomeTag } from '../components/OutcomeShape.jsx'
import Icon from '../components/Icon.jsx'
import '../styles/lab.css'
import '../styles/report.css'

// The tool maker report (GET /api/report/{id}, docs/BACKEND.md 5.6). It has one job: show which groups of students
// gained clearly less than the class with this demo tool, and why. Every number and reason comes from the lab.
// The "place to start" lines are fixed general tips, not results.

const pts = (n) => `${n} ${n === 1 ? 'point' : 'points'}`
const fix = (n) => (typeof n === 'number' ? n.toFixed(1) : '')

const REASON = {
  too_hard_to_read: 'Too hard to read', gave_up: 'Gave up', gave_answer: 'Gave the answer away', off_topic: 'Went off topic',
  stuck: 'Got stuck', finished_early: 'Finished early',
}
const START = {
  too_hard_to_read: 'Use shorter sentences and simpler words.',
  gave_up: 'Give a smaller first step when a student is stuck.',
  gave_answer: 'Ask a question before giving the answer.',
  off_topic: 'Stay on the problem the student asked about.',
  stuck: 'Offer a hint after a wrong try.',
  finished_early: 'Add harder problems for students who finish fast.',
}

export default function Report() {
  const { tutorId } = useParams()
  usePageTitle('Tool maker report')
  const load = useLoad(async () => {
    const tutors = await getTutors()
    const list = Array.isArray(tutors) ? tutors : [] // a hidden tool is not in this list, so its address falls back to the first tool
    const id = list.some((t) => t.tutor_id === tutorId) ? tutorId : list[0]?.tutor_id
    if (!id) return { tutors: list, id: null }
    const [report, students] = await Promise.all([getReport(id), getStudents()])
    return { tutors: list, id, report, students }
  }, [tutorId])
  return (
    <Async state={load} label="Loading the report" skeleton={<SkeletonRatings />} className="lab-body" unavailable={<Offline />}>
      {(d) => (d.id ? <Body {...d} /> : <Offline />)}
    </Async>
  )
}

function Offline() {
  return (
    <section className="lx-sec rp" aria-labelledby="rp-off-h">
      <div className="lx-sec-head"><h2 id="rp-off-h">Tool maker report</h2></div>
      <div className="glass lx-offline-panel">
        <Unavailable shape="bars">The lab is not connected, so there is no report to show.</Unavailable>
      </div>
    </section>
  )
}

// A group is listed only when it gained clearly less than the class: this many points less, or more.
const CLEAR_GAP = 0.3

function Body({ tutors, id, report, students }) {
  const [scoresRef, scoresIn] = useInView()
  const count = Array.isArray(students) ? students.length : 0
  const below = (report.below_average || []).filter((g) => typeof g.gap === 'number' && g.gap <= -CLEAR_GAP)
  const name = typeName(report.tutor_id, report.tutor_name)

  return (
    <div className="lx-ratings rp">
      <nav aria-label="Choose a demo tool" className="rp-picker">
        <ul>
          {tutors.map((t) => (
            <li key={t.tutor_id}>
              <NavLink to={`/lab/report/${t.tutor_id}`} className="rp-pick" aria-current={t.tutor_id === id ? 'page' : undefined}>
                <span className="rp-pick-type">{typeName(t.tutor_id, t.tutor_name)}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <Reveal as="section" className="lx-sec" aria-labelledby="rp-h">
        <div className="lx-sec-head">
          <h2 id="rp-h">{`Report for the ${name} demo tool`}</h2>
          <p>This page is for the people who make a tool. It shows which students the tool left behind and why.</p>
          <p className="lx-muted-sm">Tested {day(report.tested_on)} on {count ? `${count} simulated students` : 'simulated students'}, not real children.</p>
        </div>
        <div className="rp-head-row">
          <Link to={`/lab?tutor=${id}`} className="link-quiet"><Icon name="users" size={15} /> See the class</Link>
        </div>
      </Reveal>

      <section className="lx-sec" aria-labelledby="rp-less-h">
        <Reveal className="lx-sec-head">
          <h2 id="rp-less-h">Who learned less</h2>
          <p>The class gained {pts(report.class_avg_gain)} out of 10 on average. A group is listed here when it gained at least {CLEAR_GAP} points less than that.</p>
        </Reveal>
        {below.length === 0 ? (
          <Reveal blur={false} className="glass rp-calm"><Icon name="check" size={18} className="ok" /><p>No group gained clearly less than the class with this demo tool.</p></Reveal>
        ) : (
          <RevealGroup as="ol" className="rp-groups">
            {below.map((g) => (
              <Reveal as="li" key={g.group} blur={false} className="glass rp-group">
                <GroupCard g={g} classGain={report.class_avg_gain} count={count} />
              </Reveal>
            ))}
          </RevealGroup>
        )}
      </section>

      <section className="lx-sec" aria-labelledby="rp-sc-h">
        <Reveal className="lx-sec-head">
          <h2 id="rp-sc-h">Scores</h2>
          <p>Usability and learning are scored separately, from 1 to 5. The class view shows the replies behind each score.</p>
        </Reveal>
        <Reveal blur={false} className="glass lx-score-card rp-scores">
          <div ref={scoresRef}>
            <ScoreBars scores={report.scores} grow play={scoresIn} explain />
          </div>
        </Reveal>
      </section>
    </div>
  )
}

function GroupCard({ g, classGain, count }) {
  const hid = `rp-g-${g.group}`
  const w = (n) => `${Math.max(0, Math.min(10, Number(n) || 0)) * 10}%`
  const examples = (g.examples || []).slice(0, 3)
  return (
    <>
      <header className="rp-group-head">
        <h3 id={hid}>{groupPeople(g.group)}</h3>
        <span className="lx-muted-sm">{count ? `${g.size} of the ${count} students` : `${g.size} students`}</span>
        {g.main_reason && <span className="lx-chip rp-reason">{REASON[g.main_reason] || g.main_reason}</span>}
      </header>
      <p className="rp-why">{plainWords(g.reason_text)}</p>

      <dl className="rp-gains" aria-labelledby={hid}>
        <div>
          <dt>This group</dt>
          <dd><span className="rp-bar" aria-hidden="true"><span style={{ width: w(g.avg_gain) }} /></span><strong>{fix(g.avg_gain)}</strong> of 10</dd>
        </div>
        <div>
          <dt>Whole class</dt>
          <dd><span className="rp-bar rp-bar-class" aria-hidden="true"><span style={{ width: w(classGain) }} /></span><strong>{fix(classGain)}</strong> of 10</dd>
        </div>
      </dl>

      {g.main_reason && START[g.main_reason] && (
        <p className="rp-start"><strong>A place to start:</strong> {START[g.main_reason]} <span className="lx-muted-sm">This is a general suggestion and not a result.</span></p>
      )}

      {examples.length > 0 && (
        <div className="rp-examples">
          <h4 className="lx-h4">Example chats</h4>
          {examples.map((ex) => (
            <details key={ex.student_id} className="rp-ex">
              <summary>
                <span className="rp-ex-name">{ex.name}</span>
                <OutcomeTag outcome={ex.outcome} />
                <span className="lx-muted-sm">Gained {pts(ex.gain)}</span>
              </summary>
              {ex.gave_up && <p className="lx-muted-sm rp-ex-note">Gave up before the lesson ended.</p>}
              <ol className="lx-chat">
                {(ex.transcript || []).map((m, i) => {
                  const isTool = m.from === 'tutor'
                  return (
                    <li key={i} className="lx-msg" data-from={isTool ? 'tutor' : 'student'}>
                      <p className="lx-msg-meta">
                        <span className="lx-msg-who">{isTool ? 'Tool' : ex.name}</span>
                        {isTool && m.move && <span className="lx-move">{moveLabel(m.move)}</span>}
                        {isTool && m.reading_age != null && <span className="lx-reading">Reading age {m.reading_age}</span>}
                      </p>
                      <p className="lx-msg-text">{m.text}</p>
                    </li>
                  )
                })}
              </ol>
            </details>
          ))}
        </div>
      )}
    </>
  )
}
