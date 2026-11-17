import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { animate, motion, useInView, useMotionValue, useTransform } from 'motion/react'
import { usePageTitle, useStatus } from '../hooks.js'
import { useMatch } from '../store.jsx'
import { revealTokens, spring, tokenS, useReduced } from '../motion.js'
import Reveal from '../components/Reveal.jsx'
import { heroTiming } from '../components/Radar.jsx'
import StatWheel from '../components/StatWheel.jsx'
import Drawer from '../components/Drawer.jsx'
import StudentPanel, { STAT_LABELS, wheelStats } from '../components/StudentPanel.jsx'
import { paceText, paceValue } from '../at/pace.js'
import ScoreBars from '../components/ScoreBars.jsx'
import Icon from '../components/Icon.jsx'
import ToolsDrawer from '../components/ToolsDrawer.jsx'
import BestTools, { bestNote, bestTitle, pickSites } from '../components/BestTools.jsx'
import { plainWords, typeName } from '../labels.js'
import { fitsSubject, fromBackend, teaches, toolsLike } from '../data/tools.js'
import '../styles/advisor.css'
import '../styles/lab.css'

export default function Results() {
  usePageTitle('Your results')
  const { match, pace } = useMatch()
  if (!match) {
    return (
      <div className="rs">
        <div className="rs-state glass">
          <h1>No results yet</h1>
          <p>Take the check to see which demo tools worked best for students like you.</p>
          <Link to="/check" className="btn btn-primary btn-large">Take the check <Icon name="arrow" size={18} className="icon-nudge" /></Link>
        </div>
      </div>
    )
  }
  return <Body match={match} pace={pace} />
}

