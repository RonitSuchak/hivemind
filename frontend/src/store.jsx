import { createContext, useContext, useState } from 'react'

// The match result lives in memory only. Nothing about the person is saved (BACKEND.md section 8, rule 4).
// One thing is remembered on this device: the language the site is shown in, so a reload keeps it.
const savedLang = () => { try { return localStorage.getItem('hm-lang') || 'en' } catch { return 'en' } }
const Ctx = createContext(null)
export function MatchProvider({ children }) {
  // An example student's result carries match.example = { id, title }. The real check's result never does, so setting it replaces the example.
  const [match, setMatch] = useState(null)
  const [siteLang, setLang] = useState(savedLang)  // language the site is shown in (components/Translate.jsx)
  const [languages, setLanguages] = useState(() => (savedLang() === 'en' ? [] : [savedLang()])) // language ids, see data/languages.js
  const setSiteLang = (id) => { setLang(id); try { localStorage.setItem('hm-lang', id) } catch { /* private window */ } }
  const [pace, setPace] = useState(null)          // { median, count } from the check's quiet timer, or null (at/pace.js). Memory only.
  return <Ctx.Provider value={{ match, setMatch, languages, setLanguages, siteLang, setSiteLang, pace, setPace }}>{children}</Ctx.Provider>
}
export const useMatch = () => useContext(Ctx)
