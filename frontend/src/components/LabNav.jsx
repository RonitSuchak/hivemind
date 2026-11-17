import { useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'motion/react'
import { spring } from '../motion.js'
import { getValidation } from '../api.js'
import { useLoad } from '../hooks.js'

// The underline is one shared element (layoutId): it springs from the old link to the new one.
// LabShell stays mounted between Class view and Ratings, so the move is continuous.
export default function LabNav() {
  // On a phone the tabs scroll sideways. Keep the current tab in view, so the page you are on is never off screen.
  const nav = useRef(null)
  // The Proof tab shows only once at least one real student has taken part. With no results there is nothing to prove yet.
  const proof = useLoad(() => getValidation().catch(() => null), [])
  const hasProof = proof.status === 'ok' && (proof.data?.summary?.count ?? 0) > 0
  const { pathname } = useLocation()
  useEffect(() => {
    const el = nav.current, cur = el?.querySelector('a.active')
    if (!el || !cur) return
    const left = cur.offsetLeft // .subnav is position: relative, so this is measured from the nav's own left edge
    if (left < el.scrollLeft || left + cur.offsetWidth > el.scrollLeft + el.clientWidth) el.scrollLeft = Math.max(0, left + cur.offsetWidth - el.clientWidth + 16)
  }, [pathname])
  const link = (to, label, end) => (
    <NavLink to={to} end={end}>
      {({ isActive }) => (
        <>
          {label}
          {isActive && <motion.span layoutId="labnav-line" className="subnav-line" transition={spring('ui')} aria-hidden="true" />}
        </>
      )}
    </NavLink>
  )
  return (
    <nav className="subnav" aria-label="Simulation Lab" ref={nav}>
      {link('/lab', 'Class view', true)}
      {link('/lab/ratings', 'Ratings')}
      {link('/lab/report', 'Reports')}
      {link('/lab/real-tools', 'Real tools')}
      {hasProof && link('/lab/proof', 'Proof')}
    </nav>
  )
}

