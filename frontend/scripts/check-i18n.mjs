// Checks the Russian and Hindi word lists (src/i18n/pages/*.json) against the English keys.
//   node scripts/check-i18n.mjs            checks every entry keeps its slots ({n0}, {d0}...) and [[ ]] marks
//   node scripts/check-i18n.mjs keys.json  also lists keys from that file that have no translation yet
import fs from 'node:fs'
import { sameShape } from '../src/i18n/units.js'
const want = process.argv[2] ? Object.keys(JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))) : null
let bad = 0
for (const lang of ['ru', 'hi']) {
  const list = JSON.parse(fs.readFileSync(new URL(`../src/i18n/pages/${lang}.json`, import.meta.url), 'utf8'))
  const wrong = Object.entries(list).filter(([k, v]) => typeof v !== 'string' || !v.trim() || !sameShape(k, v))
  for (const [k, v] of wrong.slice(0, 40)) console.log(`${lang}: slots or marks differ\n  en: ${k}\n  ${lang}: ${v}`)
  const missing = want ? want.filter((k) => !(k in list)) : []
  console.log(`${lang}: ${Object.keys(list).length} entries, ${wrong.length} with the wrong shape${want ? `, ${missing.length} of ${want.length} keys missing` : ''}`)
  if (missing.length) fs.writeFileSync(`missing-${lang}.json`, JSON.stringify(missing, null, 1))
  bad += wrong.length
}
process.exit(bad ? 1 : 0)
