import { useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useSpring } from 'motion/react'
import Icon from '../components/Icon.jsx'
import Film from '../at/Film.jsx'
import LanguagePicker from '../components/LanguagePicker.jsx'
import ClassDots from '../components/ClassDots.jsx'
import { Reveal, RevealGroup } from '../components/Reveal.jsx'
import { usePageTitle } from '../hooks.js'
import { SCORE_ICON } from '../labels.js'
import { revealTokens, spring, tokenS, useReduced } from '../motion.js'
import { useNoTranslate, useT } from '../i18n/index.js'

// Home is a short scrolling story: hero -> how it works -> the class -> what we check -> start.
// The class grid shows the lab's 30 simulated students by name when the lab answers (components/ClassDots.jsx).
export default function Home() {
  usePageTitle('')
  const noTr = useNoTranslate() // our own dictionary words: keep the browser translator off them
  return (
    <div className="home" {...noTr}>
      <Film />{/* hero, how it works, the class, what we check: one scroll-scrubbed film (at/Film.jsx) */}
      <Languages />
      <Who />
      <TheClass />
      <Finale />
    </div>
  )
}

// Headline lines rise and unblur one after another. They are on screen at load, so the whole
// entrance is short: the last line starts after ~3 x --stagger-line.
function Hero() {
  const t = useT()
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
        <HeroLine v={v} reduced={reduced} i={0}>{t('hero.line1')}</HeroLine>{' '}
        <HeroLine v={v} reduced={reduced} i={1} className="hero-accent">{t('hero.line2')}</HeroLine>
      </h1>
      <HeroLine v={v} reduced={reduced} i={2} as="p" className="lede">
        {t('hero.lede')}
      </HeroLine>
      <HeroLine v={v} reduced={reduced} i={3} as="div" className="actions">
        <Link to="/check" className="btn btn-primary btn-large">{t('cta.check')} <Icon name="arrow" size={18} className="icon-nudge" /></Link>
        <Link to="/lab" className="btn btn-large">{t('cta.lab')}</Link>
      </HeroLine>
    </section>
  )
}

function HeroLine({ i, as = 'span', className = '', v, reduced, children }) {
  if (reduced) { const Tag = as; return <Tag className={`hero-line ${className}`}>{children}</Tag> }
  const M = motion[as]
  return <M className={`hero-line ${className}`} custom={i} variants={v} initial="hidden" animate="shown">{children}</M>
}

const STEPS = ['how.1', 'how.2', 'how.3'] // dictionary keys: how.N.title and how.N.text

const STEP_ICONS = ['pencil', 'users', 'list'] // check, class, ranked list

