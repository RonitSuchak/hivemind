import { useEffect, useId, useRef, useState } from 'react'
import '../at/stat-wheel.css'

// Stat wheel: a learning profile as a round dial.
//   - an outer ring carries the stat names, written round the curve
//   - one spoke per stat, marked E (centre) to A (edge); the first spoke shows the letters
//   - the filled shape reaches further along a spoke the higher that stat is
//   - a big grade sits at the end of each spoke: E, E+, D, D+, C, C+, B, B+, A, A+ (ten steps)
// Works for any number of stats. The lab's model has five; a person's own result may add a sixth (pace).
//
//   <StatWheel stats={[{ key: 'reading', label: 'Reading', value: 0.78 }, ...]} />
//   stats[i].value    0..1, or null when it was not measured (shown as "NONE")
//   stats[i].display  optional small text under the grade, e.g. "age 13" (shown when showValues is on)
//   stats[i].note     optional small text under the grade, e.g. "not used in the ranking"
//   compare           optional { key: 0..1 }: a dashed outline (e.g. the matched students' average)
//   tone              'pop' (orange: a person) or 'ink' (midnight: a simulated student or an example)
//   active            optional. Leave it out and the wheel plays once when it scrolls into view. Pass true/false
//                     to play it yourself: true starts the climb from E, false puts it back to E (the About film does this).
const C = 180, DIAL = 86, GRADE = 113, BAND_IN = 138, BAND_OUT = 168 // dial edge, grade letters, name ring: even gaps between the three
const GROW = 1300, STAGGER = 170 // ms: each stat climbs from E to its grade, one after another
export const GRADES = ['E', 'E+', 'D', 'D+', 'C', 'C+', 'B', 'B+', 'A', 'A+']
// 0..1 becomes one of ten grades: every tenth is one step.
export const gradeOf = (v) => (v == null ? null : GRADES[Math.min(9, Math.max(0, Math.floor(v * 10)))])
const rad = (deg) => (deg * Math.PI) / 180
const pt = (deg, r) => [C + Math.cos(rad(deg)) * r, C + Math.sin(rad(deg)) * r]
const f = (n) => n.toFixed(1)
// An arc for a label to sit on. Labels in the lower half run the other way, so they are never upside down.
function labelArc(mid, span, flip) {
  const r = flip ? (BAND_IN + BAND_OUT) / 2 + 4.5 : (BAND_IN + BAND_OUT) / 2 - 4.5
  const [a, b] = flip ? [mid + span, mid - span] : [mid - span, mid + span]
  const [x1, y1] = pt(a, r), [x2, y2] = pt(b, r)
  return `M${f(x1)} ${f(y1)}A${r} ${r} 0 0 ${flip ? 0 : 1} ${f(x2)} ${f(y2)}`
}

