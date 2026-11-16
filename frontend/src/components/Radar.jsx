import { useEffect, useId, useRef } from 'react'
import { animate, motion, useInView, useMotionValue, useTransform } from 'motion/react'
import { spring, tokenS, useReduced } from '../motion.js'

// Five axes. Reading age is mapped 6..16 years -> 0..1 for display only.
export const AXES = [
  ['Starting level', (p) => p.start_level],
  ['Learning speed', (p) => p.learn_speed],
  ['Reading age', (p) => (p.reading_age - 6) / 10],
  ['English', (p) => p.english],
  ['Persistence', (p) => p.persistence],
]
const clamp = (x) => Math.max(0, Math.min(1, x))
const values = (p) => AXES.map(([, f]) => clamp(f(p)))

const W = 400, H = 340, CX = W / 2, CY = 176, R = 112
const pt = (i, v, r = R) => {
  const a = ((-90 + i * 72) * Math.PI) / 180
  return [CX + Math.cos(a) * r * v, CY + Math.sin(a) * r * v]
}
const poly = (vals) => vals.map((v, i) => pt(i, v).join(',')).join(' ')

// variant="hero": the big animated chart on Results (labels in HTML so they stay readable at any size).
// Default: the small static chart (Lab drawer uses `compact`).
export default function Radar(props) {
  if (props.variant === 'hero') return <RadarHero {...props} />
  const { profile, others = [], label = 'Learning profile', compact = false, staged = false } = props
  return <RadarStatic profile={profile} others={others} label={label} compact={compact} staged={staged} />
}

