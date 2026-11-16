import { useMemo, useState } from 'react'
import { LayoutGroup, motion } from 'motion/react'
import { getRun, getStudents } from '../api.js'
import { useLoad } from '../hooks.js'
import { spring, useReduced } from '../motion.js'
import { FILTERS } from '../data/tools.js'
import { Async, Unavailable } from './States.jsx'
import LevelSlider from './LevelSlider.jsx'
import Reveal from './Reveal.jsx'
import Icon from './Icon.jsx'
import '../styles/tools.css' // the sliders' `ls-` styles
import '../styles/lab.css'

// "Try a student": describe a simulated student with five sliders and see the points each tool type gained
// for the simulated students closest to that description.
//
// Nothing here is invented. The method, all from the loaded data:
//   1. Each slider (levels 2 to 10; level 1 = "not sure" and is ignored) is mapped in a straight line onto the
//      range of that trait among the 30 simulated students: level 2 is the lowest value seen, level 10 the highest.
//   2. Every student gets a distance to the profile: the square root of the summed squared differences, each
//      difference divided by that trait's range, over the traits that are set.
//   3. The K nearest students are taken (a tie keeps the earlier student).
//   4. For each tool type, the answer is the average `gain` (after minus before, points out of 10) those
//      students got in that tool type's saved run. With every slider at 1, it is the average of all 30.
const K = 5

// Slider id (from FILTERS in data/tools.js) -> the student trait it describes.
const TRAITS = [
  { id: 'level', key: 'start_level' },
  { id: 'speed', key: 'learn_speed' },
  { id: 'reading', key: 'reading_age' },
  { id: 'english', key: 'english' },
  { id: 'stuck', key: 'persistence' },
]
const SLIDERS = TRAITS.map((t) => {
  const f = FILTERS.find((x) => x.id === t.id)
  return { ...t, label: t.id === 'english' ? 'Language level' : f.label, icon: f.icon, levels: f.levels }
})
const BLANK = Object.fromEntries(TRAITS.map((t) => [t.id, 1]))

const mean = (a) => a.reduce((s, v) => s + v, 0) / (a.length || 1)

// Pure: students (array), gains ({ [tutor_id]: { [student_id]: gain } }), picks ({ [slider id]: 1..10 }).
export function predict(students, gains, tutorIds, picks) {
  const set = SLIDERS
    .map((t) => {
      const v = students.map((s) => s[t.key])
      const lo = Math.min(...v), hi = Math.max(...v)
      return { ...t, lo, range: hi - lo, target: lo + ((picks[t.id] - 2) / 8) * (hi - lo) }
    })
    .filter((t) => picks[t.id] >= 2 && t.range > 0)

  let near = students
  if (set.length) {
    near = students
      .map((s, i) => ({ s, i, d: Math.sqrt(set.reduce((sum, t) => sum + ((s[t.key] - t.target) / t.range) ** 2, 0)) }))
      .sort((a, b) => a.d - b.d || a.i - b.i)
      .slice(0, K)
      .map((x) => x.s)
  }
  const perTool = Object.fromEntries(tutorIds.map((id) => [id, mean(near.map((s) => gains[id][s.id] ?? 0))]))
  return { near, perTool, isClass: set.length === 0 }
}

export function PredictHead() {
  return (
    <div className="lx-sec-head">
      <h2 id="try-h">Try a student</h2>
      <p>Move the sliders to describe a student. A slider left at 1 means not sure, so it is left out.</p>
      <p className="lx-note">Simulated students, not real children.</p>
    </div>
  )
}

// No lab connected: the same heading, with an empty shape where the result would be.
export function PredictorOffline() {
  return (
    <section className="lx-sec" aria-labelledby="try-h">
      <PredictHead />
      <div className="glass lx-offline-panel">
        <Unavailable shape="bars">The lab is not connected, so there is nothing to predict from.</Unavailable>
      </div>
    </section>
  )
}

export default function ProfilePredictor({ rows }) {
  const ids = useMemo(() => rows.map((r) => r.tutor_id), [rows])
  const load = useLoad(() => Promise.all([getStudents(), ...ids.map((id) => getRun(id))]), [ids.join()])
  return (
    <section className="lx-sec" aria-labelledby="try-h">
      <Reveal><PredictHead /></Reveal>
      <Async state={load} label="Loading the simulated students"
        skeleton={<div className="skeleton" aria-hidden="true"><span className="sk" style={{ width: '100%', height: '16rem', borderRadius: '10px' }} /></div>}
        unavailable={<div className="glass lx-offline-panel"><Unavailable shape="bars">The lab is not connected, so there is nothing to predict from.</Unavailable></div>}>
        {([students, ...runs]) => <Panel rows={rows} students={students} runs={runs} />}
      </Async>
    </section>
  )
}

