import { useId, useMemo, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import { LANGUAGES } from '../data/languages.js'
import { useMatch } from '../store.jsx'
import { BETA, useT } from '../i18n/index.js'

// The site's language: one box you type in, with a list that shows which languages the site is translated into.
// Only translated languages (English, Russian, Hindi: i18n/) can be picked. The rest are listed as
// "Not translated yet" so nobody picks one and gets an English page. Remembered on this device (store.jsx, hm-lang).
const done = (l) => BETA.includes(l.id)
const matches = (l, q) => l.name.toLowerCase().split(' ').some((w) => w.startsWith(q)) || l.own.toLowerCase().startsWith(q)
  || (q.length >= 3 && l.name.toLowerCase().includes(q))
const ORDER = [...LANGUAGES.filter(done), ...LANGUAGES.filter((l) => !done(l))] // translated first

export default function LanguagePicker() {
  const id = useId()
  const t = useT()
  const { siteLang, setSiteLang, setLanguages } = useMatch()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const input = useRef(null)
  const q = query.trim().toLowerCase()
  const shown = useMemo(() => (q ? ORDER.filter((l) => matches(l, q)) : ORDER).slice(0, 12), [q])
  const current = LANGUAGES.find((l) => l.id === siteLang) || LANGUAGES.find((l) => l.id === 'en')

  const pick = (l) => {
    if (!l || !done(l)) return
    setSiteLang(l.id)
    setLanguages(l.id === 'en' ? [] : [l.id])
    setQuery(''); setOpen(false)
  }
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(shown.length - 1, a + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (open) pick(shown[active]) }
    else if (e.key === 'Escape') { if (open || query) { e.preventDefault(); setOpen(false); setQuery('') } }
  }
  const optId = (i) => `${id}-opt-${i}`

  return (
    <div className="lg" data-no-translate>
      <div className="lg-box">
        <Icon name="chat" size={20} />
        <label className="sr-only" htmlFor={`${id}-in`}>{t('picker.search')}</label>
        <input id={`${id}-in`} ref={input} className="lg-input" type="text" autoComplete="off" spellCheck="false"
          role="combobox" aria-expanded={open} aria-controls={`${id}-list`} aria-autocomplete="list"
          aria-activedescendant={open && shown[active] ? optId(active) : undefined}
          placeholder={t('picker.placeholder')} value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0) }}
          onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onKeyDown={onKey} />
        {query && <button type="button" className="lg-clear" aria-label={t('picker.clear')} onMouseDown={(e) => e.preventDefault()} onClick={() => { setQuery(''); input.current?.focus() }}><Icon name="close" size={16} /></button>}
      </div>
      {open && (
        <ul className="lg-list" id={`${id}-list`} role="listbox" aria-label={t('picker.list')}>
          {shown.map((l, i) => (
            <li key={l.id} id={optId(i)} role="option" className="lg-opt" aria-selected={l.id === current.id}
              aria-disabled={!done(l) || undefined} data-active={i === active ? '' : undefined}
              onMouseDown={(e) => e.preventDefault()} onMouseEnter={() => setActive(i)} onClick={() => pick(l)}>
              <span className="lg-opt-name">{l.name}{l.own !== l.name && <i lang={l.id}> {l.own}</i>}</span>
              <span className="lg-tag" data-done={done(l) ? '' : undefined}>{done(l) ? t('picker.translated') : t('picker.notYet')}</span>
            </li>
          ))}
          {shown.length === 0 && <li className="lg-opt lg-opt-none" role="option" aria-disabled="true">{t('picker.noMatch')}</li>}
        </ul>
      )}
      <p className="lg-status" role="status">{t('picker.current', { name: current.own })}</p>
    </div>
  )
}
