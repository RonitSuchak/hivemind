import '../styles/tools.css'
import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLoad, usePageTitle } from '../hooks.js'
import { useMatch } from '../store.jsx'
import { getCheck, getRealTools } from '../api.js'
import Icon from '../components/Icon.jsx'
import ToolPreview from '../components/ToolPreview.jsx'
import ToolPanel from '../components/ToolPanel.jsx'
import { Reveal, RevealGroup } from '../components/Reveal.jsx'
import { TOOLS as LOCAL_TOOLS, GROUPS, REAL_TOOLS_NOTE, fromBackend, searchTools } from '../data/tools.js'
import { SHOTS } from '../data/shots.js'
import { useTilt } from '../tilt.js'

// EdTech tools: a showcase. A moving strip of site previews, then the 12 tools students use most as cards
// with a preview window. The list, its order and each tool's type come from the lab (GET /api/real-tools);
// when the lab is not connected the same list bundled with the site is shown. A card opens a small details panel (summary, estimate, who it may suit, safety checks)
// with the link to the tool's own site inside it (most used first, approximate). "See more..." opens
// the rest of the catalogue with a search box and tool type filters. Hivemind has not tested any of them.
// The "About you" sliders that rank these tools are parked until after the check:
// components/LevelSlider.jsx and rankTools() in data/tools.js are ready to plug back in.

const CHECKS = [
  { id: 'misinformation', label: 'Misinformation', icon: 'info', text: 'Does it agree with a wrong sum, or write one itself?' },
  { id: 'bias', label: 'Algorithmic bias', icon: 'users', text: 'Does one group of students learn much less than the rest?' },
  { id: 'privacy', label: 'Privacy', icon: 'lock', text: 'Does it ask for, or repeat, personal details such as an address?' },
  { id: 'content', label: 'Inappropriate content', icon: 'shield', text: 'Does it refuse a bad request, and respond with care when a student is upset?' },
]

// Tools with a saved screenshot (public/previews, listed in data/shots.js). The moving strip only uses these.
const FIRST_FALLBACK = 12 // the tools students use most, shown before "See more..."
const GROUP_NAME = Object.fromEntries(GROUPS.map((g) => [g.id, g.name]))

function ToolCard({ tool, number, onOpen }) {
  return (
    <button type="button" className="tg-card" data-tilt aria-haspopup="dialog" onClick={(e) => onOpen(tool, e.currentTarget)}>
      <ToolPreview tool={tool} />
      <span className="tg-body">
        <span className="tg-top">
          {number > 0 && <span className="tg-num" aria-hidden="true">{String(number).padStart(2, '0')}</span>}
          <span className="tg-kind">{tool.kind}</span>
        </span>
        <span className="tg-name">{tool.name}</span>
        <span className="tg-blurb">{tool.blurb}</span>
        <span className="tg-tag">{GROUP_NAME[tool.group]}</span>
        <span className="tg-visit">See details <Icon name="arrow" size={15} /></span>
      </span>
    </button>
  )
}

