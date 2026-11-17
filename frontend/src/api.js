import { plainWords } from './labels.js'
// One place that talks to the backend (docs/BACKEND.md). Nothing here computes scores or matches.
// Live mode: VITE_API_URL is set and GET /api/health answers.
// Demo mode: VITE_DEMO=1 loads the backend's saved exports from public/demo/ (copied from backend/data/export/).
// Fallback: no VITE_API_URL, or health fails. The site acts like demo mode (status 'demo'), and isFallback()
//   is true so the notice says the lab is not connected. The saved files are real backend exports, except public/demo/topics/
//   (made-up question packs, only used with VITE_DEMO=1). In the fallback the check is not offered: the check page shows a
//   "needs the live lab" card with a link to the saved example result.
const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')
const DEMO = `${import.meta.env.BASE_URL}demo/`
const DEMO_MODE = import.meta.env.VITE_DEMO === '1'

// status: 'checking' | 'waking' | 'live' | 'demo' ('offline' is no longer set; the fallback is 'demo' + fallback: true)
const FALLBACK = { status: 'demo', fallback: true }
const start = () => (DEMO_MODE ? { status: 'demo', fallback: false } : BASE ? { status: 'checking', fallback: false } : FALLBACK)
let state = { ...start(), epoch: 0 }

// Thrown when there is no backend. Pages show a designed "unavailable" state, not an error.
export class Unavailable extends Error {
  constructor() { super('The lab is not connected.'); this.unavailable = true }
}
const listeners = new Set()
function setState(next) {
  state = { ...state, ...next }
  listeners.forEach((l) => l())
}
export const subscribe = (l) => (listeners.add(l), () => listeners.delete(l))
export const getStatus = () => state.status
export const getEpoch = () => state.epoch
// True when the backend could not be reached and saved results are shown instead (not VITE_DEMO=1).
export const isFallback = () => state.fallback

function withTimeout(ms) {
  const c = new AbortController()
  const t = setTimeout(() => c.abort(), ms)
  return { signal: c.signal, done: () => clearTimeout(t) }
}

let ready = null
export function whenReady() {
  if (ready) return ready
  ready = (async () => {
    if (DEMO_MODE) return setState({ status: 'demo', fallback: false })
    if (!BASE) return setState(FALLBACK)
    // Free hosting can sleep for ~30 s: retry only while the server is slow or waking.
    for (let i = 0; i < 6; i++) {
      const t = withTimeout(8000)
      try {
        const res = await fetch(`${BASE}/api/health`, { signal: t.signal })
        t.done()
        if (res.ok && (await res.json()).ok) return setState({ status: 'live', fallback: false })
        setState({ status: 'waking' })
      } catch (e) {
        t.done()
        if (e.name !== 'AbortError') break // refused or blocked: the backend is not there
        setState({ status: 'waking' })
      }
      await new Promise((r) => setTimeout(r, 1500))
    }
    setState(FALLBACK)
  })()
  return ready
}

// "Retry" on the not-connected notice: check the backend again and make every page reload its data.
export function retryConnection() {
  ready = null
  cache.clear()
  setState({ ...start(), epoch: state.epoch + 1 })
  whenReady()
}

