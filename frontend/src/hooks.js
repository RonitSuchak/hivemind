import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getEpoch, getStatus, subscribe } from './api.js'

export const useStatus = () => useSyncExternalStore(subscribe, getStatus)
const useEpoch = () => useSyncExternalStore(subscribe, getEpoch)

// Loads once per deps change. Returns { status: 'loading'|'ok'|'error', data, error, retry }.
export function useLoad(loader, deps = []) {
  const [s, setS] = useState({ status: 'loading' })
  const [n, setN] = useState(0)
  const epoch = useEpoch() // bumps when the user presses Retry on the not-connected notice
  useEffect(() => {
    let live = true
    setS((p) => (p.status === 'ok' ? { ...p, stale: true } : { status: 'loading' }))
    loader()
      .then((data) => live && setS({ status: 'ok', data }))
      .catch((error) => live && setS({ status: 'error', error }))
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, n, epoch])
  return { ...s, retry: () => { setS({ status: 'loading' }); setN((x) => x + 1) } }
}

export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Hivemind` : 'Hivemind'
  }, [title])
}

export function useReducedMotion() {
  const [r, setR] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setR(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return r
}

// Reads a duration token (e.g. --dur-tip-delay) in ms, so JS timing follows tokens.css.
export function tokenMs(name, fallback = 0) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  const n = parseFloat(v)
  if (!Number.isFinite(n)) return fallback
  return /ms$/.test(v) ? n : /s$/.test(v) ? n * 1000 : n
}

// True once the element has scrolled into view. `early` = it was already in view when the page opened.
export function useInView({ margin = '0px 0px -6% 0px' } = {}) {
  const ref = useRef(null)
  const [s, setS] = useState({ inView: false, early: false })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') { setS({ inView: true, early: true }); return }
    const t0 = performance.now()
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      setS({ inView: true, early: performance.now() - t0 < 400 })
      io.disconnect()
    }, { rootMargin: margin })
    io.observe(el)
    return () => io.disconnect()
  }, [margin])
  return [ref, s.inView, s.early]
}

// One address parameter that opens something (a panel). Opening adds a history entry, so Back closes it and the
// address can be shared. Closing steps back when this page opened it, otherwise it just removes the parameter.
export function useOpenParam(name) {
  const [sp, setSp] = useSearchParams()
  const nav = useNavigate()
  const pushed = useRef(false)
  const value = sp.get(name)
  useEffect(() => { if (value == null) pushed.current = false }, [value])
  const put = (v, push) => setSp((prev) => { const n = new URLSearchParams(prev); if (v == null) n.delete(name); else n.set(name, v); return n }, { replace: !push })
  const open = (v) => { pushed.current = value == null; put(v, true) }
  const close = () => { if (pushed.current) { pushed.current = false; nav(-1) } else put(null, false) }
  return [value, open, close]
}
