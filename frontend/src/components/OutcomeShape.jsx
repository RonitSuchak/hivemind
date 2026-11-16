import { useId } from 'react'
import { OUTCOME } from '../labels.js'

// One shape family: a five-point star at three fill levels. It never relies on colour alone.
//   learned (Big gain):    solid star in the orange highlight.
//   a_little (Small gain): midnight outline with the left half filled.
//   left_behind (No gain): small, thin, hollow outline in the quiet grey.
// Same markup, props and `.oshape` hooks as before (key-based swaps still animate).
const STAR = 'M22 4.2l5.1 10.6 11.6 1.6-8.4 8.1 2.1 11.5L22 30.5l-10.4 5.5 2.1-11.5-8.4-8.1 11.6-1.6z'

export function OutcomeShape({ outcome, size = 44, className = '' }) {
  const clip = useId().replace(/:/g, '')
  return (
    <svg className={`oshape o-${outcome} ${className}`} width={size} height={size} viewBox="0 0 44 44" aria-hidden="true" focusable="false">
      {outcome === 'learned' && <path d={STAR} className="o-star" />}
      {outcome === 'a_little' && (<>
        <defs><clipPath id={clip}><rect x="0" y="0" width="22" height="44" /></clipPath></defs>
        <path d={STAR} className="o-star-half" clipPath={`url(#${clip})`} />
        <path d={STAR} className="o-star" />
      </>)}
      {outcome === 'left_behind' && <path d={STAR} className="o-star" transform="translate(22 23) scale(0.78) translate(-22 -23)" />}
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
