import { Fragment, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getRatings, getRealTools, getRun, getStudents, getTutors } from '../api.js'
import { useInView, useLoad, useOpenParam, usePageTitle } from '../hooks.js'
import { DEMO_SCORES, SCORE_LABEL, TYPE, plainWords, typeLabel, typeName } from '../labels.js'
import { Async, SkeletonLab, Unavailable } from '../components/States.jsx'
import { SwapText } from '../components/Swap.jsx'
import ScoreBars from '../components/ScoreBars.jsx'
import Drawer from '../components/Drawer.jsx'
import Icon from '../components/Icon.jsx'
import TabPill from '../components/TabPill.jsx'
import Reveal from '../components/Reveal.jsx'
import ClassPanel from '../components/LabClass.jsx'
import StudentDetail from '../components/StudentChat.jsx'
import LabGuide from '../components/LabGuide.jsx'
import ToolGroupPicker from '../components/ToolGroupPicker.jsx'
import { toolsLike } from '../data/tools.js'
import { evidenceLine } from '../evidence.js'
import { SHOTS } from '../data/shots.js'
import ToolPreview from '../components/ToolPreview.jsx'
import '../styles/lab.css'
import '../at/lab-extra.css'

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

// How many real tools sit under each demo tool type, from the real tools list (GET /api/real-tools).
// Until that list arrives, or if it fails, the bundled copy answers (no total then).
function useTypeCounts(tutors) {
  const real = useLoad(getRealTools, [])
  const list = real.status === 'ok' && Array.isArray(real.data?.tools) ? real.data.tools : null
  return useMemo(() => {
    const count = (id) => (list ? list.filter((t) => t.type?.tutor_id === id).length : toolsLike(id).length)
    return { counts: Object.fromEntries(tutors.map((t) => [t.tutor_id, count(t.tutor_id)])), total: list ? list.length : null }
  }, [list, tutors])
}

// The tabs and the three panels stay mounted while you switch demo tool: the next run loads in the
// background, the old one stays on screen (dimmed, aria-busy), then the seats ripple to the new
// outcomes. Scroll reveals therefore play once per visit, not on every switch.
function ClassView({ tutors, students, ratings }) {
  const [sp, setSp] = useSearchParams()
  const [openId, openAt, closeStudent] = useOpenParam('student') // ?student=<id> keeps the panel in the address
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
  const { counts, total } = useTypeCounts(tutors)
  // A demo tool no real tool resembles is an "extra": its tab goes last, set apart from the rest.
  const shown = useMemo(() => [...tutors.filter((t) => counts[t.tutor_id] !== 0), ...tutors.filter((t) => counts[t.tutor_id] === 0)], [tutors, counts])
  const firstExtra = shown.findIndex((t) => counts[t.tutor_id] === 0)

  const pick = (id) => setSp({ tutor: id }, { replace: true }) // also drops ?student, so a switch does not reopen the panel
  const onKey = (e, i) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!d) return
    e.preventDefault()
    const n = (i + d + shown.length) % shown.length
    pick(shown[n].tutor_id)
    tabs.current[n]?.focus()
  }
  const data = run.status === 'ok' ? run.data : null
  const busy = !!data && (run.stale || data.tutor_id !== tutorId)

  return (
    <div className="lx-page">
      <LabGuide />
      <div className="tabs" role="tablist" aria-label="Choose a demo tool">
        {shown.map((t, i) => (
          <Fragment key={t.tutor_id}>
          {i === firstExtra && i > 0 && <span className="tab-sep" aria-hidden="true" />}
          <button role="tab" id={`tab-${t.tutor_id}`} aria-selected={t.tutor_id === tutorId} aria-controls="tutor-panel"
            tabIndex={t.tutor_id === tutorId ? 0 : -1} ref={(el) => (tabs.current[i] = el)}
            onClick={() => pick(t.tutor_id)} onKeyDown={(e) => onKey(e, i)} className="tab">
            {t.tutor_id === tutorId && <TabPill id="tutor-tabs" />}
            {typeLabel(t)}
            {counts[t.tutor_id] === 0 && <span className="tab-extra">extra</span>}
          </button>
          </Fragment>
        ))}
      </div>
      <div id="tutor-panel" role="tabpanel" aria-labelledby={`tab-${tutorId}`} tabIndex={-1} aria-busy={busy || undefined}>
        {data
          ? <RunView run={data} counts={counts} total={total} students={students} gains={gains} openId={openId} openAt={openAt} close={closeStudent} flagged={Object.keys(critical).filter((id) => critical[id])} names={Object.fromEntries(tutors.map((t) => [t.tutor_id, typeName(t.tutor_id, t.tutor_name)]))} style={tutors.find((t) => t.tutor_id === data.tutor_id)?.style} tool={tutors.find((t) => t.tutor_id === data.tutor_id)} busy={busy} />
          : <Async state={run} label="Loading the class" skeleton={<SkeletonLab />}>{() => null}</Async>}
      </div>
    </div>
  )
}

