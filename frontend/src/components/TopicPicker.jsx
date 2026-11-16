import { useId, useMemo, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import { SUBJECTS, searchTopics, programmeForQuery } from '../data/topics.js'
import '../styles/topics.css'

// "What do you want to work on?" A text box that narrows with every letter: subjects first, then
// topics, until one is left. Pick a subject chip to start, or type. Arrow keys move, Enter chooses.
// Topics without questions yet are listed as "Coming soon" and cannot be chosen. Exam programme
// topics (Edexcel, AQA, OCR, Cambridge, IB) start the general check for their subject until their own is written.
// Typing an exam code (9FM0, H556, 0580) lists that programme: its "whole course" entry first, then its topics.
//   value: the chosen topic or null    onChange(topic | null)    canStart(topic): ready in this session?
const MAX = 7
// The word used in "You will get the general ___ check."
const GENERAL = { Maths: 'maths', English: 'English', Science: 'science', Computing: 'computing', Languages: 'languages' }
const generalName = (subject) => GENERAL[subject] ?? subject.toLowerCase()

// Bold the letters the student typed where they start a word of the name.
function Marked({ text, query }) {
  const toks = query.toLowerCase().split(/\s+/).filter(Boolean)
  return text.split(/(\s+)/).map((w, i) => {
    const tok = toks.find((t) => w.toLowerCase().startsWith(t))
    return tok ? <span key={i}><mark>{w.slice(0, tok.length)}</mark>{w.slice(tok.length)}</span> : <span key={i}>{w}</span>
  })
}

// "9FM0 · Edexcel A level Further Maths · Core Pure 1". A whole course says so instead of naming a unit.
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`
const detail = (t) => {
  if (t.isProgramme) return [t.code, 'Whole course', plural(t.unitCount, 'unit')].filter(Boolean).join(' · ')
  if (t.programme) return [t.code, t.programmeShort, t.unit].filter(Boolean).join(' · ')
  return t.subject
}
const tagFor = (t) => (!t.ready ? 'Coming soon' : t.exact ? 'Start' : 'General check')

export default function TopicPicker({ value, onChange, canStart }) {
  const id = useId()
  const input = useRef(null)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const all = useMemo(() => searchTopics(query, canStart), [query, canStart])
  const results = all.slice(0, MAX)
  const typing = query.trim().length > 0

  const type = (q) => { setQuery(q); setActive(0) }
  const choose = (t) => { if (!t?.ready) return; onChange(t); setQuery('') }
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(results.length - 1, a + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); choose(results[active]) } // never submits the form
    else if (e.key === 'Escape' && typing) { e.preventDefault(); type('') }
  }

  if (value) {
    return (
      <div className="tk tk-chosen">
        <span className="icon-chip icon-chip-pop" aria-hidden="true"><Icon name="target" size={18} /></span>
        <p className="tk-chosen-text"><span>{detail(value)}</span><strong>{value.name}</strong></p>
        <button type="button" className="btn btn-small" onClick={() => { onChange(null); requestAnimationFrame(() => input.current?.focus()) }}>Change</button>
        {value.exact === false && <p className="tk-chosen-note">Questions for this {value.isProgramme ? 'whole course' : 'exact topic'} are not written yet. You will get the general {generalName(value.subject)} check.</p>}
      </div>
    )
  }

  // A programme's full name or exact code lists that programme. Skip highlighting then.
  const mark = programmeForQuery(query) ? '' : query
  return (
    <div className="tk">
      <label className="tk-label" htmlFor={`${id}-in`}>What do you want to work on?</label>
      <div className="tk-box">
        <Icon name="target" size={20} />
        <input ref={input} id={`${id}-in`} className="tk-input" type="text" inputMode="search" autoComplete="off" autoCapitalize="off" spellCheck="false"
          placeholder="Topic, subject or exam code, like 9FM0" value={query} onChange={(e) => type(e.target.value)} onKeyDown={onKey}
          role="combobox" aria-expanded={typing} aria-controls={`${id}-list`} aria-autocomplete="list"
          aria-activedescendant={typing && results[active] ? `${id}-o${active}` : undefined} />
        {typing && <button type="button" className="tk-clear" aria-label="Clear" onClick={() => { type(''); input.current?.focus() }}><Icon name="close" size={16} /></button>}
      </div>

      {!typing && (
        <ul className="tk-subjects" aria-label="Subjects">
          {SUBJECTS.map((s) => (
            <li key={s}><button type="button" onClick={() => { type(`${s} `); input.current?.focus() }}>{s}</button></li>
          ))}
        </ul>
      )}

      {!typing && <p className="tk-hint">Know your exam code? Type it, for example 9FM0, H556 or 0580.</p>}

      {typing && (
        <>
          <p className="tk-count" role="status">
            {all.length === 0 ? 'No topic matches. Try a subject, like maths.'
              : all.length === 1 ? (results[0].ready ? '1 topic left. Press Enter to choose it.' : '1 topic left. It is not ready yet.')
              : `${all.length} topics. Keep typing to narrow it down.`}
          </p>
          <ul className="tk-list" id={`${id}-list`} role="listbox" aria-label="Topics">
            {results.map((t, i) => {
              const line = detail(t)
              return (
                <li key={t.id} id={`${id}-o${i}`} role="option" aria-selected={i === active} aria-disabled={!t.ready || undefined}
                  className={`tk-opt${i === active ? ' is-active' : ''}${t.ready ? '' : ' is-soon'}`} style={{ '--i': i }}
                  onMouseEnter={() => setActive(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => choose(t)}>
                  <span className="tk-opt-meta" title={line}>{line}</span>
                  <span className="tk-opt-name"><Marked text={t.name} query={mark} /></span>
                  <span className="tk-opt-tag">{t.ready && i === active && <Icon name="arrow" size={12} />}{tagFor(t)}</span>
                </li>
              )
            })}
          </ul>
          {all.length > MAX && <p className="tk-more">and {all.length - MAX} more</p>}
        </>
      )}
    </div>
  )
}
