import { useEffect, useId, useState } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'motion/react'
import { SCORE_LABEL, SCORE_HELP, SCORE_ICON } from '../labels.js'
import { spring, tokenS, useReduced } from '../motion.js'
import { DigitFade } from './Swap.jsx'
import Icon from './Icon.jsx'

// Three separate bars, number always printed. Scores are 1.0 to 5.0.
// grow: when `play` turns true each bar slides out of the left edge of its track on a spring
//       (--spring-bar, --stagger-bar) and its number counts up with it, settling on the exact value.
//       `delay` (seconds) holds the first bar back, e.g. until its card has arrived.
// explain: each label is a button that opens a short explanation (accordion).
export default function ScoreBars({ scores, help = false, grow = false, play = true, explain = false, delay = 0 }) {
  const reduced = useReduced()
  const anim = grow && !reduced
  return (
    <dl className={`scorebars ${help ? 'has-help' : ''} ${explain ? 'has-explain' : ''} ${anim ? 'is-springy' : ''}`}>
      {['safety', 'usability', 'learning'].map((k, i) => (
        <Row key={k} k={k} v={scores[k]} i={i} help={help} anim={anim} play={play} explain={explain} delay={delay} />
      ))}
    </dl>
  )
}

function Row({ k, v, i, help, anim, play, explain, delay }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const p = useMotionValue(anim ? 0 : 1)
  const transform = useTransform(p, (t) => `translateX(${((t - 1) * 100).toFixed(3)}%)`)
  const num = useTransform(p, (t) => (v * Math.min(1, t)).toFixed(1))

  useEffect(() => {
    if (!anim) { p.set(1); return }
    if (!play) return
    const run = animate(p, 1, spring('bar', { delay: delay + i * tokenS('--stagger-bar', 0.05) }))
    return () => run.stop()
  }, [anim, play, delay, i, p])

  const width = `${(v / 5) * 100}%`
  return (
    <div className="scorebar" style={{ '--bar-i': i }}>
      <dt>
        {explain ? (
          <button type="button" className="scorebar-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
            <Icon name={SCORE_ICON[k]} size={16} className="score-ico" />
            {SCORE_LABEL[k]}
            <Icon name="chevron" size={16} className="chev" />
          </button>
        ) : <><Icon name={SCORE_ICON[k]} size={16} className="score-ico" />{SCORE_LABEL[k]}</>}
        {help && <span className="scorebar-help">{SCORE_HELP[k]}</span>}
      </dt>
      <dd>
        <span className="track" role="meter" aria-label={`${SCORE_LABEL[k]} score`} aria-valuemin={1} aria-valuemax={5} aria-valuenow={v} aria-valuetext={`${v.toFixed(1)} out of 5`}>
          {anim
            ? <motion.span className="fill" style={{ width, transform }} />
            : <span className="fill" style={{ width }} />}
        </span>
        {anim ? (
          <span className="num">
            <span aria-hidden="true"><motion.span>{num}</motion.span><span className="of"> / 5</span></span>
            <span className="sr-only">{v.toFixed(1)} out of 5</span>
          </span>
        ) : (
          <span className="num"><DigitFade value={v.toFixed(1)} /><span className="of"> / 5</span></span>
        )}
      </dd>
      {explain && (
        <div className="acc" id={id} data-open={open}>
          <div className="acc-inner" inert={open ? undefined : ''}>
            <p className="scorebar-help">{SCORE_HELP[k]}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export function SafetyBadge({ children = 'Safety flag' }) {
  return (
    <span className="badge badge-warn">
      <Icon name="flag" size={14} className="badge-flag-ico" />
      {children}
    </span>
  )
}
