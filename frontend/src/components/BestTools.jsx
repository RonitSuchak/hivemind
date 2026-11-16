import Icon from './Icon.jsx'
import ToolPreview from './ToolPreview.jsx'
import { typeName } from '../labels.js'
import '../styles/best.css'

// Three real tools to try, as cards with a preview and a link (Lab student drawer and the results page).
// Real tools are NOT tested by Hivemind: no score, star or predicted gain is ever shown here, and `note`
// (the backend's own sentence) always sits right under the cards.
//   items: [{ tool, line }]   tool is in the shape of data/tools.js; line is one short sentence, or ''
export default function BestTools({ items, title, note, wide = false, headingId = 'best-h' }) {
  if (!items.length) return null
  return (
    <section className={`lx-best${wide ? ' lx-best-wide' : ''}`} aria-labelledby={headingId}>
      <h3 id={headingId}>{title}</h3>
      <ol className="lx-best-list">
        {items.map(({ tool, line }, i) => (
          <li key={tool.id}>
            <a className="lx-best-card" href={tool.url} target="_blank" rel="noopener noreferrer">
              <ToolPreview tool={tool} />
              <span className="lx-best-body">
                <span className="lx-best-top"><span className="lx-best-num" aria-hidden="true">{i + 1}</span><span className="lx-best-name">{tool.name}</span></span>
                <span className="lx-best-kind">{tool.kind} · {typeName(tool.group)}</span>
                {line && <span className="lx-best-why">{line}</span>}
                <span className="lx-best-go">Visit site <Icon name="arrow" size={14} /><span className="sr-only"> (opens in a new tab)</span></span>
              </span>
            </a>
          </li>
        ))}
      </ol>
      <p className="lx-best-note"><Icon name="info" size={14} /> <span>{note}</span></p>
    </section>
  )
}
