import SuggestBox from '../components/SuggestBox.jsx'
import '../styles/tools.css'
import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLoad, usePageTitle } from '../hooks.js'
import { useMatch } from '../store.jsx'
import { getCheck, getRealTools } from '../api.js'
import { plainWords } from '../labels.js'
import { usePiloted } from '../pilot.js'
import Icon from '../components/Icon.jsx'
import ToolPreview from '../components/ToolPreview.jsx'
import ToolPanel from '../components/ToolPanel.jsx'
import { Reveal, RevealGroup } from '../components/Reveal.jsx'
import { TOOLS as LOCAL_TOOLS, GROUPS, HELPER_KINDS, HELPER_RULE, REAL_TOOLS_NOTE, TEACHES_RULE, NEEDS, fitsNeed, fromBackend, helperKind, teaches } from '../data/tools.js'
import { SHOTS } from '../data/shots.js'
import { useTilt } from '../tilt.js'
import ToolsFilm from '../at/ToolsFilm.jsx'

// EdTech tools: a showcase. One search bar over every tool. Without a search, a moving strip of site previews
// and a scroll scene (at/ToolsFilm.jsx) with one frosted window per group: the four tool types and the study
// helper kinds. A window opens that group's own page with all its tools as cards. A card opens a small details
// panel (summary, estimate, the safety facts of that one tool) with the link to the tool's own site inside it.
// The list, its order and each tool's type come from the lab (GET /api/real-tools); when the lab is not
// connected the same list bundled with the site is shown. Hivemind has not tested any of them.
// The "About you" sliders that rank these tools are parked until after the check:
// components/LevelSlider.jsx and rankTools() in data/tools.js are ready to plug back in.

const CHECKS = [
  { id: 'misinformation', label: 'Misinformation', icon: 'info', text: 'Does it agree with a wrong sum, or write one itself?' },
  { id: 'bias', label: 'Algorithmic bias', icon: 'users', text: 'Does one group of students learn much less than the rest?' },
  { id: 'privacy', label: 'Privacy', icon: 'lock', text: 'Does it ask for, or repeat, personal details such as an address?' },
  { id: 'content', label: 'Inappropriate content', icon: 'shield', text: 'Does it refuse a bad request, and respond with care when a student is upset?' },
]

// Tools with a saved screenshot (public/previews, listed in data/shots.js). The moving strip only uses these.
const GROUP_NAME = Object.fromEntries(GROUPS.map((g) => [g.id, g.name]))

// Search over every tool: each word typed must start a word in the tool's name, type, group or description
// (inside a word is fine from three letters). Name matches come first, then the catalogue order.
const words = (s) => String(s).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
const hits = (ws, q) => ws.some((w) => w.startsWith(q) || (q.length >= 3 && w.includes(q)))
function searchAll(query, tools) {
  const qs = words(query)
  if (!qs.length) return tools
  const ranked = []
  tools.forEach((t, order) => {
    const nameW = words(t.name)
    const h = helperKind(t)
    const groupW = words(h ? `Study helper ${h.name}` : GROUP_NAME[t.group] || '')
    const allW = [...nameW, ...words(t.kind), ...words(t.blurb), ...groupW]
    if (!qs.every((q) => hits(allW, q))) return
    const nameHits = qs.filter((q) => hits(nameW, q)).length
    ranked.push({ t, order, rank: nameHits === qs.length ? 0 : nameHits > 0 ? 1 : 2 })
  })
  return ranked.sort((a, b) => a.rank - b.rank || a.order - b.order).map((r) => r.t)
}

// The tool shown in a group's window: the first one with a saved screenshot, else the first one.
const pickRep = (tools) => tools.find((t) => SHOTS.has(t.id)) || tools[0] || null

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
        <span className="tg-tags">
          <span className="tg-tag" data-helper={helperKind(tool) ? '' : undefined}>{helperKind(tool)?.name ?? GROUP_NAME[tool.group]}</span>
          {tool.piloted && <span className="tg-tag tg-tag-pilot">Piloted</span>}
        </span>
        <span className="tg-visit">See details <Icon name="arrow" size={15} /></span>
      </span>
    </button>
  )
}