export default function StatWheel({ stats, compare, tone = 'pop', size = 300, label = 'Learning profile', showValues = false, className = '', active }) {
  const uid = useId().replace(/:/g, '')
  // Entrance: when the wheel scrolls into view, every stat starts at E and climbs to its real grade.
  const root = useRef(null)
  const [ms, setMs] = useState(() => (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? Infinity : -1)) // -1 = not started
  const reduced = useRef(ms === Infinity).current
  useEffect(() => {
    if (reduced) return
    let raf = 0, t0 = 0, safety = 0, io = null
    const total = GROW + STAGGER * stats.length
    const tick = (now) => { if (!t0) t0 = now; const e = now - t0; setMs(e >= total ? Infinity : e); if (e < total) raf = requestAnimationFrame(tick) }
    // if frames are not running (hidden tab), jump to the real grades so the wheel never sits on a wrong value
    const play = () => { raf = requestAnimationFrame(tick); safety = setTimeout(() => setMs(Infinity), total + 400) }
    if (active === true) { setMs(-1); play() }
    else if (active === false) setMs(-1) // waiting, at E
    else {
      io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { io.disconnect(); play() } }, { threshold: 0.35 })
      io.observe(root.current)
    }
    return () => { io?.disconnect(); cancelAnimationFrame(raf); clearTimeout(safety) }
  }, [active]) // eslint-disable-line react-hooks/exhaustive-deps
  const grown = (i) => { // 0..1 for stat i, eased so it settles gently
    if (ms === Infinity) return 1
    const t = Math.max(0, Math.min(1, (ms - i * STAGGER) / GROW))
    return 1 - Math.pow(1 - t, 3)
  }
  const now = (s, i) => (s.value == null ? null : s.value * grown(i)) // the value as it is drawn right now
  const n = stats.length, step = 360 / n
  const ang = (i) => -90 + i * step
  const reach = (v) => DIAL * Math.max(0.07, Math.min(1, v ?? 0))
  const shape = (get) => 'M' + stats.map((s, i) => pt(ang(i), reach(get(s, i))).map(f).join(' ')).join('L') + 'Z'
  const spoken = `${label}: ` + stats.map((s) => `${s.label} ${s.value == null ? 'not measured' : `grade ${gradeOf(s.value)}`}${s.display ? `, ${s.display}` : ''}`).join('; ')
  return (
    <svg ref={root} className={`wheel wheel-${tone} ${className}`} viewBox="0 0 360 360" width={size} height={size} role="img" aria-label={spoken}>
      {/* outer ring: the names, with small marks between them */}
      <circle className="wheel-band" cx={C} cy={C} r={(BAND_IN + BAND_OUT) / 2} strokeWidth={BAND_OUT - BAND_IN} />
      <circle className="wheel-edge" cx={C} cy={C} r={BAND_OUT} />
      <circle className="wheel-edge" cx={C} cy={C} r={BAND_IN} />
      {Array.from({ length: n * 6 }, (_, k) => {
        if (k % 6 === 0) return null // the name sits here
        const a = -90 + (k * step) / 6, big = k % 6 === 3
        const [x1, y1] = pt(a, BAND_OUT - (big ? 11 : 6)), [x2, y2] = pt(a, BAND_OUT)
        return <line key={k} className={big ? 'wheel-mark wheel-mark-big' : 'wheel-mark'} x1={f(x1)} y1={f(y1)} x2={f(x2)} y2={f(y2)} />
      })}
      {stats.map((s, i) => {
        const flip = Math.sin(rad(ang(i))) > 0.3
        const span = Math.min(step / 2 - 3, 50)
        // shrink the type when the name is longer than its arc (about 9 units a capital at 12.5px, with spacing)
        const arcLen = ((BAND_IN + BAND_OUT) / 2) * rad(span * 2), want = s.label.length * 9.4
        const fs = want > arcLen * 0.94 ? Math.max(8, 12.5 * (arcLen * 0.94) / want) : null
        return (
          <g key={s.key}>
            <path id={`${uid}-${i}`} d={labelArc(ang(i), span, flip)} fill="none" />
            <text className="wheel-name" style={fs ? { fontSize: fs.toFixed(1) } : undefined}><textPath href={`#${uid}-${i}`} startOffset="50%" textAnchor="middle">{s.label.toUpperCase()}</textPath></text>
          </g>
        )
      })}
      {/* the dial: rings at E..A, one spoke per stat */}
      <circle className="wheel-dial" cx={C} cy={C} r={DIAL} />
      {[0.2, 0.4, 0.6, 0.8].map((k) => <circle key={k} className="wheel-ring" cx={C} cy={C} r={DIAL * k} />)}
      {stats.map((s, i) => {
        const [x, y] = pt(ang(i), DIAL)
        return (
          <g key={s.key}>
            <line className="wheel-spoke" x1={C} y1={C} x2={f(x)} y2={f(y)} />
            {[0.2, 0.4, 0.6, 0.8, 1].map((k) => { const [tx, ty] = pt(ang(i), DIAL * k), [nx, ny] = [Math.cos(rad(ang(i) + 90)) * 3, Math.sin(rad(ang(i) + 90)) * 3]; return <line key={k} className="wheel-tick" x1={f(tx - nx)} y1={f(ty - ny)} x2={f(tx + nx)} y2={f(ty + ny)} /> })}
          </g>
        )
      })}
      {compare && <path className="wheel-compare" d={shape((s) => compare[s.key] ?? 0)} />}
      <path className="wheel-fill" d={shape(now)} />
      {stats.map((s, i) => s.value != null && <circle key={s.key} className="wheel-dot" cx={f(pt(ang(i), reach(now(s, i)))[0])} cy={f(pt(ang(i), reach(now(s, i)))[1])} r="2.8" />)}
      {/* the scale letters, once, beside the first spoke */}
      {['E', 'D', 'C', 'B', 'A'].map((g, k) => <text key={g} className="wheel-scale" x={C - 7} y={C - DIAL * (k + 1) * 0.2} textAnchor="end" dominantBaseline="central">{g}</text>)}
      {/* the grade at the end of each spoke */}
      {stats.map((s, i) => {
        const [x, y] = pt(ang(i), GRADE), g = gradeOf(now(s, i))
        const sub = [showValues ? s.display : null, s.note].filter(Boolean).join(' · ')
        return (
          <g key={s.key}>
            {/* key = the letter, so each new letter is a new element and plays the small pop in stat-wheel.css */}
            <text key={g || 'none'} className={g ? 'wheel-grade' : 'wheel-grade wheel-grade-none'} x={f(x)} y={f(y)} textAnchor="middle" dominantBaseline="central">{g || 'NONE'}</text>
            {sub && <text className="wheel-sub" x={f(x)} y={f(y + 17)} textAnchor="middle">{sub}</text>}
          </g>
        )
      })}
      <circle className="wheel-hub" cx={C} cy={C} r="3.2" />
    </svg>
  )
}
