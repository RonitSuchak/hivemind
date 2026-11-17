import Icon from './Icon.jsx'
import ToolPreview from './ToolPreview.jsx'
import { SHOTS } from '../data/shots.js'
import { typeName } from '../labels.js'
import '../styles/best.css'

// Up to three real tools to try, as cards with a preview and a link (Lab student drawer and the results page).
// They are examples of a tool type, so they carry no number: their order is not a ranking.
// Real tools are NOT tested by Hivemind: no score, star or predicted gain is ever shown here, and `note`
// (the backend's own sentence) always sits right under the cards.
// Pick up to `n` example sites: tools with a saved screenshot first, otherwise in the given order.
// The cards are examples of a type, so this order is not a ranking.
export const pickSites = (tools, n = 3) => [...tools.filter((t) => SHOTS.has(t.id)), ...tools.filter((t) => !SHOTS.has(t.id))].slice(0, n)

const joinTypes = (groups) => groups.map((g) => typeName(g)).join(' and ')
// The headline above the cards. `who` is 'you' for the person's own result, anything else for an example student.
export function bestTitle(groups, who = 'you') {
  const people = who === 'you' ? 'Students like you' : 'Students like this one'
  return groups.length > 1 ? `${people} gained the same with ${joinTypes(groups)} tools` : `${people} gained most with ${typeName(groups[0])} tools`
}
// The first sentences of the note under the cards. `groups` has two ids when the result is a tie.
export function bestNote(groups) {
  if (groups.length > 1) {
    const t = joinTypes(groups)
    return `Our ${t} demo tools came first together for these students. The sites here are examples of those types.`
  }
  const t = typeName(groups[0])
  return `Our ${t} demo tool came first for these students. The sites here are examples of that type.`
}

//   items: [{ tool, line }]   tool is in the shape of data/tools.js; line is one short sentence, or ''
export default function BestTools({ items, title, note, wide = false, headingId = 'best-h' }) {
  if (!items.length) return null
  return (
    <section className={`lx-best${wide ? ' lx-best-wide' : ''}`} aria-labelledby={headingId}>
      <h3 id={headingId}>{title}</h3>
      <ul className="lx-best-list">
        {items.map(({ tool, line }) => (
          <li key={tool.id}>
            <a className="lx-best-card" href={tool.url} target="_blank" rel="noopener noreferrer">
              <ToolPreview tool={tool} />
              <span className="lx-best-body">
                <span className="lx-best-top"><span className="lx-best-name">{tool.name}</span></span>
                <span className="lx-best-kind">{tool.kind} · {typeName(tool.group)}</span>
                {line && <span className="lx-best-why">{line}</span>}
                <span className="lx-best-go">Visit site <Icon name="arrow" size={14} /><span className="sr-only"> (opens in a new tab)</span></span>
              </span>
            </a>
          </li>
        ))}
      </ul>
      <p className="lx-best-note"><Icon name="info" size={14} /> <span>{note}</span></p>
    </section>
  )
}
