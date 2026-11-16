import { useLayoutEffect, useRef, useState } from 'react'

// Text that cross-fades in place when it changes (old text leaves, new text arrives, same spot).
// `blur` adds a 2-3px blur to hide the overlap. `options` reserves width for every label so a
// button does not jump size when its label swaps.
export function SwapText({ text, options = [], blur = true, className = '' }) {
  const last = useRef(text)
  const everChanged = useRef(false)
  const [prev, setPrev] = useState(null)
  const isChange = last.current !== text
  useLayoutEffect(() => {
    if (last.current === text) return
    everChanged.current = true
    setPrev(last.current)
    last.current = text
    const t = setTimeout(() => setPrev(null), 400)
    return () => clearTimeout(t)
  }, [text])
  const animate = everChanged.current || isChange
  return (
    <span className={`swap-text ${blur ? 'swap-blur' : ''} ${className}`}>
      {options.map((o) => <span key={o} className="swap-sizer" aria-hidden="true">{o}</span>)}
      {prev !== null && <span key={`old-${prev}`} className="swap-old" aria-hidden="true">{prev}</span>}
      <span key={text} className={animate ? 'swap-new' : undefined}>{text}</span>
    </span>
  )
}

// A number where only the digits that changed cross-fade, in place.
export function DigitFade({ value }) {
  const s = String(value)
  return (
    <span className="digits">
      {[...s].map((c, i) => <SwapText key={s.length - i} text={c} blur={false} className="dg" />)}
    </span>
  )
}
