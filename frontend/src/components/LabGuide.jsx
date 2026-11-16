import { useState } from 'react'
import Icon from './Icon.jsx'
import { useTooltip } from './Tooltip.jsx'
import { OutcomeShape } from './OutcomeShape.jsx'
import { OUTCOME, OUTCOME_NOTE, OUTCOME_ORDER, SCORE_ICON, SCORE_LABEL } from '../labels.js'

// "How to read this page": what the lab does, then a short key drawn with the real components.
// Symbols are decorative (aria-hidden); the name and the note inside each chip carry the meaning.
// Open by default. Closing it is remembered in this browser, so repeat visitors are not made to scroll.

const KEY = 'hivemind-lab-guide'
const wasClosed = () => { try { return localStorage.getItem(KEY) === 'closed' } catch { return false } }
const remember = (open) => { try { localStorage.setItem(KEY, open ? 'open' : 'closed') } catch { /* private window: fine */ } }

const STEPS = [
  <><strong>30 simulated students</strong> sit a short test</>,
  <><strong>One tool type</strong> teaches them a lesson</>,
  <>They <strong>sit the test again</strong> and we measure the change</>,
]

// One row of chips (it wraps on small screens): the three outcome stars, the three scores and the safety flag.
// Each chip is the symbol and a one or two word name. The longer meaning is the hover / focus tooltip,
// and is also in the chip as text for screen readers (and shown under the name on touch screens).
const SCORE_NOTE = {
  safety: 'Misinformation, bias, privacy and content',
  usability: 'How easy it was to follow',
  learning: 'How much students improved',
}
const KEY_ITEMS = [
  ...OUTCOME_ORDER.map((o) => ({ key: o, sym: <OutcomeShape outcome={o} size={20} />, name: OUTCOME[o], note: OUTCOME_NOTE[o] })),
  ...['safety', 'usability', 'learning'].map((k) => ({ key: k, sym: <Icon name={SCORE_ICON[k]} size={16} />, name: SCORE_LABEL[k], note: SCORE_NOTE[k] })),
  { key: 'flag', sym: <Icon name="flag" size={16} className="lx-guide-pop" />, name: 'Safety flag', note: 'This tool type did not pass one safety check' },
]

export default function LabGuide() {
  const [open, setOpen] = useState(() => !wasClosed())
  const tip = useTooltip()
  return (
    <details className="lx-guide glass" open={open} onToggle={(e) => { setOpen(e.currentTarget.open); remember(e.currentTarget.open) }}>
      <summary className="lx-guide-sum">
        <span>How to read this page</span>
        <Icon name="chevron" size={18} className="lx-guide-chev" />
      </summary>
      <div className="lx-guide-body">
        <p className="lx-guide-lead">
          The lab tests five <strong>tool types</strong>. Each one stands for real EdTech tools that teach the same way.
          Real products are <strong>not tested yet</strong>. The students are <strong>simulated</strong>, not real children.
        </p>

        <section aria-labelledby="lx-guide-how">
          <h3 id="lx-guide-how" className="lx-guide-h">How it works</h3>
          <ol className="lx-guide-steps">
            {STEPS.map((s, i) => <li key={i}><span>{s}</span></li>)}
          </ol>
        </section>

        <section aria-labelledby="lx-guide-sym">
          <h3 id="lx-guide-sym" className="lx-guide-h">Key</h3>
          <ul className="lx-key">
            {KEY_ITEMS.map((it) => (
              <li key={it.key}>
                <span className="lx-key-chip" tabIndex={0} {...tip.bind(it.note)}>
                  <span className="lx-guide-sym" aria-hidden="true">{it.sym}</span>
                  <span className="lx-key-name">{it.name}</span>
                  <span className="lx-key-note">{it.note}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      {tip.node}
    </details>
  )
}
