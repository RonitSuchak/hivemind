import { useRef } from 'react'
import { motion, useMotionValue, useScroll, useSpring, useTransform } from 'motion/react'
import { useReduced } from '../motion.js'
import StatWheel from './StatWheel.jsx'

// How the match works, as four small scenes you scroll through. Each scene draws itself as it
// comes up the screen (progress follows the scroll, smoothed by a spring):
//   1 your answers become a profile of five things   2 the five closest of 30 simulated students
//   are found   3 we look at how much those five learned with each tool type   4 the ranking.
// The numbers are an example, and say so. Reduced motion shows every scene finished.

const TYPES = ['Tool A', 'Tool B', 'Tool C', 'Tool D'] // made-up tools: this drawing explains the method, it reports nothing
const GAINS = [[5, 4, 4, 5, 4], [3, 2, 2, 3, 2], [2, 3, 1, 2, 2], [1, 1, 0.5, 1, 1]] // five students per tool type
const AVG = GAINS.map((g) => g.reduce((a, b) => a + b, 0) / g.length)
const TRAITS = [['Already knows', 0.5], ['New ideas', 0.8], ['Reading', 0.4], ['English', 0.9], ['Staying power', 0.6]]
// The same example profile as stat-wheel stats (the About film uses it too).
export const PROFILE_STATS = TRAITS.map(([label, value]) => ({ key: label, label, value }))

// 30 students scattered around "you": distance on the page stands for how different their profile is.
const YOU = { x: 160, y: 96 }
const CLASS = (() => {
  let s = 7
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  const pts = []
  while (pts.length < 30) {
    const p = { x: 18 + rnd() * 284, y: 14 + rnd() * 164 }
    const d = Math.hypot(p.x - YOU.x, p.y - YOU.y)
    if (d > 20 && pts.every((q) => Math.hypot(p.x - q.x, p.y - q.y) > 17)) pts.push({ ...p, d })
  }
  const cut = [...pts].sort((a, b) => a.d - b.d)[4].d
  return { pts: pts.map((p) => ({ ...p, near: p.d <= cut })), ring: cut + 9 }
})()

// A scene's own scroll progress, 0 to 1.
function useSceneProgress(ref) {
  const reduced = useReduced()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.88', 'start 0.32'] })
  const smooth = useSpring(scrollYProgress, { stiffness: 90, damping: 22 })
  const done = useMotionValue(1)
  return reduced ? done : smooth
}
const useSeg = (p, a, b) => useTransform(p, [a, b], [0, 1], { clamp: true })

function Scene({ n, title, children, draw: Draw }) {
  const ref = useRef(null)
  const p = useSceneProgress(ref)
  return (
    <li className="ms-scene" ref={ref}>
      <div className="ms-text">
        <span className="ms-n" aria-hidden="true">{n}</span>
        <h3>{title}</h3>
        <p>{children}</p>
      </div>
      <div className="ms-art" aria-hidden="true"><Draw p={p} /></div>
    </li>
  )
}

// Scene 1: the example profile as a stat wheel; it fades in as the scene comes up.
function Profile({ p }) {
  const show = useSeg(p, 0, 0.45)
  return (
    <motion.div className="ms-wheel" style={{ opacity: show }}>
      <StatWheel stats={PROFILE_STATS} tone="ink" size={260} label="Example profile" />
    </motion.div>
  )
}

function Nearest({ p }) {
  const klass = useSeg(p, 0, 0.35), ring = useSeg(p, 0.35, 0.8), near = useSeg(p, 0.55, 1)
  const fade = useTransform(near, [0, 1], [1, 0.35])
  return (
    <svg viewBox="0 0 320 190">
      <motion.g style={{ opacity: klass }}>
        <motion.g style={{ opacity: fade }}>{CLASS.pts.filter((d) => !d.near).map((d, i) => <circle key={i} className="ms-dot" cx={d.x} cy={d.y} r="6" />)}</motion.g>
        {CLASS.pts.filter((d) => d.near).map((d, i) => <circle key={i} className="ms-dot" cx={d.x} cy={d.y} r="6" />)}
      </motion.g>
      <motion.circle className="ms-ring" cx={YOU.x} cy={YOU.y} r={CLASS.ring} style={{ pathLength: ring, opacity: ring }} transform={`rotate(-90 ${YOU.x} ${YOU.y})`} />
      {CLASS.pts.filter((d) => d.near).map((d, i) => <motion.circle key={i} className="ms-near" cx={d.x} cy={d.y} r="7" style={{ opacity: near }} />)}
      <circle className="ms-you" cx={YOU.x} cy={YOU.y} r="8" />
      <text className="ms-label ms-label-you" x={YOU.x} y={YOU.y + 24} textAnchor="middle">You</text>
    </svg>
  )
}

