import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getRun, getTutors, getValidation } from '../api.js'
import { useLoad, usePageTitle } from '../hooks.js'
import Reveal from '../components/Reveal.jsx'
import Icon from '../components/Icon.jsx'
import MatchDiagram from '../components/MatchDiagram.jsx'
import AboutFilm from '../at/AboutFilm.jsx'
import SuggestBox from '../components/SuggestBox.jsx'
import '../styles/lab.css'

const SECTIONS = [
  ['method', 'The method'],
  ['scores', 'What we check'],
  ['formula', 'How a score is made'],
  ['match', 'How the match works'],
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

// The counts this page states come from the lab's own data, so they cannot drift from the Lab pages:
// how many demo tools and how many simulated students.
async function loadFacts() {
  const tutors = await getTutors()
  const own = tutors.filter((t) => t.kind === 'built_in')
  const run = await getRun((own[0] || tutors[0]).tutor_id)
  return {
    tools: own.length,
    students: run.results.length,
    real: await getValidation().then((v) => v?.summary?.count ?? null).catch(() => null),
  }
}

export default function About() {
  usePageTitle('About')
  const { hash } = useLocation()
  const cur = useCurrentSection(IDS)
  const load = useLoad(loadFacts, [])
  const facts = load.status === 'ok' ? load.data : {}
  useEffect(() => {
    if (!hash) return
    const el = document.getElementById(hash.slice(1))
    if (el) requestAnimationFrame(() => el.scrollIntoView({ block: 'start' }))
  }, [hash])

  return (
    <article className="lx-about">
      <Reveal as="header" className="lx-about-head">
        <h1>About Hivemind</h1>
        <p className="lede">Hivemind tests demo tools on a simulated class to show who each type of EdTech tool works for and who it leaves behind.</p>
      </Reveal>

      <AboutFilm facts={facts} />

      <h2 className="af-divider">The full detail</h2>

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
            <p>Testing every real product takes time and money, so we built <strong>{facts.tools ?? 4} demo tools</strong> ourselves.</p>
            <ul className="lx-list">
              <li>Each has a <strong>known strength or flaw</strong>, so we can show the test catches it.</li>
              <li>Each stands in for a <strong>type</strong> of real EdTech tool, such as <strong>Guided hints</strong> or <strong>Bite-size practice</strong>.</li>
              <li>Real products are <strong>not in these class tests</strong>. A few have had a small <Link to="/lab/real-tools">pilot</Link> with 8 simulated students each.</li>
            </ul>
            <p><strong>What counts as teaching.</strong> A tool <strong>teaches</strong> if it explains an idea, or gives you practice and tells you how you did. <strong>Study helpers</strong> only draw a graph, work out an answer or tidy your writing, so we list them but never rank or recommend them.</p>
            <p>We teach a <strong>simulated class of {facts.students ?? 30}</strong> with each demo tool. They sit a <strong>10 question fractions test</strong>, have a <strong>lesson</strong>, then sit the <strong>same test again</strong>.</p>
            <p>A <strong>knowledge model</strong> decides what each student learns. It uses open maths and no AI. In this model a good hint helps, but being handed the answer does not. AI only writes the words the demo tools and students say.</p>
            {facts.real > 0 && <p><strong>Checked against real students.</strong> A real student can sit the same test before and after a lesson, and we show their real gain beside our prediction on the <Link to="/lab/proof">Proof</Link> page. So far {facts.real} real {facts.real === 1 ? 'student has' : 'students have'} taken part.</p>}
            <p><strong>How it scales.</strong> A whole class runs with no real child involved. A product with its own chat address can be tested automatically; others are relayed by hand, as in the pilot.</p>
          </Reveal>

          <Reveal as="section" id="scores" className="lx-about-sec" aria-labelledby="scores-h">
            <h2 id="scores-h">What we check</h2>
            <dl className="lx-trio lx-trio-short">
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
                    <li><Icon name="check" size={15} /><span><strong>Thinking</strong> replies that are hints or questions</span></li>
                    <li><Icon name="check" size={15} /><span><strong>Reach</strong> how many students learned, and how many were left behind</span></li>
                  </ul>
                </dd>
              </div>
            </dl>
            <p>Each one gets its <strong>own score</strong>, from 1 to 5.</p>
            <p><strong>Types of tool get no safety score</strong>, because safety is checked only for specific EdTech tools, as in the <Link to="/lab/real-tools">real-tool pilot</Link>.</p>
          </Reveal>

          <Reveal as="section" id="formula" className="lx-about-sec" aria-labelledby="formula-h">
            <h2 id="formula-h">How a score is made</h2>
            <p>Each score runs from <strong>1 to 5</strong>, and the same rules apply to every tool.</p>
            <ul className="lx-points">
              <li><Icon name="pointer" size={18} /><span><strong>Usability</strong> is 50% reading, which is how many replies fit each student&rsquo;s reading age. The other 50% is how many students kept going (30%) and how many never got stuck (20%).</span></li>
              <li><Icon name="cap" size={18} /><span><strong>Learning</strong> is 70% the average test gain, where 3 points or more counts as full, and 30% the share of replies that were questions or hints.</span></li>
            </ul>
          </Reveal>

          <Reveal as="section" id="match" className="lx-about-sec" aria-labelledby="match-h">
            <h2 id="match-h">How the match works</h2>
            <p>Your answers become a <strong>profile</strong>. We find the <strong>closest simulated students</strong> and rank tools by what worked for them.</p>
            <MatchDiagram />
          </Reveal>

          <Reveal as="section" id="ethics" className="lx-about-sec" aria-labelledby="ethics-h">
            <h2 id="ethics-h">Ethics</h2>
            <ul className="lx-points">
              <li><Icon name="lock" size={18} /><span>The check never asks for your name or email, and it keeps only your 5 profile numbers so that you can ask follow-up questions.</span></li>
              <li><Icon name="shield" size={18} /><span>Results describe students like you and never put a label on you.</span></li>
              <li><Icon name="target" size={18} /><span>We match on a learning profile and ignore fixed learning styles, which research does not support.</span></li>
              <li><Icon name="users" size={18} /><span>Every page that shows simulated students says they are not real children.</span></li>
              <li><Icon name="chat" size={18} /><span>Every failed safety check on a specific tool shows the tool&rsquo;s exact words.</span></li>
            </ul>
          </Reveal>

          <Reveal blur={false}><SuggestBox /></Reveal>

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