function RadarStatic({ profile, others, label, compact, staged }) {
  const id = useId()
  const vals = values(profile)
  const summary = AXES.map(([n], i) => `${n} ${Math.round(vals[i] * 100)} out of 100`).join(', ')
  return (
    <svg className={`radar ${compact ? 'radar-compact' : ''} ${staged ? 'radar-staged' : ''}`} viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${id}t ${id}d`}>
      <title id={`${id}t`}>{label}</title>
      <desc id={`${id}d`}>{summary}.{others.length ? ` Faint outlines show ${others.length} simulated students.` : ''}</desc>
      {[0.25, 0.5, 0.75, 1].map((s) => (
        <polygon key={s} points={poly(AXES.map(() => s))} className="radar-ring" />
      ))}
      {AXES.map((_, i) => {
        const [x, y] = pt(i, 1)
        return <line key={i} x1={CX} y1={CY} x2={x} y2={y} className="radar-spoke" />
      })}
      {others.map((o, k) => (
        <polygon key={k} points={poly(values(o))} className="radar-other" style={{ '--i': k }} />
      ))}
      <g className="radar-you-wrap" style={{ transformOrigin: `${CX}px ${CY}px` }}>
        <polygon points={poly(vals)} className="radar-you" />
        {vals.map((v, i) => {
          const [x, y] = pt(i, v)
          return <circle key={i} cx={x} cy={y} r="4" className="radar-pt" />
        })}
      </g>
      {AXES.map(([name], i) => {
        const [x, y] = pt(i, 1, R + 18)
        const anchor = Math.abs(x - CX) < 6 ? 'middle' : x > CX ? 'start' : 'end'
        return (
          <text key={name} x={x} y={y + (i === 0 ? -2 : 5)} textAnchor={anchor} className="radar-label">{name}</text>
        )
      })}
    </svg>
  )
}

// ---------- Hero ----------
// Geometry leaves room inside the box for the HTML labels at 390px wide.
const HW = 420, HH = 296, HCX = 210, HCY = 157, HR = 118, GAP = 15
const ang = (i) => ((-90 + i * 72) * Math.PI) / 180
const hpt = (i, v, r = HR) => [HCX + Math.cos(ang(i)) * r * v, HCY + Math.sin(ang(i)) * r * v]
const hpoly = (vals) => vals.map((v, i) => hpt(i, v).map((n) => n.toFixed(2)).join(',')).join(' ')
const ONES = AXES.map(() => 1)

// When each part of the hero chart arrives (seconds after it comes into view). Results uses this
// to bring the caption in after the last outline.
export function heroTiming(n = 0) {
  const shape = spring('shape').visualDuration
  const vertex = tokenS('--stagger-vertex', 0.045)
  const outline = tokenS('--stagger-outline', 0.09)
  const outlinesAt = shape * 0.75 + vertex * 4
  return { vertex, outline, outlinesAt, doneAt: outlinesAt + Math.max(0, n - 1) * outline + spring('ui').visualDuration * 0.6 }
}

function RadarHero({ profile, others = [], label = 'Learning profile' }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const reduced = useReduced()
  const box = useRef(null)
  const inView = useInView(box, { once: true, margin: '0px 0px -8% 0px' })
  const play = inView || reduced
  const vals = values(profile)
  const start = reduced ? 1 : 0
  // One progress value per vertex (0 = centre, 1 = the person's value), so the shape grows out of
  // the centre with a slight stagger round the axes.
  const ps = [useMotionValue(start), useMotionValue(start), useMotionValue(start), useMotionValue(start), useMotionValue(start)]
  const points = useTransform(ps, (ts) => hpoly(vals.map((v, i) => v * ts[i])))
  const t = heroTiming(others.length)

  useEffect(() => {
    if (!play) return
    if (reduced) { ps.forEach((m) => m.set(1)); return }
    const runs = ps.map((m, i) => animate(m, 1, spring('shape', { delay: i * t.vertex })))
    return () => runs.forEach((r) => r.stop())
  }, [play, reduced]) // eslint-disable-line react-hooks/exhaustive-deps

  const summary = AXES.map(([n], i) => `${n} ${Math.round(vals[i] * 100)} out of 100`).join(', ')
  const fade = (delay = 0) => (reduced
    ? { initial: false }
    : { initial: { opacity: 0 }, animate: play ? { opacity: 1 } : { opacity: 0 }, transition: spring('ui', { delay }) })

  return (
    <div className="rh" ref={box} style={{ aspectRatio: `${HW} / ${HH}` }}>
      <svg className="rh-svg" viewBox={`0 0 ${HW} ${HH}`} role="img" aria-labelledby={`${id}t ${id}d`}>
        <title id={`${id}t`}>{label}</title>
        <desc id={`${id}d`}>{summary}.{others.length ? ` Faint outlines show ${others.length} simulated students.` : ''}</desc>
        <defs>
          <radialGradient id={`${id}f`} cx={HCX} cy={HCY} r={HR} gradientUnits="userSpaceOnUse">
            <stop offset="0" className="rh-stop-in" />
            <stop offset="1" className="rh-stop-out" />
          </radialGradient>
          <filter id={`${id}g`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>

        <motion.g className="rh-grid" {...fade(0)}>
          <polygon points={hpoly(ONES)} className="rh-plate" />
          {[0.25, 0.5, 0.75].map((s) => <polygon key={s} points={hpoly(AXES.map(() => s))} className="rh-ring" />)}
          <polygon points={hpoly(ONES)} className="rh-ring rh-ring-outer" />
          {AXES.map((_, i) => {
            const [x, y] = hpt(i, 1)
            return <line key={i} x1={HCX} y1={HCY} x2={x} y2={y} className="rh-spoke" />
          })}
        </motion.g>

        {/* Fill and glow under the outlines, so the outlines stay visible inside the shape; stroke on top */}
        <motion.g {...fade(0)}>
          <motion.polygon points={points} className="rh-glow" filter={`url(#${id}g)`} />
          <motion.polygon points={points} className="rh-fill" fill={`url(#${id}f)`} />
        </motion.g>

        {others.map((o, k) => (
          <motion.polygon key={o.id ?? k} points={hpoly(values(o))} className="rh-other" {...fade(t.outlinesAt + k * t.outline)} />
        ))}

        <motion.g {...fade(0)}>
          <motion.polygon points={points} className="rh-you" />
          {vals.map((v, i) => <Dot key={i} i={i} v={v} p={ps[i]} />)}
        </motion.g>
      </svg>

      {AXES.map(([name], i) => {
        const [x, y] = hpt(i, 1, HR + GAP)
        const c = Math.cos(ang(i)), s = Math.sin(ang(i))
        const style = {
          left: `${(x / HW) * 100}%`, top: `${(y / HH) * 100}%`,
          '--tx': `${-(50 - 50 * c)}%`, '--ty': `${-(50 - 50 * s)}%`,
          textAlign: c > 0.3 ? 'left' : c < -0.3 ? 'right' : 'center',
        }
        const side = Math.abs(c) > 0.8 ? 'rh-label-side' : ''
        return <motion.span key={name} className={`rh-label ${side}`} aria-hidden="true" style={style} {...fade(i * t.vertex)}>{name}</motion.span>
      })}
    </div>
  )
}

function Dot({ i, v, p }) {
  const cx = useTransform(p, (t) => hpt(i, v * t)[0])
  const cy = useTransform(p, (t) => hpt(i, v * t)[1])
  return <motion.circle cx={cx} cy={cy} r="4.5" className="rh-pt" />
}