// Three steps reveal as you scroll; a rail beside them fills with the scroll (springs smooth it).
function HowItWorks() {
  const t = useT()
  const reduced = useReduced()
  const list = useRef(null)
  const { scrollYProgress } = useScroll({ target: list, offset: ['start 75%', 'end 55%'] })
  const fill = useSpring(scrollYProgress, spring('ui'))
  return (
    <section className="home-section how" aria-labelledby="how-h">
      <Reveal className="how-head">
        <h2 id="how-h" className="section-title">{t('how.title')}</h2>
        <p className="section-lede">{t('how.lede')}</p>
      </Reveal>
      <div className="how-steps" ref={list}>
        <span className="how-rail" aria-hidden="true">
          <motion.span className="how-rail-fill" style={{ scaleY: reduced ? 1 : fill }} />
        </span>
        <ol className="how-list">
          {STEPS.map((k, i) => (
            <Reveal as="li" key={k} className="how-step">
              <span className="how-num" aria-hidden="true"><Icon name={STEP_ICONS[i]} size={15} /></span>
              <h3>{t(`${k}.title`)}</h3>
              <p>{t(`${k}.text`)}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}

// Decorative class: empty seats fill from the centre outwards when the grid scrolls into view.
function TheClass() {
  const t = useT()
  return (
    <section className="home-section klass" aria-labelledby="class-h">
      <Reveal className="klass-text">
        <h2 id="class-h" className="section-title">{t('class.meet')}</h2>
        <p className="section-lede">{t('class.hint')}</p>
      </Reveal>{/* the film's class card above already says what the class is, so this only invites a click */}
      <Reveal className="klass-panel glass" blur={false}>
        <ClassDots />
      </Reveal>
    </section>
  )
}

// Who it is for: students first (the check), then schools (the ratings and the method) and tool makers (a report).
const WHO = [
  { k: 'student', icon: 'target', to: '/check' },
  { k: 'school', icon: 'users', to: '/lab/ratings', more: '/about#method' },
  { k: 'maker', icon: 'chart', to: '/lab/report' },
]
function Who() {
  const t = useT()
  return (
    <section className="home-section who" aria-labelledby="who-h">
      <Reveal>
        <h2 id="who-h" className="section-title">{t('who.title')}</h2>
        <p className="section-lede">{t('who.lede')}</p>
      </Reveal>
      <RevealGroup as="ul" className="who-grid">
        {WHO.map((w) => (
          <Reveal as="li" key={w.k} blur={false} className="who-card glass">
            <span className="icon-chip"><Icon name={w.icon} size={20} /></span>
            <h3>{t(`who.${w.k}.title`)}</h3>
            <p>{t(`who.${w.k}.text`)}</p>
            <p className="who-links">
              <Link to={w.to} className="who-link">{t(`who.${w.k}.cta`)} <Icon name="arrow" size={15} className="icon-nudge" /></Link>
              {w.more && <Link to={w.more} className="who-link who-link-quiet">{t(`who.${w.k}.more`)}</Link>}
            </p>
          </Reveal>
        ))}
      </RevealGroup>
    </section>
  )
}

// What we check, in plain words. Tool types get two scores (easy to use, helps you learn); safety is checked
// only for specific EdTech tools, so it comes last and its text says so. (Not on the page now: the film shows these.)
// (bold words are marked **like this** inside each language's own sentence, so word order can differ)
const CHECKS = [
  { k: 'usability', key: 'checks.easy' },
  { k: 'learning', key: 'checks.learn' },
  { k: 'safety', key: 'checks.safe' },
]
function Scores() {
  const t = useT()
  return (
    <section className="home-section scores" aria-labelledby="scores-h">
      <Reveal>
        <h2 id="scores-h" className="section-title">{t('checks.title')}</h2>
      </Reveal>
      <RevealGroup as="dl" className="score-trio">
        {CHECKS.map((c) => (
          <Reveal key={c.k} className="score-def">
            <dt><span className="icon-chip"><Icon name={SCORE_ICON[c.k]} size={20} /></span>{t(`${c.key}.title`)}</dt>
            <dd>{t.rich(`${c.key}.text`)}</dd>
          </Reveal>
        ))}
      </RevealGroup>
      <Reveal as="p" className="scores-note">
        <Icon name="info" size={20} />
        <span>{t.rich('checks.note')}</span>
      </Reveal>
    </section>
  )
}

// Languages: asked on the landing page so the site starts from the student, in any language they speak.
function Languages() {
  const t = useT()
  return (
    <section className="home-section langs" aria-labelledby="langs-h">
      <Reveal className="langs-head">
        <h2 id="langs-h" className="section-title">{t('langs.title')}</h2>
        <p className="section-lede">{t('langs.lede')}</p>
      </Reveal>
      <Reveal><LanguagePicker /></Reveal>
    </section>
  )
}

function Finale() {
  const t = useT()
  return (
    <section className="home-section finale" aria-labelledby="finale-h">
      <Reveal>
        <h2 id="finale-h" className="finale-title">{t('finale.title')}</h2>
      </Reveal>
      <Reveal className="actions" delay={revealTokens().stagger}>
        <Link to="/check" className="btn btn-primary btn-large">{t('cta.check')} <Icon name="arrow" size={18} className="icon-nudge" /></Link>
        <Link to="/about" className="btn btn-large btn-quiet">{t('cta.method')}</Link>
      </Reveal>
    </section>
  )
}
