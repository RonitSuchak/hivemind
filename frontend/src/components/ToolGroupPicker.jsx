import { useId, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import ToolPreview from './ToolPreview.jsx'
import { GROUPS, searchTools } from '../data/tools.js'

// The real tools that teach like one simulated tool type: a search bar, a list to pick from and
// the picked tool's details. Hivemind has not tested these tools, and the text says so.
// The list is a radio group: arrow keys move the choice, Tab leaves the list.
export default function ToolGroupPicker({ tutorId, tutorName, compact = false }) {
  const uid = useId()
  const [query, setQuery] = useState('')
  const [pickedId, setPickedId] = useState(null)
  const [said, setSaid] = useState('')
  const rows = useRef({})

  const group = GROUPS.find((g) => g.id === tutorId)
  const total = searchTools('', { group: tutorId }).length
  const matches = searchTools(query, { group: tutorId })
  const picked = matches.find((t) => t.id === pickedId) ?? matches[0] ?? null
  const searching = query.trim() !== ''

  const choose = (tool, focus = false) => {
    setPickedId(tool.id)
    setSaid(`Selected ${tool.name}, ${tool.kind}`)
    if (focus) rows.current[tool.id]?.focus()
  }

  const onKeyDown = (e) => {
    const i = matches.findIndex((t) => t.id === picked?.id)
    let next = null
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = matches[(i + 1) % matches.length]
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = matches[(i - 1 + matches.length) % matches.length]
    else if (e.key === 'Home') next = matches[0]
    else if (e.key === 'End') next = matches[matches.length - 1]
    if (!next) return
    e.preventDefault()
    choose(next, true)
  }

  const count = searching ? `${matches.length} of ${total} tools` : `${total} ${total === 1 ? 'tool' : 'tools'}`

  return (
    <div className={`tgp${compact ? ' tgp-compact' : ''}`}>
      {group && <p className="tgp-how"><b>{tutorName || group.name}</b>: {group.how}. These real tools teach in a similar way.</p>}

      <div className="tgp-search">
        <label htmlFor={`${uid}-q`}>Search tools in this group</label>
        <div className="tgp-field">
          <Icon name="target" size={18} />
          <input id={`${uid}-q`} type="search" value={query} autoComplete="off" spellCheck="false"
            placeholder="For example maths or flashcards" onChange={(e) => setQuery(e.target.value)} />
        </div>
        <p className="tgp-count" role="status">{count}</p>
      </div>

      {matches.length > 0 ? (
        <div className="tgp-main">
          <div className="tgp-list" role="radiogroup" aria-label={`Tools in the ${tutorName || group?.name || 'tool'} group`} onKeyDown={onKeyDown}>
            {matches.map((t) => {
              const on = t.id === picked.id
              return (
                <button key={t.id} type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1}
                  ref={(el) => { if (el) rows.current[t.id] = el; else delete rows.current[t.id] }}
                  className={`tgp-row${on ? ' is-on' : ''}`} onClick={() => choose(t)}>
                  <span className="tgp-row-name">{t.name}</span>
                  <span className="tgp-row-kind">{t.kind}</span>
                </button>
              )
            })}
          </div>

          <section className="tgp-detail" aria-labelledby={`${uid}-d`}>
            <ToolPreview tool={picked} />
            <div className="tgp-detail-text">
              <h3 id={`${uid}-d`}>{picked.name}</h3>
              <p className="tgp-detail-kind">{picked.kind}</p>
              <p className="tgp-detail-blurb">{picked.blurb}</p>
              <a className="btn btn-small tgp-visit" href={picked.url} target="_blank" rel="noopener noreferrer">
                Visit site <Icon name="arrow" size={15} /><span className="sr-only"> (opens in a new tab)</span>
              </a>
            </div>
          </section>
        </div>
      ) : (
        <div className="tgp-empty">
          <p>No tool in this group matches. Clear the search to see them all.</p>
          <button type="button" className="btn btn-small" onClick={() => setQuery('')}>Clear search</button>
        </div>
      )}

      <p className="sr-only" aria-live="polite">{said}</p>
      <p className="tgp-note"><Icon name="info" size={16} /> <span>This grouping is our estimate. Hivemind has not tested these tools, so the scores above do not apply to them.</span></p>
    </div>
  )
}
