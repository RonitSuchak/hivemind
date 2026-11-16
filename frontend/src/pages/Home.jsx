import { useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useSpring } from 'motion/react'
import Icon from '../components/Icon.jsx'
import HeroHive from '../components/HeroHive.jsx'
import LanguagePicker from '../components/LanguagePicker.jsx'
import { Reveal, RevealGroup } from '../components/Reveal.jsx'
import { usePageTitle } from '../hooks.js'
import { SCORE_ICON } from '../labels.js'
import { revealTokens, spring, tokenS, useReduced } from '../motion.js'

// Home is a short scrolling story: hero -> how it works -> the class -> three scores -> start.
// Nothing here is data: the class grid is decorative in every mode (no numbers, no names).
export default function Home() {
  usePageTitle('')
  return (
    <div className="home">
      <Hero />
      <Languages />
      <HowItWorks />
      <TheClass />
      <Scores />
      <Finale />
    </div>
  )
}

// Headline lines rise and unblur one after another. They are on screen at load, so the whole
// entrance is short: the last line starts after ~3 x --stagger-line.
function Hero() {
  const reduced = useReduced()
  const v = useMemo(() => {
    const t = revealTokens(), step = tokenS('--stagger-line', 0.07)
    return {
      hidden: { opacity: 0, y: t.rise * 1.5, filter: `blur(${t.blur}px)` },
      shown: (i) => ({ opacity: 1, y: 0, filter: 'blur(0px)', transitionEnd: { filter: 'none' }, transition: spring('reveal', { delay: i * step }) }),
    }
  }, [])
  return (
    <section className="hero" aria-labelledby="hero-h">
      <h1 id="hero-h">
        <HeroLine v={v} reduced={reduced} i={0}>Meet Hivemind, the #1 tool to</HeroLine>{' '}
        <HeroLine v={v} reduced={reduced} i={1} className="hero-accent">find the EdTech tool that works for you.</HeroLine>
      </h1>
      <HeroLine v={v} reduced={reduced} i={2} as="p" className="lede">
        We test types of EdTech tool on a simulated class. You get a ranked list of the tool types that worked for students like you.
      </HeroLine>
      <HeroLine v={v} reduced={reduced} i={3} as="div" className="actions">
        <Link to="/check" className="btn btn-primary btn-large">Take the check <Icon name="arrow" size={18} className="icon-nudge" /></Link>
        <Link to="/lab" className="btn btn-large">See the lab</Link>
      </HeroLine>
      <div className="hero-art"><HeroHive /></div>
    </section>
  )
}

function HeroLine({ i, as = 'span', className = '', v, reduced, children }) {
  if (reduced) { const Tag = as; return <Tag className={`hero-line ${className}`}>{children}</Tag> }
  const M = motion[as]
  return <M className={`hero-line ${className}`} custom={i} variants={v} initial="hidden" animate="shown">{children}</M>
}

const STEPS = [
  ['Take a short check', 'A few fraction questions, a short lesson and a reading question. Skip any you like. Nothing is saved.'],
  ['Meet students like you', 'We compare your profile with a simulated class. The closest students show which tool types worked for them.'],
  ['See who each tool type works for', 'Each tool type gets three separate scores: safety, usability and learning. A serious safety failure is never averaged away.'],
]

const STEP_ICONS = ['pencil', 'users', 'list'] // check, class, ranked list

