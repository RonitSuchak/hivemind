import { useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useSpring } from 'motion/react'
import Icon from '../components/Icon.jsx'
import HeroHive from '../components/HeroHive.jsx'
import LanguagePicker from '../components/LanguagePicker.jsx'
import ClassDots from '../components/ClassDots.jsx'
import { Reveal, RevealGroup } from '../components/Reveal.jsx'
import { usePageTitle } from '../hooks.js'
import { SCORE_ICON } from '../labels.js'
import { revealTokens, spring, tokenS, useReduced } from '../motion.js'
import { useNoTranslate, useT } from '../i18n/index.js'

// Home is a short scrolling story: hero -> how it works -> the class -> three scores -> start.
// The class grid shows the lab's 30 simulated students by name when the lab answers (components/ClassDots.jsx).
export default function Home() {
  usePageTitle('')
  const noTr = useNoTranslate() // our own dictionary words: keep the browser translator off them
  return (
    <div className="home" {...noTr}>
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
      <div className="hero-art"><HeroHive /></div>
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
        <h2 id="class-h" className="section-title">{t('class.title')}</h2>
        <p className="section-lede">{t('class.lede')}</p>
        <p className="muted small">{t('class.note')}</p>
      </Reveal>
      <Reveal className="klass-panel glass" blur={false}>
        <ClassDots />
      </Reveal>
    </section>
  )
}

// What we check, in positive, plain words (the three scores are never blended into one number).
// (bold words are marked **like this** inside each language's own sentence, so word order can differ)
const CHECKS = [
  { k: 'safety', key: 'checks.safe' },
  { k: 'usability', key: 'checks.easy' },
  { k: 'learning', key: 'checks.learn' },
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
        <Icon name="shield" size={20} />
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
