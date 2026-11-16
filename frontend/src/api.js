// One place that talks to the backend (docs/BACKEND.md). Nothing here computes scores or matches.
// Live mode: VITE_API_URL is set and GET /api/health answers.
// Offline: no VITE_API_URL, or health fails. There is NO fallback to made-up data:
//   every page shows an "unavailable" state instead.
// Demo mode: VITE_DEMO=1 loads the backend's saved exports from public/demo/ (copied from backend/data/export/).
const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')
const DEMO = `${import.meta.env.BASE_URL}demo/`
const DEMO_MODE = import.meta.env.VITE_DEMO === '1'

// status: 'checking' | 'waking' | 'live' | 'offline' | 'demo'
let state = { status: DEMO_MODE ? 'demo' : BASE ? 'checking' : 'offline', epoch: 0 }

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

function withTimeout(ms) {
  const c = new AbortController()
  const t = setTimeout(() => c.abort(), ms)
  return { signal: c.signal, done: () => clearTimeout(t) }
}

let ready = null
export function whenReady() {
  if (ready) return ready
  ready = (async () => {
    if (DEMO_MODE) return setState({ status: 'demo' })
    if (!BASE) return setState({ status: 'offline' })
    // Free hosting can sleep for ~30 s: retry only while the server is slow or waking.
    for (let i = 0; i < 6; i++) {
      const t = withTimeout(8000)
      try {
        const res = await fetch(`${BASE}/api/health`, { signal: t.signal })
        t.done()
        if (res.ok && (await res.json()).ok) return setState({ status: 'live' })
        setState({ status: 'waking' })
      } catch (e) {
        t.done()
        if (e.name !== 'AbortError') break // refused or blocked: the backend is not there
        setState({ status: 'waking' })
      }
      await new Promise((r) => setTimeout(r, 1500))
    }
    setState({ status: 'offline' })
  })()
  return ready
}

// "Retry" on the not-connected notice: check the backend again and make every page reload its data.
export function retryConnection() {
  ready = null
  cache.clear()
  setState({ status: DEMO_MODE ? 'demo' : BASE ? 'checking' : 'offline', epoch: state.epoch + 1 })
  whenReady()
}

const DEMO_FILE = (path) => {
  const p = path.replace(/^\/api\//, '')
  if (p === 'tutors' || p === 'students' || p === 'ratings' || p === 'check') return `${p}.json`
  if (p.startsWith('runs/')) return `${p}.json`
  if (p === 'match') return 'match-example.json'
  return null
}

async function request(path, options) {
  await whenReady()
  if (state.status === 'offline') throw new Unavailable()
  if (state.status === 'demo') {
    const file = DEMO_FILE(path)
    if (!file) throw new Error('This part needs the live lab, which is not connected right now.')
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
    throw new Error('Could not reach the lab. Check your connection and try again.')
  }
  let body = null
  try { body = await res.json() } catch { /* not JSON */ }
  if (!res.ok) throw new Error(body?.error?.message || 'Something went wrong. Please try again.')
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

export const getTutors = () => get('/api/tutors')
export const getStudents = () => get('/api/students')
export const getRun = (id) => get(`/api/runs/${encodeURIComponent(id)}`)
export const getRatings = () => get('/api/ratings')
export const getCheck = () => get('/api/check')
export const postMatch = (answers) => request('/api/match', { method: 'POST', body: JSON.stringify(answers) })
