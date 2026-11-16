// Spring presets and motion tokens for Motion for React, read from tokens.css at call time
// (never at module load: the CSS is not applied yet then). Change the feel in tokens.css only.
import { useReducedMotion as useMotionReduced } from 'motion/react'

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()
const num = (v, fallback) => { const n = parseFloat(v); return Number.isFinite(n) ? n : fallback }
const px = (name, fallback) => num(css(name), fallback)
const ms = (name, fallback) => {
  const v = css(name), n = parseFloat(v)
  if (!Number.isFinite(n)) return fallback
  return /ms$/.test(v) ? n : /s$/.test(v) ? n * 1000 : n
}

// spring('ui') -> { type: 'spring', visualDuration, bounce } from --spring-ui: "<seconds> <bounce>"
export function spring(name = 'ui', extra = {}) {
  const [d, b] = css(`--spring-${name}`).split(/\s+/).map(Number)
  return { type: 'spring', visualDuration: Number.isFinite(d) ? d : 0.35, bounce: Number.isFinite(b) ? b : 0, ...extra }
}

// Reveal values (rise in px, blur in px, stagger in seconds, viewport margin) from tokens.
export function revealTokens() {
  return {
    rise: px('--reveal-rise', 14),
    blur: px('--reveal-blur', 6),
    stagger: ms('--reveal-stagger', 70) / 1000,
    margin: css('--reveal-margin') || '0px 0px -12% 0px',
  }
}

export const tokenPx = px
export const tokenS = (name, fallback) => ms(name, fallback * 1000) / 1000

// True when the user asked for reduced motion (Motion's hook, reacts to changes).
export const useReduced = () => !!useMotionReduced()