function Worked({ p }) {
  const cols = [useSeg(p, 0, 0.45), useSeg(p, 0.12, 0.57), useSeg(p, 0.24, 0.69), useSeg(p, 0.36, 0.81)]
  const avg = useSeg(p, 0.75, 1)
  const base = 150, unit = 24
  return (
    <svg viewBox="0 0 320 190">
      <line className="ms-axis" x1="8" y1={base} x2="312" y2={base} />
      {GAINS.map((g, c) => {
        const x = 16 + c * 76
        return (
          <g key={c}>
            <motion.g style={{ scaleY: cols[c], transformOrigin: '50% 100%', transformBox: 'fill-box' }}>
              {g.map((v, i) => <rect key={i} className="ms-bar" x={x + i * 12} y={base - v * unit} width="8" height={v * unit} rx="3" />)}
            </motion.g>
            <motion.g style={{ opacity: avg }}>
              <line className="ms-avg" x1={x - 3} x2={x + 59} y1={base - AVG[c] * unit} y2={base - AVG[c] * unit} />
              <text className="ms-num" x={x + 28} y={base - Math.max(...g) * unit - 8} textAnchor="middle">+{AVG[c].toFixed(1)}</text>
            </motion.g>
            <text className="ms-label" x={x + 28} y={base + 16} textAnchor="middle">{TYPES[c].split(' ')[0]}</text>
            <text className="ms-label" x={x + 28} y={base + 29} textAnchor="middle">{TYPES[c].split(' ')[1] ?? ''}</text>
          </g>
        )
      })}
    </svg>
  )
}

function Ranked({ p }) {
  const rows = [useSeg(p, 0, 0.5), useSeg(p, 0.15, 0.65), useSeg(p, 0.3, 0.8), useSeg(p, 0.45, 0.95)]
  return (
    <svg viewBox="0 0 320 190">
      {TYPES.map((name, i) => (
        <g key={name} transform={`translate(0 ${16 + i * 42})`}>
          <text className="ms-rank" x="0" y="20">{i + 1}</text>
          <text className="ms-label ms-label-strong" x="22" y="9">{name}</text>
          <rect className="ms-track" x="22" y="16" width="240" height="12" rx="6" />
          <motion.rect className={i === 0 ? 'ms-fill ms-fill-top' : 'ms-fill ms-fill-ink'} x="22" y="16" width={240 * (AVG[i] / 5)} height="12" rx="6" style={{ scaleX: rows[i], transformOrigin: '0% 50%', transformBox: 'fill-box' }} />
          <motion.text className="ms-num" x="270" y="27" style={{ opacity: rows[i] }}>+{AVG[i].toFixed(1)}</motion.text>
        </g>
      ))}
    </svg>
  )
}

export default function MatchDiagram() {
  return (
    <div className="ms">
      <ol className="ms-list">
        <Scene n="1" title="You take the check" draw={Profile}>Your answers show <strong>five things</strong> about how you learn. Together they are your <strong>profile</strong>.</Scene>
        <Scene n="2" title="We find students like you" draw={Nearest}>The class has <strong>30 simulated students</strong>, each with a profile. We pick the <strong>5 closest</strong> to yours.</Scene>
        <Scene n="3" title="We see what worked for them" draw={Worked}>Each of those 5 had a lesson with <strong>every demo tool</strong>. We <strong>average</strong> how much they gained, and the <strong>closest students count more</strong>.</Scene>
        <Scene n="4" title="You get your ranking" draw={Ranked}>The demo tool that <strong>taught them most</strong> comes first. If nobody in the class is close to you, we show <strong>no ranking</strong> rather than guess. The tools and numbers in these drawings are made up to show how it works.</Scene>
      </ol>
    </div>
  )
}