// The name a card shows: the type of tool.
const cardName = (t) => typeName(t.tutor_id, t.tutor_name)
const fmtGain = (g) => `${g < 0 ? '−' : '+'}${Math.abs(g).toFixed(1)}`
const joinNames = (a) => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`)

const ordinal = (n) => (n === 1 ? 'first' : n === 2 ? 'second' : n === 3 ? 'third' : n === 4 ? 'fourth' : n === 5 ? 'fifth' : `number ${n}`)

function Body({ match, pace }) {
  const reduced = useReduced()
  // v3: each match already carries its name and radar, so no second request is needed.
  const near = match.matches || []
  const demo = useStatus() === 'demo'
  const example = match.example // set only for an example student's result
  const sample = demo || !!example // the page's own sentences say "example"
  const ranks = match.enough_matches !== false && match.ranked?.length > 0
  // No clear winner: the best demo tool is tied, or predicted to add under 1 point.
  // Display only: the lab's order and numbers are used as given.
  const list = ranks ? match.ranked : []
  const top = list[0]
  const tiedTop = top ? list.filter((x) => x.predicted_gain === top.predicted_gain) : []
  const noWinner = ranks && (!top || tiedTop.length > 1 || top.predicted_gain < 1)
  // Neighbouring items with the same gain share the rank of the first one, shown as "1=".
  const tieRanks = list.map((x, k) => {
    let a = k, b = k
    while (a > 0 && list[a - 1].predicted_gain === x.predicted_gain) a--
    while (b < list.length - 1 && list[b + 1].predicted_gain === x.predicted_gain) b++
    return b > a ? list[a].rank ?? a + 1 : null
  })
  const topic = match.topic || {} // what the student chose to work on (added by the check page, not the lab)
  // Real tools come from the lab already in order for this person (by how each demo tool type ranked).
  // The site only narrows them to the chosen subject and prefers sites with a saved screenshot: it never scores them.
  const realTools = useMemo(() => (match.real_tools || []).map(fromBackend).filter(teaches), [match.real_tools]) // study helpers are never recommended
  const first = useMemo(() => {
    const ok = realTools
    if (!ok.length) return []
    const top = ok.filter((t) => t.group === ok[0].group) // the type that ranked first for this person
    const forSubject = top.filter(fitsSubject(topic.subject || 'Maths', !!topic.advanced))
    return pickSites(forSubject.length ? forSubject : top)
  }, [realTools, topic.subject, topic.advanced])
  const t = heroTiming(0) // the wheel draws your shape only: the matched students are named below it
  // Dashed line on the wheel: the matched students' average, each counted by its share of the match (weights, scaled to add up to 1).
  const average = useMemo(() => {
    const total = near.reduce((a, m) => a + (m.weight || 0), 0)
    if (!total) return undefined
    return Object.fromEntries(STAT_LABELS.map(([k]) => [k, near.reduce((a, m) => a + (m.weight || 0) * (m.radar?.[k] ?? 0), 0) / total]))
  }, [near])
  // Pace is only the person's own, and only when it was timed. It is not part of the ranking.
  const showPace = !example && pace != null
  const wheel = [...wheelStats(match.radar), ...(showPace ? [{ key: 'pace', label: 'Pace', value: paceValue(pace), display: paceText(pace), note: 'not used in the ranking' }] : [])]
  const [openId, setOpenId] = useState(null) // the matched student whose side panel is open
  const names = useRef({}) // student id -> the name button, so focus can go back to it
  const openAt = near.findIndex((m) => m.student_id === openId)
  const closePanel = () => {
    const id = openId
    setOpenId(null)
    requestAnimationFrame(() => names.current[id]?.focus())
  }
  const [toolsFor, setToolsFor] = useState(null) // the ranked tutor whose similar tools are open
  const after = (delay) => (reduced ? { initial: false } : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: spring('ui', { delay }) })

  return (
    <div className="rs">
      <header className="rs-head">
        <h1>{example ? `Example student: ${example.title}` : demo ? 'Example result' : 'Your results'}</h1>
        {example && <p className="rs-note" role="note"><Icon name="info" size={18} /> <span>These are preset answers for an example student, not yours. The lab worked out the match just now.</span></p>}
        {demo && !example && <p className="rs-note" role="note"><Icon name="info" size={18} /> <span>This is one saved example from the lab, so it does not change with your answers.</span></p>}
        {/* Always visible: never behind a scroll reveal. */}
        <p className="rs-note"><Icon name="target" size={18} /> <span>{plainWords(match.note || '')}</span></p>
        <p className="rs-note"><Icon name="info" size={18} /> <span>The simulated class had one lesson, on fractions, so for any other subject treat these results as a starting point.</span></p>
      </header>

      <section className="rs-profile glass" aria-labelledby="profile-h">
        <div className="rs-profile-text">
          <h2 id="profile-h">{sample ? 'Example learning profile' : 'Your learning profile'}</h2>
          <p>{sample ? 'This example profile makes this shape.' : 'Your answers make this shape.'} The further out a corner is, the higher the number.</p>
        </div>
        <figure className="rs-radar rs-wheel">
          <StatWheel stats={wheel} compare={average} tone="pop" size={300} label={sample ? 'Example learning profile' : 'Your learning profile'} />
          {average && <figcaption>Dashed line: your matched students, on average.</figcaption>}
          {showPace && <figcaption>Pace is timed quietly on this device. The simulated class has no pace number yet, so it does not change the ranking.</figcaption>}
        </figure>
        <div className="rs-profile-key">
          {ranks && near.length > 0 && (
            <motion.p className="rs-matched" {...after(t.doneAt)}>
              Matched to {near.length} simulated students like you
              <span>{near.map((s, i) => (
                <Fragment key={s.student_id}>
                  {i > 0 && ', '}
                  <button type="button" className="rs-name" aria-haspopup="dialog" ref={(el) => { names.current[s.student_id] = el }} onClick={() => setOpenId(s.student_id)}>{s.name}</button>
                </Fragment>
              ))}</span>
            </motion.p>
          )}
          <p className="rs-fine">Simulated students are not real children.{ranks && near.length > 0 && ' Select a name to see their profile.'}</p>
        </div>
      </section>

      {first.length > 0 && !noWinner && (
        <Reveal as="section" className="rs-best">
          <BestTools wide headingId="best-you-h" title={match.pick_not_top ? `The first pick for ${example ? 'students like this one' : 'students like you'} is ${typeName(first[0].group)} tools` : bestTitle([first[0].group], example ? 'this' : 'you')}
            items={first.map((tool) => ({ tool, line: '' }))}
            note={`${bestNote([first[0].group])} Hivemind has not tested the sites themselves.${topic.subject ? ` Only tools for ${topic.subject} are shown.` : ''}`} />
        </Reveal>
      )}

      {match.enough_matches === false || !match.ranked?.length ? (
        <section className="rs-ranked-wrap" aria-labelledby="ranked-h">
          <h2 id="ranked-h" className="rs-h2">No ranking this time</h2>
          <p className="rs-note" role="note"><Icon name="info" size={18} /> <span>{plainWords(match.message || '') || 'None of our simulated students are close enough to your profile to give a fair answer, so we will not guess.'}</span></p>
        </section>
      ) : (
        <section className="rs-ranked-wrap" aria-labelledby="ranked-h">
          <Reveal as="h2" id="ranked-h" className="rs-h2">Types of EdTech tool, ranked for students like you</Reveal>
          {noWinner && (
            <div className="rs-note rs-nowin" role="note">
              <Icon name="info" size={18} />
              <div>
                <h3>No clear winner for students like you</h3>
                <p>{[
                  tiedTop.length > 1 ? `${joinNames(tiedTop.map(cardName))} are tied: each is predicted to add ${fmtGain(top.predicted_gain)} points out of 10.`
                    : top ? `The best demo tool here is predicted to add only ${fmtGain(top.predicted_gain)} points out of 10.` : '',
                  top && top.predicted_gain < 1 && match.radar?.start_level >= 0.7 ? 'The first quiz was already mostly right, so there was little left to gain on this topic.' : '',
                  'The two scores below still show how the demo tools differ.',
                ].filter(Boolean).join(' ')}</p>
              </div>
            </div>
          )}
          <ol className="rs-ranked">
            {match.ranked.map((tu, i) => <RankCard key={tu.tutor_id} t={tu} i={i} tie={tieRanks[i]} onTools={realTools.some((x) => x.group === tu.tutor_id) || !realTools.length && toolsLike(tu.tutor_id).length ? setToolsFor : null} />)}
          </ol>
        </section>
      )}

      {match.follow_ups?.length > 0 && (
        <section className="rs-follow" aria-labelledby="follow-h">
          <h2 id="follow-h" className="rs-h2">Questions you might have</h2>
          {match.follow_ups.filter((f) => !(f.id === 'why_top' && tiedTop.length > 1)).map((f) => (
            <details key={f.id} className="rs-fu glass">
              <summary>{f.question}</summary>
              <p>{f.answer}</p>
            </details>
          ))}
        </section>
      )}

      {!sample && match.enough_matches !== false && (
        <Reveal as="section" className="rs-proof glass" blur={false} aria-labelledby="proof-h">
          <div>
            <h2 id="proof-h" className="rs-h2">Help us check this prediction</h2>
            <p>These numbers come from simulated students. Sit a short test before and after one lesson, and we show your real gain next to what we predicted.</p>
          </div>
          <Link to="/lab/proof" className="btn">Take part <Icon name="arrow" size={16} className="icon-nudge" /></Link>
        </Reveal>
      )}

      <Reveal className="actions rs-actions">
        <Link to="/lab" className="btn">See the lab</Link>
        <Link to="/check" className="btn btn-quiet">{example ? 'Take the check yourself' : 'Retake the check'}</Link>
      </Reveal>
      <Drawer open={openAt >= 0} onClose={closePanel} title={near[openAt]?.name ?? ''}>
        {openAt >= 0 && <StudentPanel matches={near} index={openAt} onIndex={(i) => setOpenId(near[i].student_id)} ranked={match.ranked || []} tutorIds={(match.ranked || []).map((x) => x.tutor_id)} />}
      </Drawer>
      <ToolsDrawer tutor={toolsFor} tools={realTools} onClose={() => setToolsFor(null)} />
    </div>
  )
}

// Each card reveals on its own as it scrolls in. Cards already on screen when the page opens wait
// for the radar shape, then cascade. Inside a card: bars grow and numbers settle.
function RankCard({ t, i, tie, onTools }) {
  const body = useRef(null)
  const [delay, setDelay] = useState(0)
  const inView = useInView(body, { once: true, margin: revealTokens().margin })

  useLayoutEffect(() => {
    const top = body.current?.getBoundingClientRect().top ?? Infinity
    if (top < window.innerHeight) setDelay(tokenS('--delay-cards-first', 0.7) + i * tokenS('--stagger-card', 0.06))
  }, [i])

  const barsAt = delay + spring('reveal').visualDuration * 0.15
  const sign = t.predicted_gain < 0 ? '−' : '+'
  const gain = Math.abs(t.predicted_gain)

  return (
    <Reveal as="li" blur={false} delay={delay} className={`rs-card glass ${i === 0 && !tie ? 'is-first' : ''}`}>
      <span className="rs-rank" aria-hidden="true">{tie ? `${tie}=` : t.rank ?? i + 1}</span>
      {tie && <span className="sr-only">Tied for place {tie}</span>}
      <div className="rs-card-main" ref={body}>
        <div className="rs-card-head">
          <div className="rs-card-title">
            <h3>{cardName(t)}</h3>
            {t.why && <p className="rs-why">{plainWords(t.why)}</p>}
          </div>
          <p className="rs-gain">
            <span className="sr-only">Predicted gain {sign}{gain.toFixed(1)} out of 10 for students like you</span>
            <span className="rs-gain-num" aria-hidden="true">{sign}<Settle value={gain} play={inView} delay={barsAt} /></span>
            <span className="rs-gain-label" aria-hidden="true">predicted gain out of 10</span>
          </p>
        </div>
        <ScoreBars scores={t.scores} grow play={inView} explain delay={barsAt} />
        {onTools && (
          <p className="rs-tools">
            <button type="button" className="btn btn-small" aria-haspopup="dialog" onClick={() => onTools(t)}>
              <Icon name="list" size={16} /> See real tools like this
            </button>
            {t.try_url && <Link to={t.try_url} className="btn btn-small rs-try">Try this demo tool</Link>}
          </p>
        )}
      </div>
    </Reveal>
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
