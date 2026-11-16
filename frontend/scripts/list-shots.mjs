// Rewrites src/data/shots.js from the JPG files in public/previews. Run from the frontend folder.
import { readdirSync, writeFileSync } from 'node:fs'
const ids = readdirSync('public/previews').filter((f) => f.endsWith('.jpg')).map((f) => f.slice(0, -4)).sort()
writeFileSync('src/data/shots.js', `// Tool ids that have a saved screenshot in public/previews/<id>.jpg. Generated from that folder:
// after adding or removing a screenshot, run  node scripts/list-shots.mjs  (it rewrites this file).
export const SHOTS = new Set([${ids.map((i) => `'${i}'`).join(', ')}])
`)
console.log(`${ids.length} screenshots listed`)
