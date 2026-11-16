import '../styles/tools.css'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePageTitle } from '../hooks.js'
import Icon from '../components/Icon.jsx'
import ToolPreview from '../components/ToolPreview.jsx'
import ToolPanel from '../components/ToolPanel.jsx'
import { Reveal, RevealGroup } from '../components/Reveal.jsx'
import { TOOLS, GROUPS, searchTools } from '../data/tools.js'

// EdTech tools: a showcase. A moving strip of site previews, then the 12 tools students use most as cards
// with a preview window. A card opens a small details panel (summary, estimate, who it may suit, safety checks)
// with the link to the tool's own site inside it (most used first, approximate). "See more..." opens
// the rest of the catalogue with a search box and tool type filters. Hivemind has not tested any of them.
// The "About you" sliders that rank these tools are parked until after the check:
// components/LevelSlider.jsx and rankTools() in data/tools.js are ready to plug back in.

const CHECKS = [
  { id: 'misinformation', label: 'Misinformation', icon: 'info', text: 'Wrong or made-up answers.' },
  { id: 'bias', label: 'Algorithmic bias', icon: 'users', text: 'Working worse for some groups of students.' },
  { id: 'privacy', label: 'Privacy', icon: 'lock', text: 'What it collects and who can see it.' },
  { id: 'content', label: 'Inappropriate content', icon: 'shield', text: 'Content that is not right for your age.' },
]

// Tools with a saved screenshot (public/previews). The moving strip only uses these.
const HAS_SHOT = new Set(['chatgpt', 'khan-academy', 'kahoot', 'photomath', 'desmos', 'brilliant', 'anki', 'seneca', 'sparx-maths', 'khanmigo'])
const STRIP = TOOLS.filter((t) => HAS_SHOT.has(t.id))
const FIRST = 12 // the tools students use most, shown before "See more..."
const GROUP_NAME = Object.fromEntries(GROUPS.map((g) => [g.id, g.name]))

function ToolCard({ tool, number, onOpen }) {
  return (
    <button type="button" className="tg-card" aria-haspopup="dialog" onClick={(e) => onOpen(tool, e.currentTarget)}>
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
  const [active, setActive] = useState(null) // the tool whose panel is open
  const openerRef = useRef(null) // the card that opened it, so focus can go back there
  const openTool = (tool, el) => { openerRef.current = el; setActive(tool) }

  const filtering = query.trim() !== '' || group !== 'all'
  const shown = more ? searchTools(query, { group }) : TOOLS.slice(0, FIRST)
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
    <article className="tl-page tg">
      <Reveal as="header" className="tg-head">
        <p className="tg-eyebrow"><Icon name="spark" size={15} /> {TOOLS.length} tools to explore</p>
        <h1>EdTech tools</h1>
        <p className="lede">Take a look around. Open a card to see what a tool is good for and who it may suit.</p>
      </Reveal>

      {/* Moving strip of previews. Decorative: the same tools are listed properly below. */}
      <div className="tg-strip" aria-hidden="true">
        <div className="tg-strip-track">
          {[...STRIP, ...STRIP].map((t, i) => (
            <span key={i} className="tg-strip-item"><ToolPreview tool={t} /></span>
          ))}
        </div>
      </div>

      <section aria-labelledby="tg-all-h" className="tg-all">
        <Reveal className="tg-all-head">
          <h2 id="tg-all-h">All tools</h2>
          <p className="muted small">The first 12 are the tools students use most, in approximate order.</p>
        </Reveal>
        <p className="tg-honest"><Icon name="info" size={16} /> <span>The tool type on each card is our estimate from the tool&rsquo;s public features. Hivemind has not tested these tools.</span></p>

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
          <p>Take the 5 minute check. Then we rank these tools for students like you.</p>
        </div>
        <Link to="/check" className="btn btn-primary btn-large">Take the check <Icon name="arrow" size={18} className="icon-nudge" /></Link>
      </Reveal>

      <section className="tg-risk" aria-labelledby="tg-risk-h">
        <Reveal>
          <h2 id="tg-risk-h">Safety and risk</h2>
          <p className="muted">Four things the lab will check in every tool. None are tested yet.</p>
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