const DEMO_FILE = (path) => {
  const p = path.replace(/^\/api\//, '')
  if (p === 'tutors' || p === 'students' || p === 'ratings' || p === 'check' || p === 'real-tools' || p === 'pilot') return `${p}.json`
  if (p === 'validation' || p === 'test' || p === 'submissions') return `${p}.json`
  if (p.startsWith('runs/') || p.startsWith('report/')) return `${p}.json`
  if (p.startsWith('real-tools?student=')) return `real-tools/students/${p.split('=')[1]}.json`
  if (p === 'match') return 'match-example.json'
  return null
}
// Saved data can be read, not written: only the match has a saved example answer. Every other POST needs the live lab.
const NEEDS_LIVE = 'This part needs the live lab, which is not connected right now.'
const needsLive = () => Object.assign(new Error(NEEDS_LIVE), { code: 'needs_live' })

let lastRecheck = 0
async function request(path, options) {
  await whenReady()
  if (state.status === 'offline') throw new Unavailable()
  if (state.status === 'demo') {
    const file = options?.method === 'POST' && path !== '/api/match' ? null : DEMO_FILE(path)
    if (!file) throw needsLive()
    const res = await fetch(DEMO + file)
    if (!res.ok) throw new Error('Could not load the saved results.')
    return res.json()
  }
  let res
  try {
    res = await fetch(BASE + path, {
      ...options,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch {
    // Backend may have died: re-check it (GET only, at most every 10 s). If health fails, the site drops to saved results.
    if (state.status === 'live' && (!options?.method || options.method === 'GET') && Date.now() - lastRecheck > 10000) { lastRecheck = Date.now(); retryConnection() }
    throw new Error('Could not reach the lab. Check your connection and try again.')
  }
  let body = null
  try { body = await res.json() } catch { /* not JSON */ }
  if (!res.ok) {
    // Every backend error is { error: { code, message } } (docs/BACKEND.md section 5, errors). Keep the code so pages can react.
    const err = new Error(body?.error?.message || 'Something went wrong. Please try again.')
    err.code = body?.error?.code
    err.status = res.status
    const wait = Number(res.headers.get('Retry-After'))
    if (err.code === 'rate_limited' && wait > 0) err.retryAfter = wait
    throw err
  }
  return body
}

const cache = new Map()
function get(path) {
  if (!cache.has(path)) {
    const p = request(path).catch((e) => { cache.delete(path); throw e })
    cache.set(path, p)
  }
  return cache.get(path)
}

// Friendly chat (the "cheerleader" demo tool) is not shown anywhere on the site. It is hidden here, once, so every page agrees.
const HIDDEN = new Set(['cheerleader'])
export const isHidden = (id) => HIDDEN.has(id)
const shown = (list) => (Array.isArray(list) ? list.filter((t) => !HIDDEN.has(t.tutor_id)) : list)
// The match, tidied for the site: hidden tools out, ordered by predicted gain, numbered again, and the lab's
// sentences use the type names. Demo tools show no safety rating here (safety is for specific EdTech tools), so the
// lab's safety sentence is dropped. Two things from the lab's safety check are kept all the same:
//   - a tool that failed a check can never be shown in first place (the best tool that passed goes first);
//   - a tool that failed a check gets no "try it" link.
function tidyMatch(m) {
  if (!m || !Array.isArray(m.ranked)) return m
  const byGain = shown(m.ranked)
    .map((t) => (t.safety_warning ? { ...t, failed: true, safety_warning: null, why: '', try_url: null } : { ...t, failed: false, why: plainWords(t.why) }))
    .sort((a, b) => b.predicted_gain - a.predicted_gain)
  const firstPassed = byGain.findIndex((t) => !t.failed)
  if (firstPassed > 0) byGain.unshift(...byGain.splice(firstPassed, 1))
  const ranked = byGain.map(({ failed, ...t }, i) => ({ ...t, rank: i + 1 })) // eslint-disable-line no-unused-vars
  return {
    ...m, ranked,
    follow_ups: (m.follow_ups || []).filter((q) => q.id !== 'careful').map((q) => ({ ...q, question: plainWords(q.question), answer: plainWords(q.answer) })),
    note: plainWords(m.note || '').replace(/\b\d+ tools tested\.?/, `${ranked.length} demo tools tested.`),
    message: plainWords(m.message),
  }
}
export const getTutors = () => get('/api/tutors').then(shown)
export const getStudents = () => get('/api/students')
export const getRun = (id) => get(`/api/runs/${encodeURIComponent(id)}`)
export const getRatings = () => get('/api/ratings').then((r) => ({ ...r, rows: shown(r.rows), note: plainWords(r.note) }))
export const getCheck = () => get('/api/check')
// Real EdTech products, each linked to the demo tool type it most resembles. Never tested, never scored.
export const getRealTools = () => get('/api/real-tools')
// A small hand-relayed pilot of real EdTech products (3 simulated students). Never mixed into ratings or the match.
export const getPilot = () => get('/api/pilot')
// Tool maker report for one demo tool: which groups learned less, why, and example chats (docs/BACKEND.md 5.6).
export const getReport = (id) => get(`/api/report/${encodeURIComponent(id)}`)
// Real tools for ONE simulated student, already ordered and filtered by the lab (5.19): { types, best, tools }.
export const getStudentTools = (id) => get(`/api/real-tools?student=${encodeURIComponent(id)}`)
// Real-classmate check (5.11 to 5.14). The list is not cached: it grows as people take part.
export const getTest = () => get('/api/test')
export const getValidation = () => request('/api/validation')
export const postTestScore = (body) => request('/api/test/score', { method: 'POST', body: JSON.stringify(body) })
export const postValidation = (body) => request('/api/validation', { method: 'POST', body: JSON.stringify(body) })
// Live lab (5.21). Live: an EventSource address, or null when the lab is not connected. Saved: the same events as
// a list, shipped with the site, so a replay always works (0 AI calls).
export const isLive = () => state.status === 'live'
export const liveLabUrl = ({ tutorId, students, mode = 'live', delay } = {}) => {
  if (state.status !== 'live') return null
  const q = new URLSearchParams({ tutor_id: tutorId, mode })
  if (students?.length) q.set('students', students.join(','))
  if (delay != null) q.set('delay', String(delay))
  return `${BASE}/api/live-lab?${q}`
}
export const getLiveLabSaved = (tutorId) => fetch(`${DEMO}live-lab/${encodeURIComponent(tutorId)}.json`).then((r) => {
  if (!r.ok) throw new Error('No saved lesson for this demo tool.')
  return r.json()
})
export const postMatch = (answers) => request('/api/match', { method: 'POST', body: JSON.stringify(answers) }).then(tidyMatch)
// The suggestion box (components/SuggestBox.jsx): { kind: 'tool' | 'measure' | 'feature', text }. Needs the live lab.
export const postSuggestion = (body) => request('/api/suggestions', { method: 'POST', body: JSON.stringify(body) })
export const postChat = (body) => request('/api/chat', { method: 'POST', body: JSON.stringify(body) })
