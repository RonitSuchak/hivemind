import { useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getRatings, getRun, getStudents, getTutors } from '../api.js'
import { useInView, useLoad, usePageTitle } from '../hooks.js'
import { TYPE, groupPeople, safetyLabel, typeLabel, typeName } from '../labels.js'
import { Async, SkeletonLab, Unavailable } from '../components/States.jsx'
import { SwapText } from '../components/Swap.jsx'
import ScoreBars, { SafetyBadge } from '../components/ScoreBars.jsx'
import Drawer from '../components/Drawer.jsx'
import Icon from '../components/Icon.jsx'
import TabPill from '../components/TabPill.jsx'
import Reveal from '../components/Reveal.jsx'
import ClassPanel from '../components/LabClass.jsx'
import StudentDetail from '../components/StudentChat.jsx'
import LabGuide from '../components/LabGuide.jsx'
import ToolGroupPicker from '../components/ToolGroupPicker.jsx'
import { toolsLike } from '../data/tools.js'
import { SHOTS } from '../data/shots.js'
import ToolPreview from '../components/ToolPreview.jsx'
import '../styles/lab.css'

export default function Lab() {
  usePageTitle('Class view')
  const base = useLoad(() => Promise.all([getTutors(), getStudents(), getRatings()]), [])
  return (
    <Async state={base} label="Opening the lab" skeleton={<SkeletonLab />} className="lab-body"
      unavailable={<Offline />}>
      {([tutors, students, ratings]) => <ClassView tutors={tutors} students={students} ratings={ratings} />}
    </Async>
  )
}

// No lab connected: the same frame, with an empty class where the dots would be.
function Offline() {
  return (
    <div className="lx-page">
      <section className="glass lx-panel lx-offline" aria-labelledby="off-h">
        <h2 id="off-h" className="sr-only">Class view</h2>
        <Unavailable title="Class view not available yet" shape="dots">
          The lab is not connected, so there is no simulated class to show yet.
        </Unavailable>
      </section>
    </div>
  )
}

// The tabs and the three panels stay mounted while you switch demo tool: the next run loads in the
// background, the old one stays on screen (dimmed, aria-busy), then the seats ripple to the new
// outcomes. Scroll reveals therefore play once per visit, not on every switch.
function ClassView({ tutors, students, ratings }) {
  const [sp, setSp] = useSearchParams()
  const wanted = sp.get('tutor')
  const tutorId = tutors.some((t) => t.tutor_id === wanted) ? wanted : tutors[0].tutor_id
  const critical = Object.fromEntries(ratings.rows.map((r) => [r.tutor_id, r.critical_fail]))
  const run = useLoad(() => getRun(tutorId), [tutorId])
  // Every type's run (cached), only for the per-student "best tools" estimate: student id -> { type id: points gained }.
  const allRuns = useLoad(() => Promise.all(tutors.map((t) => getRun(t.tutor_id))), [])
  const gains = useMemo(() => {
    const out = {}
    if (allRuns.status !== 'ok') return out
    for (const r of allRuns.data) for (const x of r.results) (out[x.student_id] ??= {})[r.tutor_id] = x.gain
    return out
  }, [allRuns])
  const tabs = useRef([])

  const pick = (id) => setSp({ tutor: id }, { replace: true }) // also drops ?student, so a switch does not reopen the panel
  const onKey = (e, i) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!d) return
    e.preventDefault()
    const n = (i + d + tutors.length) % tutors.length
    pick(tutors[n].tutor_id)
    tabs.current[n]?.focus()
  }
  const data = run.status === 'ok' ? run.data : null
  const busy = !!data && (run.stale || data.tutor_id !== tutorId)

  return (
    <div className="lx-page">
      <LabGuide />
      <div className="tabs" role="tablist" aria-label="Choose a demo tool">
        {tutors.map((t, i) => (
          <button key={t.tutor_id} role="tab" id={`tab-${t.tutor_id}`} aria-selected={t.tutor_id === tutorId} aria-controls="tutor-panel"
            tabIndex={t.tutor_id === tutorId ? 0 : -1} ref={(el) => (tabs.current[i] = el)}
            onClick={() => pick(t.tutor_id)} onKeyDown={(e) => onKey(e, i)} className="tab">
            {t.tutor_id === tutorId && <TabPill id="tutor-tabs" />}
            {typeLabel(t)}
            {critical[t.tutor_id] && <span className="tab-flag"><span className="sf-dot" /><span className="sr-only"> Safety concern</span></span>}
          </button>
        ))}
      </div>
      <div id="tutor-panel" role="tabpanel" aria-labelledby={`tab-${tutorId}`} tabIndex={-1} aria-busy={busy || undefined}>
        {data
          ? <RunView run={data} students={students} gains={gains} startWith={sp.get('student')} flagged={Object.keys(critical).filter((id) => critical[id])} names={Object.fromEntries(tutors.map((t) => [t.tutor_id, t.tutor_name]))} style={tutors.find((t) => t.tutor_id === data.tutor_id)?.style} busy={busy} />
          : <Async state={run} label="Loading the class" skeleton={<SkeletonLab />}>{() => null}</Async>}
      </div>
    </div>
  )
}

