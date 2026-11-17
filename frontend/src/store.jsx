import { createContext, useContext, useState } from 'react'

// The match result and the languages a student says they speak live in memory only. Nothing about the person is saved (BACKEND.md section 8, rule 4).
const Ctx = createContext(null)
export function MatchProvider({ children }) {
  // An example student's result carries match.example = { id, title }. The real check's result never does, so setting it replaces the example.
  const [match, setMatch] = useState(null)
  const [languages, setLanguages] = useState([]) // language ids, see data/languages.js
  const [siteLang, setSiteLang] = useState('en')  // language the site is shown in (components/Translate.jsx)
  const [pace, setPace] = useState(null)          // { median, count } from the check's quiet timer, or null (at/pace.js). Memory only.
  return <Ctx.Provider value={{ match, setMatch, languages, setLanguages, siteLang, setSiteLang, pace, setPace }}>{children}</Ctx.Provider>
}
export const useMatch = () => useContext(Ctx)
