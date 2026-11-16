import { useId, useMemo, useState } from 'react'
import Icon from './Icon.jsx'
import { LANGUAGES } from '../data/languages.js'
import { useMatch } from '../store.jsx'
import { BETA, useT } from '../i18n/index.js'

// "Which languages do you speak?" Two parts:
//  1. A row for the hand-translated beta languages (English, Russian, Hindi). One is shown at a time.
//  2. Every other language: tap a chip, or type to narrow the list. These rely on the browser's own translator.
// Kept in memory for this visit only (nothing about a person is saved). Picking a language also shows the site in it.
const QUICK = 10 // chips shown before you type
const BETA_ROW = BETA.map((id) => LANGUAGES.find((l) => l.id === id)) // English, Русский, हिन्दी (own names)
const matches = (l, q) => l.name.toLowerCase().split(' ').some((w) => w.startsWith(q)) || l.own.toLowerCase().startsWith(q)
  || (q.length >= 3 && l.name.toLowerCase().includes(q))

export default function LanguagePicker() {
  const id = useId()
  const t = useT()
  const { languages, setLanguages, siteLang, setSiteLang } = useMatch()
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  // The beta languages have their own row, so the searchable list is for the rest.
  const others = useMemo(() => LANGUAGES.filter((l) => !BETA.includes(l.id)), [])
  const shown = useMemo(() => {
    if (!q) return others.slice(0, QUICK)
    return others.filter((l) => matches(l, q)).slice(0, 12)
  }, [q, others])
  const has = (l) => languages.includes(l.id)
  // Picking a language also shows the site in it (see Translate.jsx). Removing it goes back to English.
  // One language at a time: picking a new one drops the one before. Picking the chosen one again goes back to English.
  const toggle = (l) => {
    if (has(l)) { setLanguages([]); setSiteLang('en') }
    else { setLanguages([l.id]); setSiteLang(l.id) }
  }
  // Beta row: pick one site language. It replaces any language picked before.
  const pickBeta = (l) => {
    setLanguages(l.id === 'en' ? [] : [l.id])
    setSiteLang(l.id)
  }
  const picked = languages.map((x) => LANGUAGES.find((l) => l.id === x)).filter(Boolean)
  // Chosen languages that are not in the visible list still need a chip so they can be removed.
  const extra = picked.filter((l) => !shown.includes(l) && !BETA.includes(l.id))
  const betaHit = q && BETA_ROW.some((l) => matches(l, q))

  return (
    <div className="lg" data-no-translate>
      <div className="lg-beta" role="group" aria-labelledby={`${id}-beta`}>
        <p className="lg-beta-label" id={`${id}-beta`}>{t('picker.betaLabel')}</p>
        <ul className="lg-chips">
          {BETA_ROW.map((l) => (
            <li key={l.id}>
              <button type="button" className="lg-chip lg-chip-beta" lang={l.id} aria-pressed={siteLang === l.id} onClick={() => pickBeta(l)}>
                {siteLang === l.id && <Icon name="check" size={14} />}
                <span>{l.own}</span>
                <span className="lg-tag">Beta</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <p className="lg-note">{t('picker.other')}</p>
      <div className="lg-box">
        <Icon name="chat" size={20} />
        <label className="sr-only" htmlFor={`${id}-in`}>{t('picker.search')}</label>
        <input id={`${id}-in`} className="lg-input" type="text" inputMode="search" autoComplete="off" spellCheck="false"
          placeholder={t('picker.placeholder')} value={query} onChange={(e) => setQuery(e.target.value)} />
        {query && <button type="button" className="lg-clear" aria-label={t('picker.clear')} onClick={() => setQuery('')}><Icon name="close" size={16} /></button>}
      </div>
      <ul className="lg-chips" aria-label={t('picker.list')}>
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
        {q && shown.length === 0 && !betaHit ? t('picker.noMatch')
          : picked.length === 0 ? t('picker.count', { n: LANGUAGES.length })
          : picked.length === 1 ? t('picker.one', { name: picked[0].name })
          : t('picker.many', { n: picked.length })}
      </p>
    </div>
  )
}
