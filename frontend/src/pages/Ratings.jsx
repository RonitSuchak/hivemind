import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getRatings } from '../api.js'
import { useInView, useLoad, usePageTitle } from '../hooks.js'
import { useReduced } from '../motion.js'
import { groupPeople, tagLabel } from '../labels.js'
import { Async, SkeletonRatings, Unavailable } from '../components/States.jsx'
import ScoreBars, { SafetyBadge } from '../components/ScoreBars.jsx'
import { useTooltip } from '../components/Tooltip.jsx'
import Reveal, { RevealGroup } from '../components/Reveal.jsx'
import Icon from '../components/Icon.jsx'
import ProfilePredictor, { PredictorOffline } from '../components/ProfilePredictor.jsx'
import '../styles/lab.css'

export default function Ratings() {
  usePageTitle('Ratings')
  const load = useLoad(getRatings, [])
  return (
    <Async state={load} label="Loading ratings" skeleton={<SkeletonRatings />} className="lab-body"
      unavailable={<Offline />}>
      {(r) => <Body ratings={r} />}
    </Async>
  )
}

const SUM_HEAD = (
  <div className="lx-sec-head">
    <h2 id="sum-h">How much students gained</h2>
    <p>Each simulated class sat a test, had a lesson from one tool type, then sat the test again. Best result first.</p>
    <p className="lx-note">Simulated students, not real children.</p>
  </div>
)
const CMP_HEAD = (
  <div className="lx-sec-head">
    <h2 id="cmp-h">Compare for one group</h2>
    <p>Pick a group of simulated students. Longer bar means more points gained.</p>
  </div>
)
const SCORES_HEAD = (
  <div className="lx-sec-head">
    <h2 id="sc-h">Safety, usability and learning</h2>
    <p>Three separate scores for each tool type, never blended into one number.</p>
  </div>
)

// No lab connected: the same sections, with empty shapes where the numbers would be.
function Offline() {
  return (
    <div className="lx-ratings">
      <section className="lx-sec" aria-labelledby="sum-h">
        {SUM_HEAD}
        <div className="glass lx-offline-panel">
          <Unavailable shape="grid">The lab is not connected, so there are no gains to show.</Unavailable>
        </div>
      </section>
      <PredictorOffline />
      <section className="lx-sec" aria-labelledby="sc-h">
        {SCORES_HEAD}
        <div className="glass lx-offline-panel">
          <Unavailable shape="bars">The lab is not connected, so there are no scores to show.</Unavailable>
        </div>
      </section>
    </div>
  )
}

// Six discrete steps (lab.css --lab-heat-0..5), so every printed number keeps its contrast.
const STEPS = 6
const stepOf = (v, max) => Math.max(0, Math.min(STEPS - 1, Math.floor((v / max) * STEPS)))
const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

// The heatmap ripples in on the first visit only. Coming back to Ratings shows it at once.
let heatPlayed = false

const signed = (v) => `${v < 0 ? '\u2212' : '+'}${Math.abs(v).toFixed(1)}`

// Per tool type: the overall average, and the groups it worked best and least for. All from avg_gain.
// Best / least look at the groups only (every tag except "all"). The first group wins a tie. If every group
// is level there is no best or least, so `level` is true and the card says so.
function summarise(row, groups) {
  const vals = groups.map((g) => [g, row.avg_gain[g]])
  if (!vals.length) return { overall: row.avg_gain.all, level: true }
  let best = vals[0], least = vals[0]
  for (const v of vals) { if (v[1] > best[1]) best = v; if (v[1] < least[1]) least = v }
  return { overall: row.avg_gain.all, best, least, level: best[1] === least[1] }
}

