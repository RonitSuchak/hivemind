import { useEffect } from 'react'

// One shared state and one render loop for the whole site (design doc 2.3 and 10.4).
// Input events only write targets here. Everything that moves (scroll, nav, shader, trails) reads the
// same state once per frame, so the effects stay in step and never fight each other.
export const state = {
  time: 0, dt: 0.016, rawDt: 0.016,
  scrollPosition: 0,      // px
  scrollVelocity: 0,      // px per second, smoothed
  vel: 0,                 // scroll velocity as -1..1 (doc 4.3: d = clamp(k v, -dmax, dmax))
  pointerX: 0, pointerY: 0, // normalised -1..1, y up (doc 7.1)
  px: -9999, py: -9999,   // raw pointer, px
  sx: -9999, sy: -9999,   // smoothed pointer, px
  pointerOn: false,
  transitionProgress: 0,  // 1 right after a page change, eases back to 0
  qualityLevel: 'high',
  ground: 'white',        // 'white' or 'midnight' (at/ground.js)
  reduced: false,
}

// Frame-independent damping (doc 4.2): alpha = 1 - e^(-lambda dt). Same speed at 60 Hz and 120 Hz.
export const damp = (cur, target, lambda, dt) => cur + (target - cur) * (1 - Math.exp(-lambda * dt))
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

const subs = new Set()
export function subscribe(fn) { subs.add(fn); return () => subs.delete(fn) }

// Smooth scroll: the wheel moves a target, the page eases to it.
let target = 0, pos = 0, gliding = false
export function stopScroll() { gliding = false }
let running = false
// Glide the page to a position (chapter jumps). Goes through the same loop as the wheel, so they never fight.
export function glideTo(y) {
  if (!running) { window.scrollTo(0, y); return }
  const max = document.documentElement.scrollHeight - window.innerHeight
  pos = window.scrollY; target = clamp(y, 0, max); gliding = true
}
export function pulseTransition() { state.transitionProgress = 1 }

const SCROLL_LAMBDA = 9      // higher = the page catches up sooner
const VEL_FULL = 2600        // px/s that counts as "full speed" (vel = 1)

// True when something between the pointer and the page can itself scroll this way.
function innerScroller(node, dy) {
  for (let el = node; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
    if (el.scrollHeight <= el.clientHeight + 1) continue
    const o = getComputedStyle(el).overflowY
    if (o !== 'auto' && o !== 'scroll') continue
    if (dy < 0 ? el.scrollTop > 0 : el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true
  }
  return false
}

function start(weight) {
  state.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (state.reduced) return () => {}
  let raf = 0, last = 0, prevY = window.scrollY

  const onWheel = (e) => {
    if (e.ctrlKey || e.metaKey || e.defaultPrevented) return
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
    if (document.body.style.overflow === 'hidden') return // a drawer or panel is open
    if (e.target instanceof Element && innerScroller(e.target, e.deltaY)) return
    const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY
    e.preventDefault()
    if (!gliding) { pos = window.scrollY; target = pos; gliding = true }
    const max = document.documentElement.scrollHeight - window.innerHeight
    target = clamp(target + dy * weight, 0, max)
  }
  const onMove = (e) => {
    state.px = e.clientX; state.py = e.clientY
    if (!state.pointerOn) { state.sx = e.clientX; state.sy = e.clientY }
    state.pointerOn = e.pointerType !== 'touch'
    state.pointerX = (2 * e.clientX) / window.innerWidth - 1
    state.pointerY = 1 - (2 * e.clientY) / window.innerHeight
  }
  const onLeave = () => { state.pointerOn = false }

  const tick = (now) => {
    raf = requestAnimationFrame(tick)
    const rawDt = last ? (now - last) / 1000 : 0.016
    last = now
    const dt = clamp(rawDt, 0.001, 0.05)
    state.rawDt = rawDt; state.dt = dt; state.time += dt

    if (gliding) {
      pos = damp(pos, target, SCROLL_LAMBDA, dt)
      if (Math.abs(target - pos) < 0.4) { pos = target; gliding = false }
      window.scrollTo({ top: pos, behavior: 'instant' })
    }
    const y = window.scrollY
    const v = rawDt < 0.25 ? (y - prevY) / dt : 0   // doc 4.3: v = (s_t - s_t-1) / dt
    prevY = y
    state.scrollPosition = y
    state.scrollVelocity = damp(state.scrollVelocity, v, 10, dt)
    state.vel = clamp(state.scrollVelocity / VEL_FULL, -1, 1)
    state.sx = damp(state.sx, state.px, 9, dt)
    state.sy = damp(state.sy, state.py, 9, dt)
    state.transitionProgress = damp(state.transitionProgress, 0, 2.2, dt)

    subs.forEach((fn) => fn(state))
  }

  window.addEventListener('wheel', onWheel, { passive: false })
  window.addEventListener('pointermove', onMove, { passive: true })
  document.documentElement.addEventListener('pointerleave', onLeave)
  window.addEventListener('blur', onLeave)
  // Anything else that scrolls the page takes over at once.
  const others = ['pointerdown', 'keydown', 'touchstart']
  others.forEach((t) => window.addEventListener(t, stopScroll, { passive: true }))
  raf = requestAnimationFrame(tick)
  running = true

  return () => {
    running = false
    cancelAnimationFrame(raf)
    window.removeEventListener('wheel', onWheel)
    window.removeEventListener('pointermove', onMove)
    document.documentElement.removeEventListener('pointerleave', onLeave)
    window.removeEventListener('blur', onLeave)
    others.forEach((t) => window.removeEventListener(t, stopScroll))
    gliding = false
  }
}

export function useEngine(weight = 0.8) {
  useEffect(() => start(weight), [weight])
}

// Velocity-responsive element (doc 4.3 + 4.4): scroll speed is the target of a spring-damper
// (m x'' + c x' + k (x - xt) = 0), so the element leans while you scroll and rebounds when you stop.
export function useVelocityLean(ref, { lift = 9, skew = 13, stretch = 0.16, k = 130, c = 13 } = {}) {
  useEffect(() => {
    let x = 0, v = 0, still = true
    return subscribe((s) => {
      const el = ref.current
      if (!el) return
      v += (-k * (x - s.vel) - c * v) * s.dt
      x += v * s.dt
      if (Math.abs(x) < 0.002 && Math.abs(v) < 0.02) {
        if (!still) { el.style.transform = ''; still = true }
        return
      }
      still = false
      el.style.transform = `translate3d(0, ${(x * lift).toFixed(2)}px, 0) skewX(${(-x * skew).toFixed(2)}deg) scaleY(${(1 + Math.abs(x) * stretch).toFixed(3)})`
    })
  }, [ref, lift, skew, stretch, k, c])
}