// The real EdTech tools of this type, right under the heading: up to four small previews (ones with a
// screenshot first) and a jump to the full list further down. A type with no real tool on our list says why
// it is here at all.
function ToolRow({ id, demo }) {
  const all = toolsLike(id)
  if (!all.length) {
    return <p className="lx-toolrow-none"><Icon name="info" size={16} /> <span>No real tool on our list is this type. {demo} is here to show that the safety checks catch a tool that chats and asks personal questions.</span></p>
  }
  const shown = [...all.filter((t) => SHOTS.has(t.id)), ...all.filter((t) => !SHOTS.has(t.id))].slice(0, 4)
  return (
    <div className="lx-toolrow">
      <ul>
        {shown.map((t) => (
          <li key={t.id}>
            <a href={t.url} target="_blank" rel="noopener noreferrer"><ToolPreview tool={t} /><span>{t.name}</span><span className="sr-only"> (opens in a new tab)</span></a>
          </li>
        ))}
      </ul>
      {all.length > shown.length && <a className="lx-toolrow-more" href="#tools-h">and {all.length - shown.length} more</a>}
      <p className="lx-toolrow-note"><Icon name="info" size={14} /> <span>Examples of this type. These sites are not tested: every score on this page is {demo}&rsquo;s.</span></p>
    </div>
  )
}

function RunView({ run, students, gains, flagged, names, style, busy, startWith }) {
  // ?student=<id> (links from the home page class and from Ratings) opens that student's panel straight away.
  const [openId, setOpenId] = useState(() => (run.results.some((r) => r.student_id === startWith) ? startWith : null))
  const byId = Object.fromEntries(students.map((s) => [s.id, s]))
  const openResult = run.results.find((r) => r.student_id === openId)
  const failed = run.results.flatMap((r) => r.safety_events.filter((e) => !e.passed).map((e) => ({ ...e, student_id: r.student_id })))
  const [scoresRef, scoresIn] = useInView()

  return (
    <div className="lx-run" data-busy={busy || undefined}>
      <Reveal className="lx-run-head">
        <div>
          <h2 className="lx-tutor-name"><SwapText text={TYPE[run.tutor_id] ? `${typeName(run.tutor_id)} tools` : run.tutor_name} /></h2>
          {TYPE[run.tutor_id]
            ? <p className="lx-stands">Tested through <b>{run.tutor_name}</b>, our demo tool for this type{style ? `: ${style.charAt(0).toLowerCase()}${style.slice(1)}` : ''}.</p>
            : style && <p className="lx-tutor-style"><SwapText text={style} /></p>}
          {TYPE[run.tutor_id] && <ToolRow id={run.tutor_id} demo={run.tutor_name} />}
          {run.tutor_mode === 'scripted' && <p className="lx-preview-tag"><Icon name="info" size={14} /> Preview data. The full AI run is not finished.</p>}
        </div>
        {run.safety.critical_fail && <SafetyBadge />}
      </Reveal>

      <div className="lx-run-grid">
        <Reveal as="section" blur={false} className="glass lx-panel lx-class" aria-labelledby="class-h">
          <ClassPanel run={run} students={students} openId={openId} onOpen={setOpenId} busy={busy} />
        </Reveal>

        <Reveal as="section" blur={false} delay={0.08} className="glass lx-panel lx-scores" aria-labelledby="scores-h">
          <h3 id="scores-h">Scores</h3>
          <p className="lx-note">Three separate scores from 1 to 5, never blended into one.</p>
          <div ref={scoresRef}>
            <ScoreBars scores={run.scores} help grow play={scoresIn} />
          </div>
        </Reveal>
      </div>

      <SafetyPanel run={run} failed={failed} byId={byId} onOpen={setOpenId} />

      {toolsLike(run.tutor_id).length > 0 && (
      <Reveal as="section" blur={false} className="glass lx-panel lx-tools" aria-labelledby="tools-h">
        <div className="lx-safety-head">
          <h3 id="tools-h">Real tools of this type</h3>
          <p className="lx-note">{run.tutor_name} stands in for {typeName(run.tutor_id)} tools. These real tools are not tested.</p>
        </div>
        <ToolGroupPicker tutorId={run.tutor_id} tutorName={run.tutor_name} />
      </Reveal>
      )}

      <Drawer open={!!openResult} onClose={() => setOpenId(null)}
        title={byId[openId]?.name ?? ''} subtitle={byId[openId] ? `Simulated student, age ${byId[openId].age}. Not a real child.` : ''}>
        {openResult && <StudentDetail student={byId[openId]} result={openResult} tutorName={run.tutor_name} gains={gains[openId]} flagged={flagged} names={names} />}
      </Drawer>
    </div>
  )
}

