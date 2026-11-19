import { createContext, useContext, useState } from 'react'

// The match result lives in memory, unless the person presses "Save my results on this device": then it is kept in
// this browser's local storage (key hm-saved) until they press Delete or clear the site's data. Nothing is sent anywhere
// by saving, and it is never a cookie. The saved copy holds the lab's answer (profile numbers, matched simulated students,
// ranking), the subject chosen and the "tools you use now" answers: never the raw quiz answers.
// Also remembered on this device: the language the site is shown in (hm-lang) and the colour scheme (at-ground).
const read = (k) => { try { return localStorage.getItem(k) } catch { return null } }
const write = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); return true } catch { return false } }
const savedLang = () => read('hm-lang') || 'en'
const SAVE_KEY = 'hm-saved'
const SAVE_VERSION = 1
function loadSaved() {
  try {
    const s = JSON.parse(read(SAVE_KEY) || 'null')
    return s && s.v === SAVE_VERSION && s.match && !s.match.example ? s : null
  } catch { return null }
}

const Ctx = createContext(null)
export function MatchProvider({ children }) {
  const [saved, setSaved] = useState(loadSaved) // { v, at, match, pace } or null
  // An example student's result carries match.example = { id, title }. The real check's result never does, so setting it replaces the example.
  const [match, setMatch] = useState(() => saved?.match ?? null)
  const [siteLang, setLang] = useState(savedLang)  // language the site is shown in (components/Translate.jsx)
  const [languages, setLanguages] = useState(() => (savedLang() === 'en' ? [] : [savedLang()])) // language ids, see data/languages.js
  const setSiteLang = (id) => { setLang(id); write('hm-lang', id) }
  const [pace, setPace] = useState(() => saved?.pace ?? null) // { median, count } from the check's quiet timer, or null (at/pace.js)

  // Save the result on screen. Example results are never saved as the person's own.
  const saveMatch = (m = match) => {
    if (!m || m.example) return false
    const s = { v: SAVE_VERSION, at: new Date().toISOString(), match: m, pace }
    if (!write(SAVE_KEY, JSON.stringify(s))) return false
    setSaved(s)
    return true
  }
  const forgetSaved = () => { write(SAVE_KEY, null); setSaved(null) }
  // Changing the result on screen (for example the "tools you use" answers) keeps a saved copy of the same result up to date.
  const updateMatch = (m) => {
    setMatch(m)
    if (saved && m?.match_id && saved.match?.match_id === m.match_id && !m.example) {
      const s = { ...saved, match: m }
      if (write(SAVE_KEY, JSON.stringify(s))) setSaved(s)
    }
  }

  return (
    <Ctx.Provider value={{ match, setMatch: updateMatch, languages, setLanguages, siteLang, setSiteLang, pace, setPace, saved, saveMatch, forgetSaved }}>
      {children}
    </Ctx.Provider>
  )
}
export const useMatch = () => useContext(Ctx)
