import { useEffect } from 'react'

// A slightly heavier page scroll, so the scroll animations are easier to follow. Each turn of the wheel
// (or trackpad swipe) moves the page `weight` times as far as normal, and the page glides to that spot
// rather than jumping. Wheel and trackpad only: touch, the keyboard, the scrollbar and anything that
// scrolls by itself (drawers, panels, lists) are left alone. Off under reduced motion.
export function useHeavyScroll(weight = 0.74) {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let target = 0, pos = 0, frame = 0

    // True when something between the pointer and the page can itself scroll this way.
    const inner = (node, dy) => {
      for (let el = node; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
        if (el.scrollHeight <= el.clientHeight + 1) continue
        const o = getComputedStyle(el).overflowY
        if (o !== 'auto' && o !== 'scroll') continue
        if (dy < 0 ? el.scrollTop > 0 : el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true
      }
      return false
    }
    const stop = () => { cancelAnimationFrame(frame); frame = 0 }
    const step = () => {
      const d = target - pos
      if (Math.abs(d) < 0.5) { window.scrollTo({ top: target, behavior: 'instant' }); frame = 0; return }
      pos += d * 0.2
      window.scrollTo({ top: pos, behavior: 'instant' })
      frame = requestAnimationFrame(step)
    }
    const onWheel = (e) => {
      if (e.ctrlKey || e.metaKey || e.defaultPrevented) return
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
      if (document.body.style.overflow === 'hidden') return // a drawer or panel is open
      if (e.target instanceof Element && inner(e.target, e.deltaY)) return
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY
      e.preventDefault()
      if (!frame) { pos = window.scrollY; target = pos }
      const max = document.documentElement.scrollHeight - window.innerHeight
      target = Math.max(0, Math.min(max, target + dy * weight))
      if (!frame) frame = requestAnimationFrame(step)
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    // Anything else that scrolls the page takes over at once.
    const others = ['pointerdown', 'keydown', 'touchstart']
    others.forEach((t) => window.addEventListener(t, stop, { passive: true }))
    return () => {
      window.removeEventListener('wheel', onWheel)
      others.forEach((t) => window.removeEventListener(t, stop))
      stop()
    }
  }, [weight])
}

// While the page is scrolling, <html data-scrolling> is set (and cleared shortly after it stops). The CSS uses it
// to blur a thin band along the top and bottom of the screen, so the eye stays on the middle.
export function useScrollingFlag(idle = 500) {
  useEffect(() => {
    const root = document.documentElement
    let timer = 0
    const onScroll = () => {
      root.setAttribute('data-scrolling', '')
      clearTimeout(timer)
      timer = setTimeout(() => root.removeAttribute('data-scrolling'), idle)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); clearTimeout(timer); root.removeAttribute('data-scrolling') }
  }, [idle])
}
