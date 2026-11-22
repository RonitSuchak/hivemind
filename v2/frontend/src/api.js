// Data loading. The site reads saved results from /data by default, so it always works.
// If VITE_API_URL points at a running backend, it asks that first and falls back to saved results.
import { useEffect, useState } from 'react'

export const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
const cache = new Map()

async function fetchJson(url, options = {}, ms = 8000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    const body = await res.json().catch(() => null)
    if (!res.ok) {
      const err = new Error(body?.error?.message || `Request failed (${res.status}).`)
      err.code = body?.error?.code
      err.status = res.status
      throw err
    }
    return body
  } finally {
    clearTimeout(timer)
  }
}

// name is a saved-result path such as 'pilot', 'ratings' or 'runs/socratic'.
export function load(name) {
  if (!cache.has(name)) {
    const saved = () => fetchJson(`${import.meta.env.BASE_URL}data/${name}.json`)
    const request = API && !name.startsWith('check-test') && !name.startsWith('match')
      ? fetchJson(`${API}/api/${name}`, {}, 5000).catch(saved)
      : saved()
    cache.set(name, request.catch((err) => { cache.delete(name); throw err }))
  }
  return cache.get(name)
}

export function post(path, body) {
  return fetchJson(`${API}/api/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }, 30000)
}

// Loads one or more saved results. names must be a stable list, e.g. useData('pilot', 'ratings').
export function useData(...names) {
  const key = names.join('|')
  const [state, setState] = useState({ data: null, error: null, loading: true })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let live = true
    setState({ data: null, error: null, loading: true })
    Promise.all(key.split('|').map(load))
      .then((data) => live && setState({ data, error: null, loading: false }))
      .catch((error) => live && setState({ data: null, error, loading: false }))
    return () => { live = false }
  }, [key, attempt])
  return { ...state, retry: () => setAttempt((n) => n + 1) }
}

// 'checking' | 'live' | 'saved'. Live means a backend answered /api/health.
let health
export function useBackend() {
  const [status, setStatus] = useState(API ? 'checking' : 'saved')
  useEffect(() => {
    if (!API) return
    health ||= fetchJson(`${API}/api/health`, {}, 4000).then((h) => (h?.ok ? 'live' : 'saved')).catch(() => 'saved')
    let on = true
    health.then((s) => on && setStatus(s))
    return () => { on = false }
  }, [])
  return status
}
