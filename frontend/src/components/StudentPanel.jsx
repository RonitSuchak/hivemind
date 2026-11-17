import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getRun, getStudents } from '../api.js'
import { studentTags, tagLabel, tagNote, typeName } from '../labels.js'
import StatWheel from './StatWheel.jsx'
import { GaveUpFlag, OutcomeShape } from './OutcomeShape.jsx'
import '../at/student-panel.css'

// The five stats of the lab's model, in the order the wheel shows them: [key in the data, label].
export const STAT_LABELS = [
  ['start_level', 'Already knows'],
  ['learn_speed', 'New ideas'],
  ['reading', 'Reading'],
  ['english', 'English'],
  ['persistence', 'Staying power'],
]
// Wheel stats from a { start_level, ... } object. `extra` can add a display text (e.g. { reading: 'age 12' }).
export const wheelStats = (radar, extra = {}) =>
  STAT_LABELS.map(([key, label]) => ({ key, label, value: radar?.[key] ?? null, ...(extra[key] ? { display: extra[key] } : {}) }))

// Load the class and each tool type's run once, and keep them for the rest of the visit.
const pending = new Map() // key -> promise
const loaded = new Map()  // key -> { students, runs }
function load(ids) {
  const key = ids.join('|')
  if (!pending.has(key)) {
    const p = Promise.all([getStudents(), ...ids.map(getRun)]).then(([students, ...runs]) => {
      const data = { students, runs: Object.fromEntries(ids.map((id, i) => [id, runs[i]?.results || []])) }
      loaded.set(key, data)
      return data
    })
    p.catch(() => pending.delete(key)) // a failed load can be tried again
    pending.set(key, p)
  }
  return pending.get(key)
}

function useClassData(ids) {
  const key = ids.join('|')
  const [state, setState] = useState(() => (loaded.has(key) ? { status: 'ok', ...loaded.get(key) } : { status: 'loading' }))
  const [tries, setTries] = useState(0)
  useEffect(() => {
    if (loaded.has(key) && tries === 0) return
    let live = true
    setState({ status: 'loading' })
    load(ids).then((d) => live && setState({ status: 'ok', ...d })).catch(() => live && setState({ status: 'error' }))
    return () => { live = false }
  }, [key, tries]) // eslint-disable-line react-hooks/exhaustive-deps
  return { ...state, retry: () => setTries((n) => n + 1) }
}

const num = (x) => +(+x).toFixed(1) // 7 stays 7, 7.25 shows as 7.3
const fmtGain = (g) => `${g < 0 ? '−' : '+'}${Math.abs(num(g))}`

// What the side drawer shows for one matched student. `matches` is match.matches, `index` the one open.
export default function StudentPanel({ matches, index, onIndex, ranked, tutorIds }) {
  const m = matches[index]
  const { status, students, runs, retry } = useClassData(tutorIds)
  const body = useRef(null)
  const s = students?.find((x) => x.id === m.student_id)
  const many = matches.length > 1
  const step = (d) => onIndex((index + d + matches.length) % matches.length)

  // A new student starts at the top of the panel.
  useEffect(() => { body.current?.closest('.drawer-body')?.scrollTo({ top: 0 }) }, [m.student_id])

  const radar = m.radar || s?.radar
  const stats = wheelStats(radar, s?.reading_age != null ? { reading: `age ${s.reading_age}` } : {})
  const share = Math.round((m.weight ?? 0) * 100)

  return (
    <div className="sp" ref={body}>
      {many && (
        <nav className="sp-nav" aria-label="Matched students">
          <button type="button" className="btn btn-small btn-quiet" onClick={() => step(-1)} aria-label={`Previous student: ${matches[(index + matches.length - 1) % matches.length].name}`}>← Previous</button>
          <span className="muted" aria-live="polite">{index + 1} of {matches.length}</span>
          <button type="button" className="btn btn-small btn-quiet" onClick={() => step(1)} aria-label={`Next student: ${matches[(index + 1) % matches.length].name}`}>Next →</button>
        </nav>
      )}

      <p className="sp-sub">
        {s ? `Simulated student, age ${s.age}. Not a real child.` : 'Simulated student. Not a real child.'}
      </p>
      {studentTags(s).length > 0 && (
        <ul className="sp-tags" aria-label="Tags">
          {studentTags(s).map((t) => <li key={t} title={tagNote(t)}>{tagLabel(t)}</li>)}
        </ul>
      )}

      <figure className="sp-wheel">
        <StatWheel stats={stats} tone="ink" showValues size={260} label={`${m.name}'s profile`} />
      </figure>

      <section className="sp-block" aria-labelledby="sp-share-h">
        <h3 id="sp-share-h" className="sp-h">Share of your match: {share}%</h3>
        <p className="muted">Closer students count for more.</p>
      </section>

      <section className="sp-block" aria-labelledby="sp-tools-h">
        <h3 id="sp-tools-h" className="sp-h">How each tool type worked for {m.name}</h3>
        {status === 'loading' && <p className="muted" role="status">Loading…</p>}
        {status === 'error' && (
          <p className="muted" role="status">
            Could not load the lab results for this student. <button type="button" className="sp-link" onClick={retry}>Try again</button>
          </p>
        )}
        {status === 'ok' && (
          <ul className="sp-tools">
            {ranked.map((tu) => {
              const r = runs[tu.tutor_id]?.find((x) => x.student_id === m.student_id)
              if (!r) return null
              return (
                <li key={tu.tutor_id} className="sp-tool">
                  <div>
                    <strong>{typeName(tu.tutor_id)}</strong>
                    <p className="muted">{num(r.before)} → {num(r.after)} out of 10{r.gave_up && <>, <GaveUpFlag /> gave up</>}</p>
                  </div>
                  <span className="sp-gain">{fmtGain(r.gain)}</span>
                  <OutcomeShape outcome={r.outcome} gain={r.gain} size={22} />
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {ranked[0] && (
        <p className="sp-lab">
          <Link to={`/lab?tutor=${encodeURIComponent(ranked[0].tutor_id)}&student=${encodeURIComponent(m.student_id)}`}>Open {m.name} in the lab</Link>
        </p>
      )}
    </div>
  )
}