// The real EdTech tools of this type, right under the heading: up to four small previews (ones with a
// screenshot first) and a jump to the full list further down. A type with no real tool on our list says why
// it is here at all (see ExtraNote).
function ToolRow({ id, demo, run, flagged, count, total }) {
  const all = toolsLike(id)
  if (!all.length) return <ExtraNote count={count} total={total} />
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
    </div>
  )
}

// A demo tool no real tool resembles is still in the lab; say so in one line.
function ExtraNote({ count, total }) {
  if (count !== 0) return null
  return (
    <p className="lx-toolrow-none">
      <Icon name="info" size={16} />
      <span>{total ? `No real tool on our list is this kind (0 of ${total}).` : 'No real tool on our list is this kind.'}</span>
    </p>
  )
}

function RunView({ run, counts, total, students, gains, flagged, names, tool, busy, openId, openAt, close }) {
  // The open student comes from ?student=<id> (links from the home page class and from Ratings), so Back closes the panel.
  const byId = Object.fromEntries(students.map((s) => [s.id, s]))
  const openResult = run.results.find((r) => r.student_id === openId)
  const [scoresRef, scoresIn] = useInView()

  return (
    <div className="lx-run" data-busy={busy || undefined}>
      <Reveal className="lx-run-head">
        <div>
          <h2 className="lx-tutor-name"><SwapText text={TYPE[run.tutor_id] ? `${typeName(run.tutor_id)} tools` : plainWords(run.tutor_name)} /></h2>
          {TYPE[run.tutor_id] && <p className="lx-stands">Tested with the <b>{typeName(run.tutor_id)}</b> demo tool.</p>}
          {TYPE[run.tutor_id] && <ToolRow id={run.tutor_id} demo={run.tutor_name} run={run} flagged={flagged} count={counts[run.tutor_id]} total={total} />}
          <p className="lx-try">
            <TryLink run={run} tool={tool} />
            <Link to={`/lab/report/${run.tutor_id}`} className="btn btn-small">Maker report</Link>
          </p>
        </div>
      </Reveal>

      <div className="lx-run-grid">
        <Reveal as="section" blur={false} className="glass lx-panel lx-class" aria-labelledby="class-h">
          <ClassPanel run={run} students={students} openId={openId} onOpen={(id) => openAt(id)} busy={busy} />
        </Reveal>

        <Reveal as="section" blur={false} delay={0.08} className="glass lx-panel lx-scores" aria-labelledby="scores-h">
          <h3 id="scores-h">Scores, each from 1 to 5</h3>
          <div ref={scoresRef}>
            <ScoreBars scores={run.scores} help grow play={scoresIn} />
          </div>
          <ScoreWhy evidence={run.evidence} results={run.results} byId={byId} onOpen={openAt} />
        </Reveal>
      </div>

      {toolsLike(run.tutor_id).length > 0 && (
      <Reveal as="section" blur={false} className="glass lx-panel lx-tools" aria-labelledby="tools-h">
        <h3 id="tools-h">{typeName(run.tutor_id)} tools in this section</h3>
        <ToolGroupPicker tutorId={run.tutor_id} />
      </Reveal>
      )}

      <Drawer open={!!openResult} onClose={close}
        title={byId[openId]?.name ?? ''} subtitle={byId[openId] ? 'Simulated student' : ''}>
        {openResult && <StudentDetail student={byId[openId]} result={openResult} />}
      </Drawer>
    </div>
  )
}