function Body({ ratings: raw }) {
  // v3 sends `groups` as [{ id, label, size }]. The page works on ids; the backend's own labels win over ours.
  const ratings = useMemo(() => ({ ...raw, tags: raw.groups.map((g) => g.id) }), [raw])
  const all = ratings.rows.flatMap((r) => ratings.tags.map((t) => r.avg_gain[t]))
  const max = Math.max(5, ...all)
  const groups = useMemo(() => ratings.tags.filter((t) => t !== 'all'), [ratings.tags])
  const ranked = useMemo(
    () => ratings.rows.map((row) => ({ row, ...summarise(row, groups) })).sort((a, b) => b.overall - a.overall),
    [ratings.rows, groups],
  )
  const [group, setGroup] = useState('all')
  const bars = useMemo(
    () => ratings.rows.map((row) => ({ row, v: row.avg_gain[group] })).sort((a, b) => b.v - a.v),
    [ratings.rows, group],
  )
  const tip = useTooltip()
  const reduced = useReduced()
  const animate = useRef(!heatPlayed && !reduced).current
  const [heatRef, heatIn] = useInView({ margin: '0px 0px -10% 0px' })
  useEffect(() => { if (heatIn) heatPlayed = true }, [heatIn])
  const heatClass = animate ? (heatIn ? 'is-in' : 'is-waiting') : ''
  const scale = Math.ceil(max)

  return (
    <div className="lx-ratings">
      <section className="lx-sec" aria-labelledby="sum-h">
        <Reveal>{SUM_HEAD}</Reveal>
        <RevealGroup as="ol" className="lx-sum-grid">
          {ranked.map(({ row, overall, best, least, level }, i) => (
            <Reveal as="li" key={row.tutor_id} blur={false} className={`glass lx-sum ${i === 0 ? 'is-top' : ''}`}>
              <div className="lx-sum-head">
                <h3><Link to={`/lab?tutor=${row.tutor_id}`}>{row.tutor_name}</Link></h3>
                {row.critical_fail && <SafetyBadge />}
              </div>
              <p className="lx-sum-gain">
                <span className="lx-sum-num">{signed(overall)}</span>
                <span className="lx-sum-label">points gained out of 10, on average</span>
              </p>
              {level ? (
                <p className="lx-sum-line">About the same for every group.</p>
              ) : (
                <>
                  <p className="lx-sum-line"><span>Worked best for:</span> <strong>{groupPeople(best[0])}</strong> <span className="lx-sum-v">({signed(best[1])})</span></p>
                  <p className="lx-sum-line"><span>Worked least for:</span> <strong>{groupPeople(least[0])}</strong> <span className="lx-sum-v">({signed(least[1])})</span></p>
                </>
              )}
            </Reveal>
          ))}
        </RevealGroup>
      </section>

      <ProfilePredictor rows={ratings.rows} />

      <section className="lx-sec" aria-labelledby="cmp-h">
        <Reveal>{CMP_HEAD}</Reveal>
        <Reveal blur={false} delay={0.06} className="glass lx-cmp">
          <div className="lx-cmp-chips" role="group" aria-label="Student group">
            {ratings.tags.map((t) => (
              <button key={t} type="button" className="lx-gchip" aria-pressed={t === group} onClick={() => setGroup(t)}>{tagLabel(t)}</button>
            ))}
          </div>
          <p className="lx-cmp-title" aria-live="polite">
            Showing <strong>{group === 'all' ? 'all simulated students' : groupPeople(group)}</strong>. Points gained out of 10.
          </p>
          <ol className="lx-bars">
            {bars.map(({ row, v }) => (
              <li key={`${group}-${row.tutor_id}`} className="lx-bar">
                <span className="lx-bar-name">
                  {row.tutor_name}
                  {row.critical_fail && <span className="lx-bar-flag"><Icon name="flag" size={13} /><span className="sr-only"> Safety flag</span></span>}
                </span>
                <span className="lx-bar-track" aria-hidden="true">
                  <span className="lx-bar-fill" style={{ '--v': Math.max(0, Math.min(1, v / scale)) }} />
                </span>
                <span className="lx-bar-num">{v.toFixed(1)}<span className="sr-only"> points gained</span></span>
              </li>
            ))}
          </ol>
          <p className="lx-note lx-cmp-scale">Every bar uses the same scale, 0 to {scale} points.</p>
        </Reveal>

        <Reveal blur={false} delay={0.08} className="glass lx-fold-wrap">
          <details className="lx-fold">
            <summary className="lx-fold-sum">
              <span>See the full table</span>
              <Icon name="chevron" size={18} className="lx-guide-chev" />
            </summary>
            <div className="lx-fold-body">
              <p className="lx-note">Each number is the points gained out of 10 by that group. Darker means more.</p>
              <div className="lx-heat-panel">
                <div className="lx-heat-scroll" role="region" aria-label="Average gain by tool type and group" tabIndex={0} ref={heatRef}>
                  <table className={`lx-heat ${heatClass}`}>
                    <caption className="sr-only">Average gain in points out of 10, by tool type and student group</caption>
                    <thead>
                      <tr>
                        <th scope="col"><span className="sr-only">Tool type</span></th>
                        {ratings.tags.map((t) => <th key={t} scope="col" className={t === 'all' ? 'lx-col-all' : undefined}>{tagLabel(t)}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {ratings.rows.map((row, ri) => (
                        <tr key={row.tutor_id}>
                          <th scope="row">
                            <span className="lx-row-name">
                              <Link to={`/lab?tutor=${row.tutor_id}`}>{row.tutor_name}</Link>
                              {row.critical_fail && <SafetyBadge />}
                            </span>
                          </th>
                          {ratings.tags.map((t, ci) => {
                            const v = row.avg_gain[t]
                            return (
                              <td key={t} className="lx-cell" data-s={stepOf(v, max)} style={{ '--d': ri + ci }}
                                {...tip.bind(`${row.tutor_name}, ${tagLabel(t)}: ${v.toFixed(1)} points gained`)}>
                                {v.toFixed(1)}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="lx-legend">
                  <span>0</span>
                  <span className="lx-legend-ramp" aria-hidden="true">{Array.from({ length: STEPS }, (_, i) => <span key={i} />)}</span>
                  <span>{fmt(max)}+ points</span>
                </div>
                <p className="lx-guide-key">
                  <SafetyBadge /> <span>marks a tool type that did not pass one safety check.</span>
                </p>
              </div>
            </div>
          </details>
        </Reveal>
      </section>

      <section className="lx-sec" aria-labelledby="sc-h">
        <Reveal>{SCORES_HEAD}</Reveal>
        <RevealGroup className="lx-score-grid">
          {ratings.rows.map((row) => <ScoreItem key={row.tutor_id} row={row} />)}
        </RevealGroup>
      </section>
      {tip.node}
    </div>
  )
}

// A glass card per tutor; its bars grow once the card is in view.
function ScoreItem({ row }) {
  const [ref, inView] = useInView()
  return (
    <Reveal as="article" blur={false} className="glass lx-score-card">
      <header>
        <h3>{row.tutor_name}</h3>
        {row.critical_fail && <SafetyBadge />}
      </header>
      <div ref={ref}>
        <ScoreBars scores={row.scores} grow play={inView} explain />
      </div>
      <Link to={`/lab?tutor=${row.tutor_id}`} className="link-quiet"><Icon name="users" size={15} /> See the class</Link>
    </Reveal>
  )
}
