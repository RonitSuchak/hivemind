import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { animate, motion, useInView, useMotionValue, useTransform } from 'motion/react'
import { usePageTitle } from '../hooks.js'
import { useMatch } from '../store.jsx'
import { revealTokens, spring, tokenS, useReduced } from '../motion.js'
import Reveal from '../components/Reveal.jsx'
import Radar, { heroTiming } from '../components/Radar.jsx'
import ScoreBars from '../components/ScoreBars.jsx'
import Icon from '../components/Icon.jsx'
import ToolsDrawer from '../components/ToolsDrawer.jsx'
import '../styles/advisor.css'
import '../styles/lab.css'  // calm Safety flag overrides live at the end of lab.css

export default function Results() {
  usePageTitle('Your results')
  const { match } = useMatch()
  if (!match) {
    return (
      <div className="rs">
        <div className="rs-state glass">
          <h1>No results yet</h1>
          <p>Take the check to see which tool types worked best for students like you. Results are not saved.</p>
          <Link to="/check" className="btn btn-primary btn-large">Take the check <Icon name="arrow" size={18} className="icon-nudge" /></Link>
        </div>
      </div>
    )
  }
  return <Body match={match} />
}

function Body({ match }) {
  const reduced = useReduced()
  // v3: each match already carries its name and radar, so no second request is needed.
  const near = match.matches || []
  const t = heroTiming(near.length)
  const [toolsFor, setToolsFor] = useState(null) // the ranked tutor whose similar tools are open
  const after = (delay) => (reduced ? { initial: false } : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: spring('ui', { delay }) })

  return (
    <div className="rs">
      <header className="rs-head">
        <h1>Your results</h1>
        {/* Always visible: never behind a scroll reveal. */}
        <p className="rs-note"><Icon name="target" size={18} /> <span>{match.note}</span></p>
      </header>

      <section className="rs-profile glass" aria-labelledby="profile-h">
        <div className="rs-profile-text">
          <h2 id="profile-h">Your learning profile</h2>
          <p>Your answers make this shape. The faint outlines are the closest simulated students.</p>
        </div>
        <figure className="rs-radar">
          <Radar variant="hero" profile={match.radar} others={near} label="Your learning profile" />
        </figure>
        <div className="rs-profile-key">
          <ul className="rs-key">
            <li><span className="rs-swatch rs-swatch-you" aria-hidden="true" /> You</li>
            <li><span className="rs-swatch rs-swatch-other" aria-hidden="true" /> Simulated students like you</li>
          </ul>
          <motion.p className="rs-matched" {...after(t.doneAt)}>
            Matched to {near.length} simulated students like you
            {near.length > 0 && <span>{near.map((s) => s.name).join(', ')}</span>}
          </motion.p>
          <p className="rs-fine">Simulated students are not real children.</p>
        </div>
      </section>

      {match.enough_matches === false || !match.ranked?.length ? (
        <section className="rs-ranked-wrap" aria-labelledby="ranked-h">
          <h2 id="ranked-h" className="rs-h2">No ranking this time</h2>
          <p className="rs-note" role="note"><Icon name="info" size={18} /> <span>{match.message || 'None of our simulated students are close enough to your profile to give a fair answer, so we will not guess.'}</span></p>
        </section>
      ) : (
        <section className="rs-ranked-wrap" aria-labelledby="ranked-h">
          <Reveal as="h2" id="ranked-h" className="rs-h2">Tool types that worked for students like you</Reveal>
          <ol className="rs-ranked">
            {match.ranked.map((tu, i) => <RankCard key={tu.tutor_id} t={tu} i={i} onTools={setToolsFor} />)}
          </ol>
        </section>
      )}

      {match.follow_ups?.length > 0 && (
        <section className="rs-follow" aria-labelledby="follow-h">
          <h2 id="follow-h" className="rs-h2">Questions you might have</h2>
          {match.follow_ups.map((f) => (
            <details key={f.id} className="rs-fu glass">
              <summary>{f.question}</summary>
              <p>{f.answer}</p>
            </details>
          ))}
        </section>
      )}

      <Reveal className="actions rs-actions">
        <Link to="/lab" className="btn">See the lab</Link>
        <Link to="/check" className="btn btn-quiet">Retake the check</Link>
      </Reveal>
      <ToolsDrawer tutor={toolsFor} onClose={() => setToolsFor(null)} />
    </div>
  )
}