// Words for what an evidence line did to its score. Anything else the backend sends is shown as is.
const EFFECT = { positive: 'Helped this score', negative: 'Hurt this score' }

// At most 3 lines at first; if the backend sent both kinds, one of each is kept. Order is the backend's.
function pickFirst(items) {
  const top = items.slice(0, 3)
  if (items.length <= 3) return top
  for (const kind of ['positive', 'negative']) {
    if (top.some((x) => x.effect === kind)) continue
    const extra = items.find((x) => x.effect === kind)
    if (!extra) continue
    const drop = top.map((x, i) => i).reverse().find((i) => top.filter((x) => x.effect === top[i].effect).length > 1)
    if (drop !== undefined) top[drop] = extra
  }
  return items.filter((x) => top.includes(x))
}

// "Why this score": the evidence the backend sent for each score. Nothing is worked out here.
function ScoreWhy({ evidence, results, byId, onOpen }) {
  const [all, setAll] = useState({})
  const groups = DEMO_SCORES.filter((k) => evidence?.[k]?.length)
  if (!groups.length) return null
  return (
    <div className="lx-why">
      {groups.map((k) => {
        const items = evidence[k]
        const more = items.length > 3
        const shown = more && !all[k] ? pickFirst(items) : items
        const listId = `why-${k}`
        return (
          <details key={k} className="lx-why-group">
            <summary>
              <h4 className="lx-h4">Why this {SCORE_LABEL[k].toLowerCase()} score</h4>
              <span className="lx-muted-sm">{items.length} {items.length === 1 ? 'line' : 'lines'}</span>
            </summary>
            <ul id={listId} className="lx-why-list">
              {shown.map((x, i) => (
                <li key={`${x.student_id}-${x.turn}-${i}`} className="lx-why-item">
                  <p className="lx-why-head">
                    <strong>{byId[x.student_id]?.name ?? 'A student'}</strong>
                    <span className="lx-why-effect" data-effect={x.effect}>{EFFECT[x.effect] ?? x.effect}</span>
                  </p>
                  <Quote e={x} results={results} />
                  <p className="lx-why-reason">{plainWords(x.reason)}</p>
                  <button type="button" className="btn btn-small" onClick={() => onOpen(x.student_id)}>
                    See {byId[x.student_id]?.name ?? 'this student'}&rsquo;s results
                  </button>
                </li>
              ))}
            </ul>
            {more && (
              <button type="button" className="btn btn-small" aria-expanded={!!all[k]} aria-controls={listId}
                onClick={() => setAll((a) => ({ ...a, [k]: !a[k] }))}>
                {all[k] ? 'Show fewer' : `Show all ${items.length}`}
              </button>
            )}
          </details>
        )
      })}
    </div>
  )
}

// The demo tool's own words behind a score. A line the simulated student wrote is never quoted.
function Quote({ e, results }) {
  const line = evidenceLine(results, e)
  if (!line?.text || line.from === 'student') return null
  const who = 'The demo tool said'
  return (
    <figure className="lx-quote">
      <figcaption className="lx-said">{who}</figcaption>
      <blockquote className="lx-evidence">{line.text}</blockquote>
    </figure>
  )
}

// Our own demo tools can be tried in a live chat on this site. A submitted product is tried on its maker's
// own website (try_url), never on /try, which would say it did not pass a safety check (FRONTEND_PROMPT 3.1).
function TryLink({ run, tool }) {
  if (run.kind === 'built_in') {
    return tool?.live_chat === false ? null : <Link to={`/try/${run.tutor_id}`} className="btn btn-small">Try this demo tool</Link>
  }
  const url = tool?.try_url
  if (!/^https:\/\//.test(url || '')) return null
  return <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-small">Try it on its own site<span className="sr-only"> (opens in a new tab)</span></a>
}
