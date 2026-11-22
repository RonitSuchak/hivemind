import { useData } from '../api.js'
import { Failed, Loading, usePageTitle } from '../components.jsx'
import { TYPES, fmtDate, fmtGain, plural } from '../lib.js'

const LEFT_OUT = { off_topic: 'Used the tool for another topic', missing: 'Missed one of the two tests' }

function Compare({ groups, ratings }) {
  const rows = groups
    .map((g) => ({ ...g, sim: ratings.rows.find((r) => r.tutor_id === g.tutor_id)?.avg_gain.all ?? 0 }))
    .sort((a, b) => b.sim - a.sim)
  const max = Math.max(3, ...rows.flatMap((r) => [r.sim, r.avg_gain]))
  const realOrder = [...rows].sort((a, b) => b.avg_gain - a.avg_gain)
  const topMatches = realOrder[0].tutor_id === rows[0].tutor_id
  const restMatches = rows.every((r, i) => r.tutor_id === realOrder[i].tutor_id)
  return (
    <>
      <div className="card compare" role="group" aria-label="Average gain by type of tool: simulated class against real classmates">
        {rows.map((r) => (
          <div className="compare-row" key={r.tutor_id}>
            <div>
              <strong>{TYPES[r.tutor_id]}</strong>
              <br />
              <small className="muted">{plural(r.n, 'real student')}</small>
            </div>
            <div className="compare-bars">
              <div className="hbar">
                <span>Simulated</span>
                <span className="track" aria-hidden="true"><i style={{ '--v': Math.max(0, r.sim) / max }} /></span>
                <b>{fmtGain(r.sim, 1)}</b>
              </div>
              <div className="hbar real">
                <span>Real class</span>
                <span className="track" aria-hidden="true"><i style={{ '--v': Math.max(0, r.avg_gain) / max }} /></span>
                <b>{fmtGain(r.avg_gain, 1)}</b>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-3" style={{ marginTop: 16 }}>
        <div className={`banner${topMatches ? '' : ' error'}`}>
          <strong>{topMatches ? 'The top pick matched.' : 'The top pick did not match.'}</strong>{' '}
          {topMatches
            ? `${TYPES[rows[0].tutor_id]} came first in the simulation and gave real students the biggest gain too.`
            : `The simulation put ${TYPES[rows[0].tutor_id]} first, but real students gained most with ${TYPES[realOrder[0].tutor_id]}.`}
        </div>
        {!restMatches && (
          <div className="banner error">
            <strong>The rest of the order did not.</strong>{' '}
            The simulation put {TYPES[rows[1].tutor_id]} second; with real students it came {['first', 'second', 'third', 'last'][realOrder.findIndex((r) => r.tutor_id === rows[1].tutor_id)]}.
            We show this because a test that hides its misses cannot be trusted.
          </div>
        )}
      </div>
    </>
  )
}

function Entries({ entries }) {
  return (
    <div className="table-wrap scroll-x">
      <table className="data">
        <caption className="sr-only">Every real classmate: tool used, test before and after, real gain and predicted gain.</caption>
        <thead>
          <tr>
            <th scope="col">Student</th>
            <th scope="col">Tool used</th>
            <th scope="col">Type of tool</th>
            <th scope="col" className="num">Before</th>
            <th scope="col" className="num">After</th>
            <th scope="col" className="num">Real gain</th>
            <th scope="col" className="num">Predicted</th>
            <th scope="col">Counted?</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.code}>
              <th scope="row" className="mono" style={{ fontWeight: 400 }}>{e.code}</th>
              <td>{e.tool || 'n/a'}</td>
              <td>{TYPES[e.tutor_id] || 'n/a'}</td>
              <td className="num">{e.before ?? 'n/a'}</td>
              <td className="num">{e.after ?? 'n/a'}</td>
              <td className={`num ${e.real_gain > 0 ? 'pos' : e.real_gain < 0 ? 'neg' : ''}`}>{fmtGain(e.real_gain)}</td>
              <td className="num">{fmtGain(e.predicted_gain, 1)}</td>
              <td>{e.left_out ? <span className="muted">No: {(LEFT_OUT[e.left_out] || e.left_out).toLowerCase()}</span> : 'Yes'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Evidence() {
  usePageTitle('Evidence')
  const { data, error, loading, retry } = useData('validation', 'ratings', 'check-test')
  const [validation, ratings, checkTest] = data || []
  const s = validation?.summary
  const leftOut = validation ? validation.entries.filter((e) => e.left_out) : []
  const collected = validation?.entries[0]?.created

  return (
    <>
      <div className="wrap page-head">
        <p className="label label-yellow">Evidence</p>
        <h1>Do simulated students predict real ones?</h1>
        <p className="lede">
          Hivemind’s scores come from simulated students, so we checked them against real ones. Classmates sat the same 10-question test, used one real EdTech tool, then sat the test again.
        </p>
      </div>

      {loading && <div className="wrap"><Loading height={520} /></div>}
      {error && <div className="wrap"><Failed error={error} retry={retry} /></div>}

      {validation && ratings && (
        <>
          <section className="section" aria-labelledby="class-h">
            <div className="wrap">
              <div className="section-head">
                <p className="label">The real class{collected ? ` · ${fmtDate(collected)}` : ''}</p>
                <h2 id="class-h">{s.count} classmates, one lesson each</h2>
              </div>
              <div className="grid grid-3">
                <div className="card">
                  <p className="stat">{s.count}</p>
                  <p>classmates took part, each known only by an anonymous code. No names were stored.</p>
                </div>
                <div className="card">
                  <p className="stat">{s.counted}</p>
                  <p>results counted. {leftOut.length} were left out: {Object.entries(LEFT_OUT).map(([k, label]) => `${leftOut.filter((e) => e.left_out === k).length} ${label.toLowerCase()}`).join(', ')}.</p>
                </div>
                <div className="card">
                  <p className="stat">{s.within_1}<span className="muted" style={{ fontSize: '1.2rem' }}> of {s.with_prediction}</span></p>
                  <p>personal predictions landed within 1 mark of the real gain. The average miss was {s.avg_error.toFixed(1)} marks.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="section" aria-labelledby="compare-h">
            <div className="wrap">
              <div className="section-head">
                <p className="label">Simulated against real</p>
                <h2 id="compare-h">Average gain by type of tool</h2>
                <p>Marks gained out of 10. Real students used real products of each type, not our demo tools, so this tests the type of tool.</p>
              </div>
              <Compare groups={s.by_group} ratings={ratings} />
              <p className="note">
                Hivemind could give a personal prediction to {s.with_prediction} of {s.count} classmates. For the rest, no simulated student was close enough, so it gave no prediction instead of guessing.
                One class and one topic: treat this as a first check, not a final verdict.
              </p>
            </div>
          </section>

          {checkTest && (
            <section className="section" aria-labelledby="check-h">
              <div className="wrap">
                <div className="section-head">
                  <p className="label">Testing our own measuring tool</p>
                  <h2 id="check-h">Is the 8-minute check accurate?</h2>
                  <p>
                    {checkTest.students.length} made-up students with known traits took the real check: {checkTest.mix.careful} careful, {checkTest.mix.rushing} rushing,
                    {' '}{checkTest.mix.not_trying} not trying and {checkTest.mix.quit_halfway} who quit halfway. Because we know the truth for each one, we can measure how far off the check is.
                  </p>
                </div>
                <ul className="stack card" style={{ margin: 0, paddingLeft: 40, '--gap': '12px', maxWidth: '86ch' }}>
                  {checkTest.findings.map((f) => <li key={f}>{f}</li>)}
                </ul>
              </div>
            </section>
          )}

          <section className="section" aria-labelledby="all-h">
            <div className="wrap">
              <div className="section-head">
                <p className="label">Every result</p>
                <h2 id="all-h">All {validation.entries.length} classmates</h2>
                <p>Nothing is hidden, including the students who scored lower after the lesson.</p>
              </div>
              <Entries entries={validation.entries} />
            </div>
          </section>
        </>
      )}
    </>
  )
}