// Each card reveals on its own as it scrolls in. Cards already on screen when the page opens wait
// for the radar shape, then cascade. Inside a card: bars grow, numbers settle, and a safety warning
// arrives last with one soft highlight.
function RankCard({ t, i, onTools }) {
  const reduced = useReduced()
  const body = useRef(null)
  const [delay, setDelay] = useState(0)
  const inView = useInView(body, { once: true, margin: revealTokens().margin })

  useLayoutEffect(() => {
    const top = body.current?.getBoundingClientRect().top ?? Infinity
    if (top < window.innerHeight) setDelay(tokenS('--delay-cards-first', 0.7) + i * tokenS('--stagger-card', 0.06))
  }, [i])

  const barsAt = delay + spring('reveal').visualDuration * 0.15
  const warnAt = barsAt + 2 * tokenS('--stagger-bar', 0.05) + spring('bar').visualDuration * 0.7
  const warn = t.safety_warning
  const sign = t.predicted_gain < 0 ? '−' : '+'
  const gain = Math.abs(t.predicted_gain)

  return (
    <Reveal as="li" blur={false} delay={delay} className={`rs-card glass ${warn ? 'has-warning' : ''} ${i === 0 ? 'is-first' : ''}`}>
      <span className="rs-rank" aria-hidden="true">{t.rank ?? i + 1}</span>
      <div className="rs-card-main" ref={body}>
        <div className="rs-card-head">
          <div className="rs-card-title">
            <h3>{t.tutor_name}</h3>
            <p className="rs-why">{t.why}</p>
          </div>
          <p className="rs-gain">
            <span className="sr-only">Predicted gain {sign}{gain.toFixed(1)} out of 10 for students like you</span>
            <span className="rs-gain-num" aria-hidden="true">{sign}<Settle value={gain} play={inView} delay={barsAt} /></span>
            <span className="rs-gain-label" aria-hidden="true">predicted gain out of 10</span>
          </p>
        </div>
        {warn && <Warning text={warn} play={inView} delay={warnAt} reduced={reduced} />}
        <ScoreBars scores={t.scores} grow play={inView} explain delay={barsAt} />
        <p className="rs-tools">
          <button type="button" className="btn btn-small" aria-haspopup="dialog" onClick={() => onTools(t)}>
            <Icon name="list" size={16} /> See tools like this
          </button>
        </p>
      </div>
    </Reveal>
  )
}

function Warning({ text, play, delay, reduced }) {
  const motionProps = reduced ? { initial: false } : {
    initial: { opacity: 0 },
    animate: play ? { opacity: 1 } : undefined,
    transition: spring('ui', { delay }),
  }
  return (
    <motion.p className="rs-warning" role="note" {...motionProps}>
      <Icon name="flag" size={18} className="rs-flag-ico" />
      <span><strong>Safety flag.</strong> {text}</span>
    </motion.p>
  )
}

// A number that counts up on the bar spring and settles on the exact value.
function Settle({ value, play, delay }) {
  const reduced = useReduced()
  const mv = useMotionValue(reduced ? value : 0)
  const text = useTransform(mv, (v) => Math.min(v, value).toFixed(1))
  useEffect(() => {
    if (reduced) { mv.set(value); return }
    if (!play) return
    const run = animate(mv, value, spring('bar', { delay }))
    return () => run.stop()
  }, [play, reduced, value, delay, mv])
  return <motion.span>{text}</motion.span>
}
