import { NavLink } from 'react-router-dom'
import { motion } from 'motion/react'
import { spring } from '../motion.js'

// The underline is one shared element (layoutId): it springs from the old link to the new one.
// LabShell stays mounted between Class view and Ratings, so the move is continuous.
export default function LabNav() {
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
    <nav className="subnav" aria-label="Simulation Lab">
      {link('/lab', 'Class view', true)}
      {link('/lab/ratings', 'Ratings')}
    </nav>
  )
}

