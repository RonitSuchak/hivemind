import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useStatus } from '../hooks.js'
import Icon from './Icon.jsx'
import { SwapText } from './Swap.jsx'

// "Thinking" line: only used while a real request waits on a sleeping backend.
// The text swaps as the wait goes on; nothing here delays anything.
function Thinking({ label }) {
  const lines = ['Waking up the lab…', `${label}…`, 'Almost there…']
  const [n, setN] = useState(0)
  useEffect(() => {
    if (n >= lines.length - 1) return
    const t = setTimeout(() => setN((x) => x + 1), n === 0 ? 7000 : 9000)
    return () => clearTimeout(t)
  }, [n]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <p className="state-title thinking"><SwapText text={lines[n]} /></p>
      <p className="muted">The lab sleeps when idle. Waking it can take about 30 seconds.</p>
    </>
  )
}

export function Loading({ label = 'Loading' }) {
  const waking = useStatus() === 'waking'
  return (
    <div className="state" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      {waking ? <Thinking label={label} /> : <p className="state-title">{label}…</p>}
    </div>
  )
}

export function ErrorState({ error, onRetry, title = 'That did not work' }) {
  return (
    <div className="state state-error" role="alert">
      <Icon name="warn" size={28} />
      <p className="state-title">{title}</p>
      <p className="muted">{error?.message || 'Something went wrong.'}</p>
      {onRetry && <button className="btn" onClick={onRetry}>Try again</button>}
    </div>
  )
}

export function Empty({ title, children, action }) {
  return (
    <div className="state">
      <p className="state-title">{title}</p>
      {children && <p className="muted">{children}</p>}
      {action}
    </div>
  )
}

// No backend: a calm, designed "unavailable" panel with an empty shape where the data would be.
// Not an error and not loading. The page-level notice (Layout) carries the Retry button.
export function Unavailable({ title = 'Not available yet', shape = 'bars', children }) {
  return (
    <div className="unavailable" role="note">
      <div className={`un-shape un-${shape}`} aria-hidden="true">
        {shape === 'dots' && Array.from({ length: 18 }, (_, i) => <span key={i} />)}
        {shape === 'bars' && Array.from({ length: 3 }, (_, i) => <span key={i}><i>—</i></span>)}
        {shape === 'grid' && Array.from({ length: 20 }, (_, i) => <span key={i}>—</span>)}
        {shape === 'dash' && <b>—</b>}
      </div>
      <div className="un-text">
        <p className="state-title">{title}</p>
        <p className="muted">{children || 'The lab is not connected, so there is nothing to show.'}</p>
      </div>
    </div>
  )
}

// ---------- Skeletons (shown only if loading takes a moment; see .skeleton in app.css) ----------
const Sk = ({ w, h = '1rem', r }) => <span className="sk" style={{ width: w, height: h, borderRadius: r }} />

export function SkeletonLab() {
  return (
    <div className="skeleton" aria-hidden="true">
      <div className="sk-row">{[0, 1, 2, 3].map((i) => <Sk key={i} w="7rem" h="2.75rem" r="999px" />)}</div>
      <Sk w="14rem" h="1.75rem" />
      <div className="sk-dots">{Array.from({ length: 18 }, (_, i) => <Sk key={i} w="44px" h="44px" r="50%" />)}</div>
      <Sk w="60%" /><Sk w="40%" />
    </div>
  )
}
export function SkeletonRatings() {
  return (
    <div className="skeleton" aria-hidden="true">
      <Sk w="16rem" h="1.75rem" /><Sk w="70%" />
      <Sk w="100%" h="12rem" r="10px" />
      <Sk w="14rem" h="1.75rem" />
      <div className="sk-cards"><Sk w="100%" h="8rem" r="10px" /><Sk w="100%" h="8rem" r="10px" /></div>
    </div>
  )
}
export function SkeletonResults() {
  return (
    <div className="skeleton" aria-hidden="true">
      <Sk w="12rem" h="2.125rem" />
      <div className="sk-cards"><Sk w="100%" h="14rem" r="10px" /><Sk w="100%" h="14rem" r="10px" /></div>
      <Sk w="100%" h="7rem" r="10px" /><Sk w="100%" h="7rem" r="10px" />
    </div>
  )
}

// Async: loading -> skeleton (or spinner), then the content cross-fades in over the leaving skeleton.
// An unavailable backend shows `unavailable` (default: a plain panel), anything else the error state.
export function Async({ state, label, skeleton, unavailable, className = '', children }) {
  const status = useStatus()
  const loading = state.status === 'loading'
  const prev = useRef(loading)
  const [fromLoading, setFromLoading] = useState(false)
  const [ghost, setGhost] = useState(false)
  useLayoutEffect(() => {
    const was = prev.current
    prev.current = loading
    if (!was || loading) { if (loading) setFromLoading(false); return }
    setFromLoading(true)
    setGhost(true)
    const t = setTimeout(() => setGhost(false), 400)
    return () => clearTimeout(t)
  }, [loading])

  if (loading) {
    if (!skeleton) return <Loading label={label} />
    return (
      <div className="async">
        {status === 'waking' && <Loading label={label} />}
        {skeleton}
      </div>
    )
  }
  if (state.status === 'error') {
    if (state.error?.unavailable) return unavailable || <Unavailable />
    return <ErrorState error={state.error} onRetry={state.retry} />
  }
  return (
    <div className="async">
      {ghost && skeleton && <div className="async-ghost" aria-hidden="true" inert="">{skeleton}</div>}
      <div className={`async-body ${className} ${fromLoading ? 'async-in' : ''}`}>{children(state.data)}</div>
    </div>
  )
}