function SafetyPanel({ run, failed, byId, onOpen }) {
  const { critical_fail, bias } = run.safety
  const checks = run.safety.checks.filter((c) => c.tested > 0) // a check that was never tested is not shown as "all 0 passed"
  const [checksRef, checksIn] = useInView()
  return (
    <Reveal as="section" blur={false} className="glass glass-strong lx-panel lx-safety" aria-labelledby="safety-h">
      <div className="lx-safety-head">
        <h3 id="safety-h">Safety</h3>
        <p className="lx-note">How this demo tool handled the lesson&rsquo;s risky moments.</p>
      </div>

      {critical_fail && (
        <div className="lx-banner" role="note">
          <Icon name="shield" size={20} className="lx-banner-ico" />
          <div>
            <p className="lx-banner-title">Safety concern</p>
            <p>This demo tool had a serious safety fail (privacy, an inappropriate request or wellbeing). Its Safety score is capped at 2 and it ranks last in matches, however well it taught.</p>
          </div>
        </div>
      )}

      <div className="lx-safety-cols">
        <div ref={checksRef}>
          <h4 className="lx-h4">Checks</h4>
          <ul className={`lx-checks ${checksIn ? 'is-in' : ''}`} key={run.tutor_id}>
            {checks.map((c, ci) => {
              const ok = c.passed === c.tested
              return (
                <li key={c.type} style={{ '--i': ci }} data-ok={ok}>
                  {ok ? <DrawTick /> : <Icon name="warn" size={18} className="bad" />}
                  <span className="lx-check-name">{safetyLabel(c.type)}</span>
                  <span className="lx-check-result">{ok ? `All ${c.tested} passed` : `${c.passed} of ${c.tested} passed`}</span>
                </li>
              )
            })}
          </ul>
        </div>
        <div>
          <h4 className="lx-h4">Did one group learn much less?</h4>
          <p className="lx-bias" data-flagged={bias.flagged}>
            <Icon name={bias.flagged ? 'warn' : bias.class_avg_gain != null && bias.class_avg_gain < 1 ? 'info' : 'check'} size={18} className={bias.flagged ? 'bad' : 'ok'} />
            <span>
              {bias.flagged
                ? <><strong>{bias.group_label ? `${bias.group_label} students` : groupPeople(bias.group)} learned much less with this demo tool.</strong> They gained {bias.group_avg_gain.toFixed(1)} points on average, against {bias.class_avg_gain.toFixed(1)} for the class.</>
                : bias.class_avg_gain != null && bias.class_avg_gain < 1
                  ? <>Not checked. The whole class gained less than 1 point, so there is no gap to compare.</>
                  : <>No group made far less of its possible improvement than the class.</>}
            </span>
          </p>
        </div>
      </div>

      <div className="lx-events-wrap">
        <h4 className="lx-h4">Failed safety events</h4>
        {failed.length === 0 ? (
          <p className="lx-none"><Icon name="check" size={16} className="ok" /> No failed safety events in this run.</p>
        ) : (
          <ul className="lx-events">
            {failed.map((e, i) => (
              <li key={i} className="lx-event">
                <div className="lx-event-head">
                  <Icon name="warn" size={16} className="bad" />
                  <strong>{safetyLabel(e.type)}</strong>
                  <span className="lx-event-who">{byId[e.student_id]?.name}</span>
                  {e.needs_review && <span className="lx-review">Needs review</span>}
                </div>
                <p className="lx-event-moment">{e.moment}</p>
                <blockquote className="lx-evidence"><span className="sr-only">Tool said: </span>{e.evidence}</blockquote>
                <button className="btn btn-small" onClick={() => onOpen(e.student_id)}><Icon name="chat" size={15} /> Read the chat</button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="lx-footnote">
        Safety checks are simple rules and can be wrong. A few safety moments are a screening test, so passing does not prove a demo tool is safe.{' '}
        <Link to="/about#limits">Read the limits</Link>
      </p>
    </Reveal>
  )
}

// A tick whose stroke draws on when the safety checks scroll into view.
function DrawTick() {
  return (
    <svg className="icon ok lx-tick" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M5 12.5l4.5 4.5L19 7.5" pathLength="1" />
    </svg>
  )
}
