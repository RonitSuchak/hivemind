import data from '../data/real-class.json'
import { typeName } from '../labels.js'

// One real class (frontend/src/data/real-class.json): each student sat the fraction test, had one lesson with a
// tool from one group, then sat the test again. Codes only, never names. Rows with a missing score, or a tool that
// does not teach fractions, stay in the table but are not counted in the averages; the page says which and why.
const ORDER = ['simple_steps', 'lecturer', 'answer_machine', 'socratic']
const gain = (s) => s.after - s.before
const fmt = (n) => (n > 0 ? `+${n.toFixed(1)}` : n.toFixed(1))
const WHY = { missing: 'missing a test score', off_topic: 'the tool does not teach fractions' }

export const realClassCount = data.students.length

export default function RealClass() {
  const all = data.students
  const used = all.filter((s) => !s.left_out)
  const groups = ORDER.map((t) => {
    const g = used.filter((s) => s.type === t)
    return { t, n: g.length, avg: g.reduce((a, s) => a + gain(s), 0) / (g.length || 1) }
  }).sort((a, b) => b.avg - a.avg)
  const max = Math.max(...groups.map((g) => g.avg), 1)
  const matched = all.filter((s) => s.site_pick).length
  const pick = all.find((s) => s.site_pick)?.site_pick
  const best = groups[0]

  return (
    <section className="lx-sec rc" aria-labelledby="rc-h">
      <div className="lx-sec-head">
        <h2 id="rc-h">We tested {all.length} real students in one class</h2>
        <p>Each student sat a 10-question fraction test, had one lesson with a tool, then sat the same test again.</p>
      </div>

      <dl className="pf-stats">
        <div className="glass pf-stat"><dt>Students who took part</dt><dd>{all.length}</dd></div>
        <div className="glass pf-stat"><dt>Counted in the averages<span>{all.length - used.length} left out, see below</span></dt><dd>{used.length}</dd></div>
        <div className="glass pf-stat"><dt>Biggest average gain<span>{typeName(best.t)}</span></dt><dd>{fmt(best.avg)}<small> marks</small></dd></div>
      </dl>

      <div className="glass rc-bars">
        <p className="rc-bars-title">Average gain by tool group, out of 10</p>
        <ul>
          {groups.map((g) => (
            <li key={g.t}>
              <span className="rc-name">{typeName(g.t)} <small>{g.n} students</small></span>
              <span className="rc-track"><span className="rc-fill" style={{ width: `${Math.max(0, g.avg) / max * 100}%` }} /></span>
              <b>{fmt(g.avg)}</b>
            </li>
          ))}
        </ul>
      </div>

      <ul className="pf-read glass rc-notes">
        <li>{typeName(pick)} gave the biggest gain, and it is also the group Hivemind picked first for every student it could match.</li>
        <li>Hivemind could match {matched} of {all.length} students to similar simulated students. For the rest it gave no prediction, so the simulated class needs more students like them.</li>
        <li>Students used real tools from each group, not Hivemind&rsquo;s demo tools, so this tests the groups, not each demo tool.</li>
        <li>One class and one topic. Treat this as a first result, not a final verdict.</li>
      </ul>

      <details className="glass rc-all">
        <summary>Every student ({all.length})</summary>
        <div className="rc-scroll">
          <table>
            <thead><tr><th>Code</th><th>Group</th><th>Tool</th><th>Before</th><th>After</th><th>Gain</th></tr></thead>
            <tbody>
              {all.map((s) => (
                <tr key={s.code} data-out={s.left_out || undefined}>
                  <td>{s.code}</td><td>{typeName(s.type)}</td><td>{s.tool}</td>
                  <td>{s.before ?? 'n/a'}</td><td>{s.after ?? 'n/a'}</td>
                  <td>{s.left_out ? `Not counted: ${WHY[s.left_out]}` : fmt(gain(s)).replace('.0', '')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  )
}
