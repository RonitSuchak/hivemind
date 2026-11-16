import { motion } from 'motion/react'
import { spring } from '../motion.js'

// Shared sliding pill for tab lists (layoutId): render it inside the selected tab only, and it
// springs from the old tab to the new one. Same `id` = same pill. The tab needs position: relative.
//   {selected && <TabPill id="tutor-tabs" />}
// 999 matches --r-pill: Motion needs a number to keep the corners round while the pill stretches.
export default function TabPill({ id, className = 'tab-pill' }) {
  return <motion.span layoutId={id} className={className} style={{ borderRadius: 999 }} transition={spring('ui')} aria-hidden="true" />
}
