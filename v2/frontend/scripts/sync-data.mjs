// Copies the backend's saved results into the website, so the site works with no backend running.
// Source: backend/data/export at the top of the repo (made by `python -m app.export`). Target: v2/frontend/public/data.
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const from = resolve(here, '../../../backend/data/export')
const to = resolve(here, '../public/data')

if (!existsSync(from)) {
  console.error(`No saved results at ${from}. Run the backend export first.`)
  process.exit(existsSync(to) ? 0 : 1)
}
rmSync(to, { recursive: true, force: true })
mkdirSync(to, { recursive: true })
cpSync(from, to, { recursive: true })
console.log('Saved results copied to public/data')
