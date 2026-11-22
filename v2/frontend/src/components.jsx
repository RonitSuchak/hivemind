import { useEffect } from 'react'
import { MOVES, fmtScore, tidy } from './lib.js'

export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Hivemind` : 'Hivemind: a crash test for AI tutors'
  }, [title])
}

// The crash-test target: a circle in four quarters. Hivemind's mark.
export function Marker({ size = 22, className = 'marker' }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <circle cx="16" cy="16" r="15" fill="#0c0d0f" />
      <path d="M16 16V2a14 14 0 0 1 14 14z" fill="#ffd60a" />
      <path d="M16 16v14A14 14 0 0 1 2 16z" fill="#ffd60a" />
      <circle cx="16" cy="16" r="14" fill="none" stroke="#ffd60a" strokeWidth="2" />
    </svg>
  )
}

const Tick = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3.2L13 4.8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
)
const Cross = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
)
export const Arrow = () => (
  <svg className="arrow" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9M8.5 4.5L12 8l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
)

// Pass or fail, always with an icon and words, never colour alone.
export function Verdict({ passed, tested, passText, failText }) {
  if (!tested) return <span className="verdict none">Not tested</span>
  const ok = passed === tested
  return (
    <span className={`verdict ${ok ? 'pass' : 'fail'}`}>
      {ok ? <Tick /> : <Cross />}
      {ok ? passText || `Passed ${passed} of ${tested}` : failText || `Failed ${tested - passed} of ${tested}`}
    </span>
  )
}

export function Flag({ ok, children }) {
  return <span className={`verdict ${ok ? 'pass' : 'fail'}`}>{ok ? <Tick /> : <Cross />}{children}</span>
}

// One score out of 5: the number, and a bar that repeats it.
export function Score({ value, label }) {
  const tone = value >= 4 ? 'high' : value <= 2 ? 'low' : ''
  return (
    <div className="score">
      <span className="score-num">
        {fmtScore(value)}<small> / 5</small>
        {label && <span className="sr-only"> {label}</span>}
      </span>
      <div className={`bar ${tone}`} aria-hidden="true"><i style={{ '--v': Math.max(0, Math.min(1, value / 5)) }} /></div>
    </div>
  )
}

export function Loading({ height = 320, label = 'Loading results…' }) {
  return (
    <div className="skeleton" style={{ '--h': `${height}px` }} role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
    </div>
  )
}

export function Failed({ error, retry }) {
  return (
    <div className="banner error" role="alert">
      <p><strong>The results did not load.</strong> {error?.message || 'Something went wrong.'}</p>
      {retry && <p style={{ marginTop: 12 }}><button type="button" className="btn" onClick={retry}>Try again</button></p>}
    </div>
  )
}

// A saved lesson, shown as a chat. flaggedTurns marks the tool replies that failed a safety check.
export function Transcript({ lines = [], studentName = 'Student', toolName = 'Tool', flaggedTurns = [] }) {
  if (!lines.length) return <p className="muted">No lesson was saved for this student.</p>
  return (
    <ol className="chat">
      {lines.map((line, i) => {
        const tutor = line.from === 'tutor'
        const flagged = tutor && flaggedTurns.includes(line.turn)
        const move = tutor && line.move ? MOVES[line.move] || line.move.replaceAll('_', ' ') : null
        return (
          <li key={i} className={`msg ${tutor ? 'tutor' : 'student'}${flagged ? ' flagged' : ''}`}>
            <span className="msg-meta">
              {tutor ? toolName : studentName}
              {move && ` · ${move}`}
              {tutor && line.reading_age ? ` · reading age ${Math.round(line.reading_age)}` : ''}
              {flagged && ' · failed a safety check'}
            </span>
            {tidy(line.text)}
          </li>
        )
      })}
    </ol>
  )
}
