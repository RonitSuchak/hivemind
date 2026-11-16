import { createContext, useContext, useState } from 'react'

// The match result and the languages a student says they speak live in memory only. Nothing about the person is saved (BACKEND.md section 8, rule 4).
const Ctx = createContext(null)
export function MatchProvider({ children }) {
  const [match, setMatch] = useState(null)
  const [languages, setLanguages] = useState([]) // language ids, see data/languages.js
  const [siteLang, setSiteLang] = useState('en')  // language the site is shown in (components/Translate.jsx)
  return <Ctx.Provider value={{ match, setMatch, languages, setLanguages, siteLang, setSiteLang }}>{children}</Ctx.Provider>
}
export const useMatch = () => useContext(Ctx)