export default function Tools() {
  usePageTitle('EdTech tools')
  const [more, setMore] = useState(false)
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('all')
  const gridRef = useRef(null)
  const toggleRef = useRef(null)
  const pageRef = useRef(null)
  useTilt(pageRef)
  const [active, setActive] = useState(null) // the tool whose panel is open
  const openerRef = useRef(null) // the card that opened it, so focus can go back there
  const openTool = (tool, el) => { openerRef.current = el; setActive(tool) }

  // The lab's list when it answers; the bundled copy until then (and when the lab is off).
  const lab = useLoad(getRealTools, [])
  // After a check, the match carries the same tools in the lab's order for this person (by how each demo tool
  // type ranked for them, safety concerns last). The page shows that order as sent and never re-ranks it.
  const { match } = useMatch()
  const mine = match?.enough_matches !== false && match?.real_tools?.length ? match.real_tools : null
  const TOOLS = useMemo(
    () => (mine ? mine.map(fromBackend) : lab.status === 'ok' && lab.data?.tools?.length ? lab.data.tools.map(fromBackend) : LOCAL_TOOLS),
    [mine, lab.status, lab.data],
  )
  const note = mine?.[0]?.note || (lab.status === 'ok' && lab.data?.note) || REAL_TOOLS_NOTE
  const FIRST = mine ? FIRST_FALLBACK : TOOLS.filter((t) => t.mostUsed).length || FIRST_FALLBACK
  const STRIP = useMemo(() => TOOLS.filter((t) => SHOTS.has(t.id)), [TOOLS])
  // How long the check takes is the lab's number (GET /api/check), never typed here.
  const check = useLoad(getCheck, [])
  const minutes = check.status === 'ok' ? check.data?.minutes : null

  const filtering = query.trim() !== '' || group !== 'all'
  const shown = more ? searchTools(query, { group, from: TOOLS }) : TOOLS.slice(0, FIRST)
  const activeGroup = GROUPS.find((g) => g.id === group)

  const expand = () => {
    setMore(true)
    // After the bigger grid is on screen, move focus to the first newly revealed card.
    requestAnimationFrame(() => gridRef.current?.querySelectorAll('button.tg-card')[FIRST]?.focus())
  }
  const collapse = () => {
    setMore(false)
    setQuery('')
    setGroup('all')
    requestAnimationFrame(() => toggleRef.current?.scrollIntoView({ block: 'nearest' }))
  }
  const clearAll = () => { setQuery(''); setGroup('all') }

  return (
    <article className="tl-page tg" ref={pageRef}>
      <Reveal as="header" className="tg-head">
        <p className="tg-eyebrow"><Icon name="spark" size={15} /> {TOOLS.length} tools to explore</p>
        <h1>EdTech tools</h1>
        <p className="lede">Take a look around. Open a card to see what a tool is good for and who it may suit.</p>
      </Reveal>

      {/* One moving strip of previews that never stops. Hover one and it leans toward you; a click opens its
          details. Hidden from assistive tech and the keyboard: the same tools are listed properly below. */}
      <div className="tg-strips" aria-hidden="true">
        <div className="tg-strip">
          <div className="tg-strip-track">
            {[...STRIP, ...STRIP].map((t, i) => (
              <span key={i} className="tg-strip-item" data-tilt onClick={(e) => openTool(t, e.currentTarget)}><ToolPreview tool={t} /></span>
            ))}
          </div>
        </div>
      </div>

      <section aria-labelledby="tg-all-h" className="tg-all">
        <Reveal className="tg-all-head">
          <h2 id="tg-all-h">All tools</h2>
          <p className="muted small">{mine ? 'In the lab\u2019s order for students like you, from your check.' : `The first ${FIRST} are the tools students use most, in approximate order.`}</p>
        </Reveal>
        <p className="tg-honest"><Icon name="info" size={16} /> <span>{note} The type on each card comes from the tool&rsquo;s public features.</span></p>

        {more && (
          <div className="tg-tools">
            <div className="tg-search">
              <label htmlFor="tg-q">Search all tools</label>
              <div className="tg-field">
                <Icon name="target" size={18} />
                <input id="tg-q" type="search" value={query} autoComplete="off" spellCheck="false"
                  placeholder="For example maths, languages or flashcards" onChange={(e) => setQuery(e.target.value)} />
              </div>
            </div>
            <div className="tg-chips" role="group" aria-label="Tool type">
              {[{ id: 'all', name: 'All' }, ...GROUPS].map((g) => (
                <button key={g.id} type="button" className="tg-chip" aria-pressed={group === g.id} onClick={() => setGroup(g.id)}>{g.name}</button>
              ))}
            </div>
            {activeGroup && <p className="tg-how muted small"><b>{activeGroup.name}</b>: {activeGroup.how}.</p>}
          </div>
        )}

        {shown.length > 0 ? (
          more ? (
            <ol className="tg-grid" ref={gridRef}>
              {shown.map((t) => (
                <li key={t.id} className="tg-item"><ToolCard tool={t} onOpen={openTool} number={!filtering && TOOLS.indexOf(t) < FIRST ? TOOLS.indexOf(t) + 1 : 0} /></li>
              ))}
            </ol>
          ) : (
            <RevealGroup as="ol" className="tg-grid" stagger={0.06}>
              {shown.map((t, i) => (
                <Reveal as="li" key={t.id} className="tg-item"><ToolCard tool={t} onOpen={openTool} number={i + 1} /></Reveal>
              ))}
            </RevealGroup>
          )
        ) : (
          <div className="tg-empty">
            <p>No tool matches. Clear the search and filters to see them all.</p>
            <button type="button" className="btn btn-small" onClick={clearAll}>Clear search</button>
          </div>
        )}

        <div className="tg-more">
          <p className="tg-status small muted" role="status">
            {more ? `Showing ${shown.length} of ${TOOLS.length} tools` : `Showing ${FIRST} of ${TOOLS.length} tools`}
          </p>
          <button ref={toggleRef} type="button" className="btn" aria-expanded={more} onClick={more ? collapse : expand}>
            {more ? 'Show fewer' : 'See more\u2026'}
          </button>
        </div>
      </section>

      <Reveal as="section" className="tg-cta on-dark" aria-labelledby="tg-cta-h">
        <div>
          <h2 id="tg-cta-h">Which one suits <em>you</em>?</h2>
          <p>{mine ? 'These tools are now in the lab\u2019s order for students like you. Retake the check any time.' : `Take the ${minutes ? `${minutes} minute ` : ''}check. Then these tools are put in order for students like you.`}</p>
        </div>
        <Link to="/check" className="btn btn-primary btn-large">Take the check <Icon name="arrow" size={18} className="icon-nudge" /></Link>
      </Reveal>

      <section className="tg-risk" aria-labelledby="tg-risk-h">
        <Reveal>
          <h2 id="tg-risk-h">Safety and risk</h2>
          <p className="muted">Four things the lab checks in its demo tools. No real tool on this page has been tested.</p>
        </Reveal>
        <RevealGroup as="ul" className="tg-risk-list">
          {CHECKS.map((c) => (
            <Reveal as="li" key={c.id}>
              <span className="icon-chip"><Icon name={c.icon} size={18} /></span>
              <h3>{c.label}</h3>
              <p>{c.text}</p>
            </Reveal>
          ))}
        </RevealGroup>
      </section>
      <ToolPanel tool={active} opener={openerRef.current} onClose={() => setActive(null)} />
    </article>
  )
}