function Panel({ rows, students, runs }) {
  const reduced = useReduced()
  const [picks, setPicks] = useState(BLANK)
  const ids = rows.map((r) => r.tutor_id)
  const gains = useMemo(
    () => Object.fromEntries(runs.map((run) => [run.tutor_id, Object.fromEntries(run.results.map((r) => [r.student_id, r.gain]))])),
    [runs],
  )
  // One fixed scale from the data, so bars grow and shrink as you move a slider but never rescale.
  const scale = useMemo(() => Math.max(5, Math.ceil(Math.max(...runs.flatMap((run) => run.results.map((r) => r.gain))))), [runs])
  const { near, perTool, isClass } = useMemo(() => predict(students, gains, ids, picks), [students, gains, ids.join(), picks]) // eslint-disable-line react-hooks/exhaustive-deps

  const ranked = rows
    .map((row, i) => ({ row, i, v: perTool[row.tutor_id] }))
    .sort((a, b) => b.v - a.v || a.i - b.i)
  const top = ranked[0]
  const safest = ranked.find((x) => !x.row.critical_fail)
  const anyFlag = rows.some((r) => r.critical_fail)
  const set = (id) => (level) => setPicks((p) => ({ ...p, [id]: level }))
  const spr = useMemo(() => spring('ui'), [])

  return (
    <Reveal blur={false} delay={0.04} className="glass lx-predict">
      <div className="lx-predict-sliders">
        {SLIDERS.map((s) => (
          <LevelSlider key={s.id} id={`pp-${s.id}`} label={s.label} icon={s.icon} levels={s.levels} value={picks[s.id]} onChange={set(s.id)} />
        ))}
        <div className="lx-predict-reset">
          <button type="button" className="btn btn-small btn-quiet" onClick={() => setPicks(BLANK)} disabled={isClass}>Reset sliders</button>
        </div>
      </div>

      <div className="lx-predict-result">
        <h3 id="try-r">Points gained out of 10</h3>
        <p className="lx-predict-say" aria-live="polite">
          {isClass
            ? <>Move a slider to describe a student. Until then, this is the <strong>class average</strong>.</>
            : top.row.critical_fail && safest && safest !== top
              ? <>For a student like this, <strong>{top.row.tutor_name}</strong> taught most, but it has a safety flag. <strong>{safest.row.tutor_name}</strong> came next.</>
              : <>For a student like this, <strong>{top.row.tutor_name}</strong> taught most.</>}
        </p>

        <LayoutGroup>
          <ol className="lx-bars" aria-labelledby="try-r">
            {ranked.map(({ row, v }) => {
              const inner = (
                <>
                  <span className="lx-bar-name">
                    {row.tutor_name}
                    {row.critical_fail && <span className="lx-bar-flag"><Icon name="flag" size={13} /><span className="sr-only"> Safety flag</span></span>}
                  </span>
                  <span className="lx-bar-track" aria-hidden="true">
                    <span className="lx-bar-fill" style={{ '--v': Math.max(0, Math.min(1, v / scale)) }} />
                  </span>
                  <span className="lx-bar-num">{v.toFixed(1)}<span className="sr-only"> points gained</span></span>
                </>
              )
              return reduced
                ? <li key={row.tutor_id} className="lx-bar">{inner}</li>
                : <motion.li key={row.tutor_id} layout="position" transition={spr} className="lx-bar">{inner}</motion.li>
            })}
          </ol>
        </LayoutGroup>

        <div className="lx-predict-notes">
          {isClass
            ? <p className="lx-note">Worked out from all {students.length} simulated students.</p>
            : (
              <>
                <p className="lx-note">Worked out from the {K} simulated students closest to this profile.</p>
                <p className="lx-note">Closest: {near.map((s) => s.name).join(', ')}.</p>
              </>
            )}
          {anyFlag && <p className="lx-note">A tool type with a safety flag is ranked last in real matches.</p>}
          <p className="lx-note">Simulated students, not real children.</p>
        </div>
      </div>
    </Reveal>
  )
}