// Three steps reveal as you scroll; a rail beside them fills with the scroll (springs smooth it).
function HowItWorks() {
  const reduced = useReduced()
  const list = useRef(null)
  const { scrollYProgress } = useScroll({ target: list, offset: ['start 75%', 'end 55%'] })
  const fill = useSpring(scrollYProgress, spring('ui'))
  return (
    <section className="home-section how" aria-labelledby="how-h">
      <Reveal className="how-head">
        <h2 id="how-h" className="section-title">How it works</h2>
        <p className="section-lede">Take a short check, get a ranked list. Nothing about you is kept.</p>
      </Reveal>
      <div className="how-steps" ref={list}>
        <span className="how-rail" aria-hidden="true">
          <motion.span className="how-rail-fill" style={{ scaleY: reduced ? 1 : fill }} />
        </span>
        <ol className="how-list">
          {STEPS.map(([title, text], i) => (
            <Reveal as="li" key={title} className="how-step">
              <span className="how-num" aria-hidden="true"><Icon name={STEP_ICONS[i]} size={15} /></span>
              <h3>{title}</h3>
              <p>{text}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}

// Decorative class: empty seats fill from the centre outwards when the grid scrolls into view.
const COLS = 10, ROWS = 3
const SEATS = Array.from({ length: COLS * ROWS }, (_, k) => {
  const c = k % COLS, r = Math.floor(k / COLS)
  return { k, d: Math.hypot(c - (COLS - 1) / 2, (r - (ROWS - 1) / 2) * 1.6) }
})

function TheClass() {
  const reduced = useReduced()
  const v = useMemo(() => {
    const step = tokenS('--ripple-stagger', 0.11)
    return {
      empty: { scale: 0.4, opacity: 0 },
      full: (d) => ({ scale: 1, opacity: 1, transition: spring('ui', { delay: d * step }) }),
    }
  }, [])
  return (
    <section className="home-section klass" aria-labelledby="class-h">
      <Reveal className="klass-text">
        <h2 id="class-h" className="section-title">One class. Every tool type.</h2>
        <p className="section-lede">Every tool type teaches the same class, so differences come from the teaching. Students vary in starting level, learning speed, reading age, English level and persistence.</p>
        <p className="muted small">The students are simulated, not real children.</p>
      </Reveal>
      <Reveal className="klass-panel glass" blur={false}>
        <motion.div className="seats" aria-hidden="true" initial={reduced ? false : 'empty'} whileInView="full" viewport={{ once: true, margin: revealTokens().margin }}>
          {SEATS.map((s) => (
            <span key={s.k} className="seat">
              <motion.span className="seat-fill" custom={s.d} variants={reduced ? undefined : v} />
            </span>
          ))}
        </motion.div>
      </Reveal>
    </section>
  )
}

// What we check, in positive, plain words (the three scores are never blended into one number).
const CHECKS = [
  { k: 'safety', title: 'Safe', text: <>It is <strong>accurate</strong>, <strong>fair</strong>, <strong>private</strong> and right for your age.</> },
  { k: 'usability', title: 'Easy to use', text: <>You can <strong>follow it</strong> and <strong>keep going</strong>.</> },
  { k: 'learning', title: 'Helps you learn', text: <>You <strong>improve</strong>, and it makes you <strong>think</strong>.</> },
]
function Scores() {
  return (
    <section className="home-section scores" aria-labelledby="scores-h">
      <Reveal>
        <h2 id="scores-h" className="section-title">We check three things.</h2>
      </Reveal>
      <RevealGroup as="dl" className="score-trio">
        {CHECKS.map((c) => (
          <Reveal key={c.k} className="score-def">
            <dt><span className="icon-chip"><Icon name={SCORE_ICON[c.k]} size={20} /></span>{c.title}</dt>
            <dd>{c.text}</dd>
          </Reveal>
        ))}
      </RevealGroup>
      <Reveal as="p" className="scores-note">
        <Icon name="shield" size={20} />
        <span>Each one gets its <strong>own score</strong>. A tool type that fails a safety check is <strong>ranked last</strong>.</span>
      </Reveal>
    </section>
  )
}

// Languages: asked on the landing page so the site starts from the student, in any language they speak.
function Languages() {
  return (
    <section className="home-section langs" aria-labelledby="langs-h">
      <Reveal className="langs-head">
        <h2 id="langs-h" className="section-title">Which languages do you speak?</h2>
        <p className="section-lede">Pick every language you use. The site switches to the one you pick.</p>
      </Reveal>
      <Reveal><LanguagePicker /></Reveal>
    </section>
  )
}

function Finale() {
  return (
    <section className="home-section finale" aria-labelledby="finale-h">
      <Reveal>
        <h2 id="finale-h" className="finale-title">See which tool types worked for students like you.</h2>
      </Reveal>
      <Reveal className="actions" delay={revealTokens().stagger}>
        <Link to="/check" className="btn btn-primary btn-large">Take the check <Icon name="arrow" size={18} className="icon-nudge" /></Link>
        <Link to="/about" className="btn btn-large btn-quiet">Read the method</Link>
      </Reveal>
    </section>
  )
}
