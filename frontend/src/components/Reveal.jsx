import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { revealTokens, spring, tokenPx, useReduced } from '../motion.js'

// Scroll "jumps". Scrolling DOWN, each element jumps into the screen as it arrives: it rises
// (--reveal-rise), grows from --reveal-scale and overshoots a little (--spring-reveal bounce).
// Scrolling back UP, it jumps out again as it leaves through the bottom of the screen, so it can
// jump in the next time. Things that leave over the TOP stay put (no flicker while reading on).
// Under reduced motion everything renders final, instantly.
//
//   <Reveal as="section">…</Reveal>                       one element on its own
//   <RevealGroup as="ol"> <Reveal as="li"/> … </RevealGroup>  children stagger (--reveal-stagger)
//
// Glass inside a fading parent cannot see the background, so put `glass` classes ON the Reveal
// item itself (never inside a wrapper that fades). `blur` is kept for callers; it is unused now.

const InGroup = createContext(false)
// True inside at/ScrollStory.jsx: the story scrubs every chunk itself, so Reveal renders plain elements there.
export const Plain = createContext(false)

// 'shown' while on screen or above it; 'hidden' while below the screen.
function useJump(ref, margin) {
  const [state, setState] = useState('hidden')
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') { setState('shown'); return }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setState('shown')
      else if (e.boundingClientRect.top > window.innerHeight * 0.5) setState('hidden')
    }, { rootMargin: margin })
    io.observe(el)
    return () => io.disconnect()
  }, [ref, margin])
  return state
}

function useReveal(delay) {
  return useMemo(() => {
    const t = revealTokens()
    const scale = tokenPx('--reveal-scale', 0.9)
    return {
      margin: t.margin,
      stagger: t.stagger,
      variants: {
        hidden: { opacity: 0, y: t.rise, scale, transition: { duration: 0.22, ease: 'easeIn' } },
        // opacity uses a short tween so content is readable at once; the spring tail only moves position and size
        shown: { opacity: 1, y: 0, scale: 1, transition: { ...spring('reveal', { delay }), opacity: { duration: 0.25, delay, ease: 'easeOut' } } },
      },
    }
  }, [delay])
}

const tagOf = (as) => motion[as] || motion.div

export function Reveal({ as = 'div', blur: _blur, delay = 0, children, ...rest }) {
  const plain = useContext(Plain)
  const reduced = useReduced() || plain
  const grouped = useContext(InGroup)
  const r = useReveal(delay)
  const ref = useRef(null)
  const state = useJump(ref, r.margin)
  if (reduced) { const Tag = as; return <Tag {...rest}>{children}</Tag> }
  const M = tagOf(as)
  const trigger = grouped ? {} : { initial: 'hidden', animate: state }
  return <M ref={ref} variants={r.variants} {...trigger} {...rest}>{children}</M>
}

// One trigger for the whole group; each <Reveal> child jumps in `stagger` seconds after the last,
// and they leave together, quickly. The group element itself does not fade.
export function RevealGroup({ as = 'div', stagger, delay = 0, children, ...rest }) {
  const plain = useContext(Plain)
  const reduced = useReduced() || plain
  const r = useReveal(0)
  const ref = useRef(null)
  const state = useJump(ref, r.margin)
  if (reduced) { const Tag = as; return <Tag {...rest}>{children}</Tag> }
  const M = tagOf(as)
  const variants = {
    hidden: { transition: { staggerChildren: 0.03, staggerDirection: -1 } },
    shown: { transition: { staggerChildren: stagger ?? r.stagger, delayChildren: delay } },
  }
  return (
    <InGroup.Provider value={true}>
      <M ref={ref} variants={variants} initial="hidden" animate={state} {...rest}>{children}</M>
    </InGroup.Provider>
  )
}

export default Reveal
