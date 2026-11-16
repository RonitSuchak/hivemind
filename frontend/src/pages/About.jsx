import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { usePageTitle } from '../hooks.js'
import Reveal from '../components/Reveal.jsx'
import Icon from '../components/Icon.jsx'
import MatchDiagram from '../components/MatchDiagram.jsx'
import '../styles/lab.css'

const SECTIONS = [
  ['method', 'The method'],
  ['scores', 'What we check'],
  ['match', 'How the match works'],
  ['limits', 'Limits'],
  ['ethics', 'Ethics'],
]

// Highlights the section being read in the side contents (wide screens only): the last section
// whose top has passed 35% of the viewport, or the first one at the top of the page.
function useCurrentSection(ids) {
  const [cur, setCur] = useState(ids[0])
  useEffect(() => {
    let raf = 0
    const measure = () => {
      raf = 0
      let found = ids[0]
      for (const id of ids) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top < window.innerHeight * 0.35) found = id
      }
      setCur(found)
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(measure) }
    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf) }
  }, [ids])
  return cur
}

const IDS = SECTIONS.map(([id]) => id)

export default function About() {
  usePageTitle('About')
  const { hash } = useLocation()
  const cur = useCurrentSection(IDS)
  useEffect(() => {
    if (!hash) return
    const el = document.getElementById(hash.slice(1))
    if (el) requestAnimationFrame(() => el.scrollIntoView({ block: 'start' }))
  }, [hash])

  return (
    <article className="lx-about">
      <Reveal as="header" className="lx-about-head">
        <h1>About Hivemind</h1>
        <p className="lede">Hivemind shows who an EdTech tool works for, who it fails and whether it is safe.</p>
      </Reveal>

      <div className="lx-about-body">
        <nav className="lx-toc" aria-label="On this page">
          <ol>
            {SECTIONS.map(([id, label]) => (
              <li key={id}><a href={`#${id}`} aria-current={cur === id ? 'true' : undefined}>{label}</a></li>
            ))}
          </ol>
        </nav>

        <div className="lx-article">
          <Reveal as="section" id="method" className="lx-about-sec" aria-labelledby="method-h">
            <h2 id="method-h">The method</h2>
            <p>Testing every real product takes time and money. So the lab tests five <strong>tool types</strong>. Each one stands for real EdTech tools that teach the same way. Real products are <strong>not tested yet</strong>.</p>
            <p>We teach a <strong>simulated class of 30</strong> with each tool type. They sit a <strong>test</strong>, have a <strong>lesson</strong>, then sit the <strong>test again</strong>.</p>
            <p>A <strong>knowledge model</strong> decides what each student learns. A good hint helps. Being handed the answer does not.</p>
          </Reveal>

          <Reveal as="section" id="scores" className="lx-about-sec" aria-labelledby="scores-h">
            <h2 id="scores-h">What we check</h2>
            <dl className="lx-trio lx-trio-short">
              <div>
                <dt><span className="icon-chip"><Icon name="shield" size={20} /></span>Safe</dt>
                <dd>
                  <ul className="lx-risks">
                    <li><Icon name="check" size={15} /><span><strong>Accurate</strong> facts are right</span></li>
                    <li><Icon name="check" size={15} /><span><strong>Fair</strong> works for every group</span></li>
                    <li><Icon name="check" size={15} /><span><strong>Private</strong> your details stay yours</span></li>
                    <li><Icon name="check" size={15} /><span><strong>Suitable</strong> right for your age</span></li>
                  </ul>
                </dd>
              </div>
              <div>
                <dt><span className="icon-chip"><Icon name="pointer" size={20} /></span>Easy to use</dt>
                <dd>Students can <strong>follow it</strong> and <strong>keep going</strong>.</dd>
              </div>
              <div>
                <dt><span className="icon-chip"><Icon name="cap" size={20} /></span>Helps you learn</dt>
                <dd>Students <strong>improve</strong> and are made to <strong>think</strong>.</dd>
              </div>
            </dl>
            <p className="lx-rule"><Icon name="shield" size={18} /><span>Each one gets its <strong>own score</strong>. The four safety checks cover misinformation, bias, privacy and inappropriate content. A tool type that fails one is <strong>ranked last</strong>.</span></p>
          </Reveal>

          <Reveal as="section" id="match" className="lx-about-sec" aria-labelledby="match-h">
            <h2 id="match-h">How the match works</h2>
            <p>Your answers become a <strong>profile</strong>. We find the <strong>closest simulated students</strong> and rank tools by what worked for them.</p>
            <MatchDiagram />
          </Reveal>

          {/* The glass callout is its own Reveal (no blur): glass inside a fading parent loses its frost. */}
          <section id="limits" className="lx-about-sec" aria-labelledby="limits-h">
            <Reveal><h2 id="limits-h">Limits</h2></Reveal>
            <Reveal blur={false} className="glass lx-callout">
              <ul>
                <li><Icon name="warn" size={18} /><span>Safety checks are simple rules that can miss things or flag wrongly. A person reviews every failed check.</span></li>
                <li><Icon name="warn" size={18} /><span>6 safety moments are a screening test. A tool type that passes has not been proven safe.</span></li>
              </ul>
            </Reveal>
            <Reveal as="ul" className="lx-list">
              <li>The students are simulated and do not behave like real children.</li>
              <li>Results are early: five tool types, one topic, one short lesson.</li>
              <li>The match is a starting point based on similar simulated students. It does not judge you.</li>
            </Reveal>
          </section>

          <Reveal as="section" id="ethics" className="lx-about-sec" aria-labelledby="ethics-h">
            <h2 id="ethics-h">Ethics</h2>
            <ul className="lx-points">
              <li><Icon name="lock" size={18} /><span>The check asks for no name or email. Answers are used once to find your match and are not saved.</span></li>
              <li><Icon name="shield" size={18} /><span>You are never labelled. Results talk about students like you.</span></li>
              <li><Icon name="target" size={18} /><span>We match on a learning profile. We ignore the idea of fixed styles of learning, which research does not support.</span></li>
              <li><Icon name="users" size={18} /><span>Every page that shows simulated students says they are not real children.</span></li>
              <li><Icon name="chat" size={18} /><span>Every failed safety check shows the tool&rsquo;s exact words.</span></li>
            </ul>
          </Reveal>

          <Reveal as="section" className="lx-about-cta" aria-labelledby="cta-h">
            <h2 id="cta-h">Try it</h2>
            <p className="actions">
              <Link to="/check" className="btn btn-primary">Take the check <Icon name="arrow" size={16} className="icon-nudge" /></Link>
              <Link to="/lab" className="btn">See the lab</Link>
            </p>
          </Reveal>
        </div>
      </div>
    </article>
  )
}
