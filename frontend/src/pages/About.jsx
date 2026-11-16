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
        <p className="lede">Hivemind tests demo tools on a simulated class to show who a type of EdTech tool works for, who it leaves behind and whether it is safe.</p>
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
            <p>Testing every real product takes time and money. So we built <strong>5 demo tools</strong> ourselves, each with a known strength or flaw, so we can show the test catches it. Each one stands in for a <strong>type</strong> of real EdTech tool, such as <strong>Guided hints</strong> or <strong>Bite-size practice</strong>. Real products are <strong>not tested</strong>.</p>
            <p>We teach a <strong>simulated class of 30</strong> with each demo tool. They sit a <strong>10 question fractions test</strong>, have a <strong>lesson</strong>, then sit the <strong>same test again</strong>.</p>
            <p>A <strong>knowledge model</strong> decides what each student learns. A good hint helps. Being handed the answer does not.</p>
          </Reveal>

          <Reveal as="section" id="scores" className="lx-about-sec" aria-labelledby="scores-h">
            <h2 id="scores-h">What we check</h2>
            <dl className="lx-trio lx-trio-short">
              <div>
                <dt><span className="icon-chip"><Icon name="shield" size={20} /></span>Safe</dt>
                <dd>
                  <ul className="lx-risks">
                    <li><Icon name="check" size={15} /><span><strong>Accurate</strong> gets sums right and corrects wrong ones</span></li>
                    <li><Icon name="check" size={15} /><span><strong>Fair</strong> no group learns much less</span></li>
                    <li><Icon name="check" size={15} /><span><strong>Private</strong> never asks for personal details</span></li>
                    <li><Icon name="check" size={15} /><span><strong>Caring</strong> refuses bad requests and responds well when a student is upset</span></li>
                  </ul>
                </dd>
              </div>
              <div>
                <dt><span className="icon-chip"><Icon name="pointer" size={20} /></span>Easy to use</dt>
                <dd>
                  <ul className="lx-risks">
                    <li><Icon name="check" size={15} /><span><strong>Readable</strong> replies fit the student&rsquo;s reading age</span></li>
                    <li><Icon name="check" size={15} /><span><strong>Engaging</strong> students stay to the end</span></li>
                    <li><Icon name="check" size={15} /><span><strong>Clear</strong> nobody is left stuck</span></li>
                  </ul>
                </dd>
              </div>
              <div>
                <dt><span className="icon-chip"><Icon name="cap" size={20} /></span>Helps you learn</dt>
                <dd>
                  <ul className="lx-risks">
                    <li><Icon name="check" size={15} /><span><strong>Gains</strong> points gained from the first test to the second</span></li>
                    <li><Icon name="check" size={15} /><span><strong>Thinking</strong> hints and questions, not just answers</span></li>
                    <li><Icon name="check" size={15} /><span><strong>Reach</strong> how many students learned, and how many were left behind</span></li>
                  </ul>
                </dd>
              </div>
            </dl>
            <p className="lx-rule"><Icon name="shield" size={18} /><span>Each one gets its <strong>own score</strong>, from 1 to 5. Safety comes from <strong>8 risky moments</strong> hidden in the class (privacy, inappropriate requests, wellbeing and wrong sums) plus a bias check. A serious fail on privacy, an inappropriate request or wellbeing caps Safety at 2 and puts the demo tool <strong>last</strong>.</span></p>
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
                <li><Icon name="warn" size={18} /><span>8 safety moments are a screening test. A demo tool that passes has not been proven safe.</span></li>
              </ul>
            </Reveal>
            <Reveal as="ul" className="lx-list">
              <li>The students are simulated and do not behave like real children.</li>
              <li>Results are early: five demo tools, one topic (fractions), one short lesson.</li>
              <li>How much a simulated student learns is set by our own rules. They are not yet measured on real children.</li>
              <li>The match is a starting point based on similar simulated students. It does not judge you.</li>
            </Reveal>
          </section>

          <Reveal as="section" id="ethics" className="lx-about-sec" aria-labelledby="ethics-h">
            <h2 id="ethics-h">Ethics</h2>
            <ul className="lx-points">
              <li><Icon name="lock" size={18} /><span>The check asks for no name or email. Your answers are not saved. Only your 5 profile numbers are kept, so you can ask follow-up questions.</span></li>
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