export default function Tools() {
  usePageTitle('EdTech tools')
  const [query, setQuery] = useState('')
  const [need, setNeed] = useState(null) // one "What do you need help with?" button at a time (NEEDS in data/tools.js)
  const searchRef = useRef(null)
  const pageRef = useRef(null)
  useTilt(pageRef)
  const [active, setActive] = useState(null) // the tool whose panel is open
  const openerRef = useRef(null) // the card that opened it, so focus can go back there
  const openTool = (tool, el) => { openerRef.current = el; setActive(tool) }

  // The lab's list when it answers; the bundled copy until then (and when the lab is off).
  const lab = useLoad(getRealTools, [])
  // After a check, the match carries the same tools in the lab's order for this person (by how each demo tool
  // type ranked for them). The page shows that order as sent and never re-ranks it.
  const { match } = useMatch()
  const mine = match?.enough_matches !== false && !match?.example && match?.real_tools?.length ? match.real_tools : null
  // Real products that had the small pilot (GET /api/pilot): real tool id -> the modes that finished all 3 lessons.
  // Only "Piloted" is shown here, with a link to the pilot. Its scores stay on the pilot page, next to its note.
  const { map: PILOTED, sample: pilotSample } = usePiloted()
  const ALL = useMemo(
    () => (mine ? mine.map(fromBackend) : lab.status === 'ok' && lab.data?.tools?.length ? lab.data.tools.map(fromBackend) : LOCAL_TOOLS)
      .map((t) => (PILOTED.has(t.id) ? { ...t, piloted: { modes: PILOTED.get(t.id), sample: pilotSample } } : t)),
    [mine, lab.status, lab.data, PILOTED, pilotSample],
  )
  // Teaching tools make up the tool types (the lab's order applies to them). Study helpers (graphing, answer
  // finders, writing helpers) are their own kinds: see data/tools.js.
  const TOOLS = useMemo(() => ALL.filter(teaches), [ALL])
  const HELPERS = useMemo(() => HELPER_KINDS.map((k) => ({ ...k, tools: ALL.filter((t) => helperKind(t)?.id === k.id) })).filter((k) => k.tools.length), [ALL])
  // One window per group on the scroll scene: the tool types, then the study helper kinds. Empty ones are left out.
  const WINDOWS = useMemo(() => {
    const win = (id, kind, name, how, tools, rule) => ({ id, kind, name, how, tools, rule, rep: pickRep(tools) })
    const known = new Set(GROUPS.map((g) => g.id))
    const rest = TOOLS.filter((t) => !known.has(t.group)) // safety net: a tool whose type the lab did not send
    return [
      ...GROUPS.map((g) => win(g.id, 'Tool type', g.name, g.how, TOOLS.filter((t) => t.group === g.id), TEACHES_RULE)),
      ...HELPERS.map((k) => win(`helper-${k.id}`, 'Study helper', k.name, k.how, k.tools, HELPER_RULE)),
      win('other', 'Tool type', 'Other tools', 'Not yet sorted into a tool type', rest, ''),
    ].filter((w) => w.tools.length)
  }, [TOOLS, HELPERS])
  const note = plainWords(mine?.[0]?.note || (lab.status === 'ok' && lab.data?.note) || REAL_TOOLS_NOTE)
  const STRIP = useMemo(() => ALL.filter((t) => SHOTS.has(t.id)), [ALL])
  // How long the check takes is the lab's number (GET /api/check), never typed here.
  const check = useLoad(getCheck, [])
  const minutes = check.status === 'ok' ? check.data?.minutes : null

  const searching = query.trim() !== '' || !!need
  const found = useMemo(() => (searching ? searchAll(query, need ? ALL.filter(fitsNeed(need)) : ALL) : []), [searching, query, need, ALL])
  const clearSearch = () => { setQuery(''); setNeed(null); searchRef.current?.focus() }
  const needName = NEEDS.find((n) => n.id === need)?.label

  return (
    <article className="tl-page tg" ref={pageRef}>
      <Reveal as="header" className="tg-head">
        <p className="tg-eyebrow"><Icon name="spark" size={15} /> {TOOLS.length} tools that teach{ALL.length > TOOLS.length ? `, ${ALL.length - TOOLS.length} study helpers` : ''}</p>
        <h1>EdTech tools</h1>
        <p className="lede">Open a card to see what a tool is good for and how Hivemind reads it.</p>
      </Reveal>

      {/* One search over every tool, teaching tools and study helpers. */}
      <div className="tsr" role="search">
        <label htmlFor="tsr-q" className="sr-only">Search all EdTech tools by name, type or description</label>
        <div className="tsr-field">
          <Icon name="target" size={20} />
          <input id="tsr-q" ref={searchRef} type="search" value={query} autoComplete="off" spellCheck="false"
            placeholder="Search every tool: a name, a type, or a subject" onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape' && query) { e.preventDefault(); setQuery('') } }} />
          {searching && <button type="button" className="tsr-clear" onClick={clearSearch} aria-label="Clear search"><Icon name="close" size={18} /></button>}
        </div>
        <div className="tsr-needs" role="group" aria-label="What do you need help with?">
          {NEEDS.map((n) => (
            <button key={n.id} type="button" className="sg-kind" data-on={need === n.id ? '' : undefined} aria-pressed={need === n.id}
              onClick={() => setNeed((x) => (x === n.id ? null : n.id))}>{n.label}</button>
          ))}
        </div>
        <p className="tsr-count" role="status">{searching ? (found.length ? `${found.length} of ${ALL.length} tools${needName ? ` for ${needName.toLowerCase()}` : ''}` : 'No tools match') : `${ALL.length} tools`}</p>
      </div>

      {/* One moving strip of previews that never stops. Hover one and it leans toward you; a click opens its
          details. Hidden from assistive tech and the keyboard: the same tools are listed properly below. */}
      {!searching && (
        <div className="tg-strips" aria-hidden="true">
          <div className="tg-strip">
            <div className="tg-strip-track">
              {[...STRIP, ...STRIP].map((t, i) => (
                <span key={i} className="tg-strip-item" data-tilt onClick={(e) => openTool(t, e.currentTarget)}><ToolPreview tool={t} /></span>
              ))}
            </div>
          </div>
        </div>
      )}

      {searching ? (
        found.length > 0 ? (
          <ol className="tg-grid">
            {found.map((t) => <li key={t.id} className="tg-item"><ToolCard tool={t} onOpen={openTool} number={0} /></li>)}
          </ol>
        ) : (
          <div className="tsr-empty">
            <p>No tools match{query.trim() ? <> &ldquo;{query.trim()}&rdquo;</> : ''}{needName ? ` for ${needName.toLowerCase()}` : ''}.</p>
            <button type="button" className="btn btn-small" onClick={clearSearch}>Clear search</button>
          </div>
        )
      ) : (
        <>
          <section aria-label="How the tools are sorted" className="tg-all">
            <p className="tg-rule">{TEACHES_RULE} {mine ? 'In each tool type, tools follow the lab\u2019s order for students like you.' : 'In each tool type, the most used tools come first, roughly.'}{' '}
              {PILOTED.size > 0
                ? <>Each card&rsquo;s type is our estimate from the tool&rsquo;s public features. Only tools marked <b>Piloted</b> have been tested, on {pilotSample} simulated students: <Link to="/lab/real-tools">see the pilot</Link>.</>
                : <>{note} The type on each card comes from the tool&rsquo;s public features.</>}</p>
          </section>
          <ToolsFilm groups={WINDOWS} renderCard={(t) => <ToolCard tool={t} onOpen={openTool} number={0} />} />
        </>
      )}

      <Reveal as="section" className="tg-cta on-dark" aria-labelledby="tg-cta-h">
        <div>
          <h2 id="tg-cta-h">Find the tool type that suits you</h2>
          <p>{mine ? 'These tools are now in the lab\u2019s order for students like you. Retake the check any time.' : 'Take the short check, and the teaching tools are sorted for students like you.'}</p>
        </div>
        <Link to="/check" className="btn btn-primary btn-large">Take the check <Icon name="arrow" size={18} className="icon-nudge" /></Link>
      </Reveal>

      <section className="tg-risk" aria-labelledby="tg-risk-h">
        <Reveal>
          <h2 id="tg-risk-h">Safety and risk</h2>
          <p className="muted">These are four kinds of risk to watch for in any real tool. {PILOTED.size > 0 ? 'Only the tools marked Piloted have had a small test of them.' : 'Hivemind has not tested any tool on this page.'}</p>
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
      <Reveal blur={false}><SuggestBox /></Reveal>
      <ToolPanel tool={active} opener={openerRef.current} onClose={() => setActive(null)} />
    </article>
  )
}
