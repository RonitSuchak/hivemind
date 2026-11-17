import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { getStudents } from '../api.js'
import { useLoad } from '../hooks.js'
import { studentTags, tagLabel, tagNote } from '../labels.js'
import { revealTokens, spring, tokenS, useReduced } from '../motion.js'
import { useT } from '../i18n/index.js'
import Drawer from './Drawer.jsx'
import Icon from './Icon.jsx'
import Radar from './Radar.jsx'
import { useTooltip } from './Tooltip.jsx'
import '../styles/lab.css'

// The class of 30 on the home page. Each dot is one simulated student from the lab (GET /api/students).
//   - Move the pointer over the class and the dots nearby drift out of its way, then settle back.
//   - Rest on a dot and it lights up and shows the student's name.
//   - Select it (click, tap or Enter) and a panel opens with that student's learning profile.
// Without the lab the same 30 dots are shown, with no names and nothing to open.
// Mouse only for the drift, and none of it under reduced motion; the names and the panel always work.
const COLS = 10, ROWS = 3
const SEATS = Array.from({ length: COLS * ROWS }, (_, k) => {
  const c = k % COLS, r = Math.floor(k / COLS)
  return { k, d: Math.hypot(c - (COLS - 1) / 2, (r - (ROWS - 1) / 2) * 1.6) }
})
const REACH = 120, PUSH = 16, STIFF = 0.12, DAMP = 0.72

export default function ClassDots() {
  const t = useT()
  const reduced = useReduced()
  const tip = useTooltip()
  const load = useLoad(getStudents, [])
  const students = load.status === 'ok' && Array.isArray(load.data) ? load.data : []
  const [open, setOpen] = useState(null)
  const board = useRef(null)
  const v = useMemo(() => {
    const step = tokenS('--ripple-stagger', 0.11)
    return { empty: { scale: 0.4, opacity: 0 }, full: (d) => ({ scale: 1, opacity: 1, transition: spring('ui', { delay: d * step }) }) }
  }, [])

  useEffect(() => {
    const root = board.current
    if (!root || reduced || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    const items = [...root.querySelectorAll('.seat')].map((el) => ({ el, x: 0, y: 0, vx: 0, vy: 0 }))
    let mx = -9999, my = -9999, frame = 0
    const step = () => {
      frame = 0
      let moving = false
      for (const g of items) {
        const r = g.el.getBoundingClientRect()
        const cx = r.left + r.width / 2 - g.x, cy = r.top + r.height / 2 - g.y // where it rests
        const dx = cx - mx, dy = cy - my
        const d = Math.hypot(dx, dy)
        let tx = 0, ty = 0
        // No push for the dot under the pointer (so it can be read and pressed); the most a little way out.
        if (d > r.width * 0.55 && d < REACH) {
          const k = d / REACH
          const f = 4 * k * (1 - k) * PUSH
          tx = (dx / d) * f; ty = (dy / d) * f
        }
        g.vx = (g.vx + (tx - g.x) * STIFF) * DAMP
        g.vy = (g.vy + (ty - g.y) * STIFF) * DAMP
        g.x += g.vx; g.y += g.vy
        if (Math.abs(g.vx) + Math.abs(g.vy) > 0.02 || Math.abs(tx - g.x) + Math.abs(ty - g.y) > 0.2) moving = true
        g.el.style.transform = `translate3d(${g.x.toFixed(2)}px, ${g.y.toFixed(2)}px, 0)`
      }
      if (moving) frame = requestAnimationFrame(step)
    }
    const kick = () => { if (!frame) frame = requestAnimationFrame(step) }
    const move = (e) => { mx = e.clientX; my = e.clientY; kick() }
    const away = () => { mx = -9999; my = -9999; kick() }
    root.addEventListener('pointermove', move, { passive: true })
    root.addEventListener('pointerleave', away)
    return () => {
      root.removeEventListener('pointermove', move)
      root.removeEventListener('pointerleave', away)
      cancelAnimationFrame(frame)
      items.forEach((g) => { g.el.style.transform = '' })
    }
  }, [reduced, students.length])

  const student = students.find((s) => s.id === open)
  return (
    <>
      <motion.ul ref={board} className="seats seats-live" aria-label={t('class.list')} initial={reduced ? false : 'empty'} whileInView="full"
        viewport={{ once: true, margin: revealTokens().margin }}>
        {SEATS.map((s) => {
          const who = students[s.k]
          const label = who ? t('class.student', { name: who.name }) : null
          return (
            <li key={s.k}>
              {who ? (
                <button type="button" className="seat" aria-haspopup="dialog" aria-label={label} data-open={open === who.id || undefined}
                  onClick={() => setOpen(who.id)} {...tip.bind(label)}>
                  <motion.span className="seat-fill" custom={s.d} variants={reduced ? undefined : v} />
                </button>
              ) : (
                <span className="seat" aria-hidden="true"><motion.span className="seat-fill" custom={s.d} variants={reduced ? undefined : v} /></span>
              )}
            </li>
          )
        })}
      </motion.ul>
      {students.length > 0 && <p className="seats-hint"><Icon name="pointer" size={15} /> {t('class.hint')}</p>}
      {tip.node}

      <Drawer open={!!student} onClose={() => setOpen(null)} title={student?.name ?? ''} subtitle={student ? t('class.sim', { age: student.age }) : ''}>
        {student && (
          <div className="lx-student">
            <div className="lx-student-radar"><Radar profile={student} compact staged label={`${student.name}: learning profile`} /></div>
            {studentTags(student).length > 0 && (
              <ul className="lx-chips" aria-label="Groups">
                {studentTags(student).map((g) => <li key={g} className="lx-chip" title={tagNote(g)}>{tagLabel(g)}</li>)}
              </ul>
            )}
            <p className="actions">
              <Link to={`/lab?student=${encodeURIComponent(student.id)}`} className="btn btn-primary">{t('class.seeLab', { name: student.name })} <Icon name="arrow" size={16} className="icon-nudge" /></Link>
            </p>
          </div>
        )}
      </Drawer>
    </>
  )
}
