import { OUTCOME } from '../labels.js'

// One star, always the same size. The outline is the full star. Inside it sits a smaller copy of the same
// star, growing from the middle: nothing at 0 points, the whole star at FULL_AT points or more.
// The small star grows by area, so even a gain of 1 point is easy to see (1 point is about 45% as wide as the outline).
//   learned (Big gain):      orange.
//   a_little (Small gain):   ink (navy on white, white on midnight).
//   left_behind (Left behind): quiet grey outline.
// Colour is never the only clue: the size of the inner star and the outline carry the meaning too.
// A student who gave up has the same star as anyone else, plus a small flag next to it (see GaveUpFlag).
// With no `gain` (category tags, summaries) a typical size is used: learned full, a_little 30%, left_behind empty.
// Markup hooks (`.oshape`, `.o-<outcome>`, `.o-star`, `.o-star-half`, `.o-gaveup`) are kept so replay animations and other pages still work.
const STAR = 'M22 4.2l5.1 10.6 11.6 1.6-8.4 8.1 2.1 11.5L22 30.5l-10.4 5.5 2.1-11.5-8.4-8.1 11.6-1.6z'
export const FULL_AT = 5 // points gained that fill the star completely
const TYPICAL = { learned: 1, a_little: 0.3, left_behind: 0 }

const fillOf = (outcome, gain) => {
  // A real gain always shows, even for a student who then gave up: the inner star is the points, nothing else.
  if (typeof gain === 'number' && Number.isFinite(gain)) return Math.min(Math.max(gain, 0), FULL_AT) / FULL_AT
  return TYPICAL[outcome] ?? 0
}

export function OutcomeShape({ outcome, size = 44, className = '', gain, gaveUp = false }) {
  const k = Math.sqrt(fillOf(outcome, gain)) // width of the inner star compared with the outline
  return (
    <svg className={`oshape o-${outcome}${gaveUp ? ' o-gaveup' : ''} ${className}`} width={size} height={size} viewBox="0 0 44 44" aria-hidden="true" focusable="false">
      {/* the inner star is scaled about the star's middle (22, 21.8) */}
      {k > 0 && <path d={STAR} className="o-star-half" transform={`translate(22 21.8) scale(${k}) translate(-22 -21.8)`} />}
      <path d={STAR} className="o-star" />
    </svg>
  )
}

// A small flag for a student who gave up. It uses --ink, so it is white on the midnight ground and dark on white.
export function GaveUpFlag({ className = '' }) {
  return (
    <svg className={`gaveup-flag ${className}`.trim()} width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <line x1="3" y1="2" x2="3" y2="14" stroke="var(--ink)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3 2.5h9.5l-2.5 3 2.5 3H3z" fill="var(--ink)" />
    </svg>
  )
}

export function OutcomeTag({ outcome }) {
  return (
    <span className="outcome-tag">
      <OutcomeShape outcome={outcome} size={18} />
      {OUTCOME[outcome] || outcome}
    </span>
  )
}
