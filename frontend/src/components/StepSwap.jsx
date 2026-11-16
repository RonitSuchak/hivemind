import { forwardRef, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useIsPresent } from 'motion/react'
import { spring, tokenPx, useReduced } from '../motion.js'

// Steps side by side: when `id` changes, the new step springs in from the direction of travel
// (`dir` = 1 forward, -1 back) while the old one drifts the other way and fades. Interruptible:
// fast clicking retargets from wherever each step is. The leaving copy is inert and hidden from AT.
// The box springs to the height of the current step, so whatever sits around it (a card edge,
// the buttons below) glides instead of jumping.
const variants = {
  enter: ({ dir, slide }) => ({ opacity: 0, x: dir * slide }),
  center: { opacity: 1, x: 0 },
  exit: ({ dir, slide }) => ({ opacity: 0, x: dir * slide * -0.6 }),
}

export default function StepSwap({ id, dir, className = '', children }) {
  const reduced = useReduced()
  const custom = { dir, slide: reduced ? 0 : tokenPx('--slide', 16) }
  const [h, setH] = useState(null)
  const ro = useRef(null)
  const track = useCallback((el) => {
    ro.current?.disconnect()
    if (!el || typeof ResizeObserver === 'undefined') return
    ro.current = new ResizeObserver(() => setH(el.offsetHeight))
    ro.current.observe(el)
  }, [])
  useEffect(() => () => ro.current?.disconnect(), [])

  return (
    <motion.div className={`step-swap ${className}`} initial={false}
      animate={h == null ? undefined : { height: h }}
      transition={reduced ? { duration: 0 } : spring('step')}>
      <AnimatePresence initial={false} mode="popLayout" custom={custom}>
        <Step key={id} custom={custom} track={track}>{children}</Step>
      </AnimatePresence>
    </motion.div>
  )
}

// popLayout measures the leaving step, so it needs the ref.
const Step = forwardRef(function Step({ custom, track, children }, ref) {
  const present = useIsPresent()
  const own = useRef(null)
  const setRef = useCallback((el) => {
    own.current = el
    if (typeof ref === 'function') ref(el); else if (ref) ref.current = el
  }, [ref])
  useLayoutEffect(() => { if (present) track(own.current) }, [present, track])
  return (
    <motion.div ref={setRef} className="step-live" custom={custom} variants={variants} initial="enter" animate="center" exit="exit"
      transition={spring('step')} aria-hidden={present ? undefined : true} inert={present ? undefined : ''}>
      {children}
    </motion.div>
  )
})
