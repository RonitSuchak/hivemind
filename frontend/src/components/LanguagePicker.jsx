import { useId, useMemo, useState } from 'react'
import Icon from './Icon.jsx'
import { LANGUAGES } from '../data/languages.js'
import { useMatch } from '../store.jsx'

// "Which languages do you speak?" Pick as many as you like: tap a chip, or type to narrow the list.
// Kept in memory for this visit only (nothing about a person is saved). Picking one also shows the site in it.
const QUICK = 10 // chips shown before you type

export default function LanguagePicker() {
  const id = useId()
  const { languages, setLanguages, siteLang, setSiteLang } = useMatch()
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const shown = useMemo(() => {
    if (!q) return LANGUAGES.slice(0, QUICK)
    return LANGUAGES.filter((l) => l.name.toLowerCase().split(' ').some((w) => w.startsWith(q)) || l.own.toLowerCase().startsWith(q)
      || (q.length >= 3 && l.name.toLowerCase().includes(q))).slice(0, 12)
  }, [q])
  const has = (l) => languages.includes(l.id)
  // Picking a language also shows the site in it (see Translate.jsx). Removing it goes back to English.
  const toggle = (l) => {
    if (has(l)) { setLanguages(languages.filter((x) => x !== l.id)); if (siteLang === l.id) setSiteLang('en') }
    else { setLanguages([...languages, l.id]); setSiteLang(l.id) }
  }
  const picked = languages.map((x) => LANGUAGES.find((l) => l.id === x)).filter(Boolean)
  // Chosen languages that are not in the visible list still need a chip so they can be removed.
  const extra = picked.filter((l) => !shown.includes(l))

  return (
    <div className="lg" data-no-translate>
      <div className="lg-box">
        <Icon name="chat" size={20} />
        <label className="sr-only" htmlFor={`${id}-in`}>Search languages</label>
        <input id={`${id}-in`} className="lg-input" type="text" inputMode="search" autoComplete="off" spellCheck="false"
          placeholder="Type a language, like Polish or العربية" value={query} onChange={(e) => setQuery(e.target.value)} />
        {query && <button type="button" className="lg-clear" aria-label="Clear" onClick={() => setQuery('')}><Icon name="close" size={16} /></button>}
      </div>
      <ul className="lg-chips" aria-label="Languages">
        {[...extra, ...shown].map((l) => (
          <li key={l.id}>
            <button type="button" className="lg-chip" aria-pressed={has(l)} onClick={() => toggle(l)}>
              {has(l) && <Icon name="check" size={14} />}
              <span>{l.name}</span>
              {l.own !== l.name && <i lang={l.id}>{l.own}</i>}
            </button>
          </li>
        ))}
      </ul>
      <p className="lg-status" role="status">
        {q && shown.length === 0 ? 'No language matches. Check the spelling, or type it in English.'
          : picked.length === 0 ? `${LANGUAGES.length} languages. Type to find yours.`
          : `You speak ${picked.length === 1 ? picked[0].name : `${picked.length} languages`}. The site switches to the last one you pick.`}
      </p>
    </div>
  )
}
