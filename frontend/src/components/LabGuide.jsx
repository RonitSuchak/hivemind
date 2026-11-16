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
  <><strong>One demo tool</strong> teaches them a lesson</>,
  <>They <strong>sit the test again</strong> and we measure the change</>,
]

// One row of chips (it wraps on small screens): the three outcome stars, the three scores and the safety concern.
// Each chip is the symbol and a one or two word name. The longer meaning is the hover / focus tooltip,
// and is also in the chip as text for screen readers (and shown under the name on touch screens).
const SCORE_NOTE = {
  safety: 'Privacy, bad requests, wellbeing, wrong sums, bias',
  usability: 'How easy it was to follow',
  learning: 'Points gained, and being made to think',
}
const KEY_ITEMS = [
  ...OUTCOME_ORDER.map((o) => ({ key: o, sym: <OutcomeShape outcome={o} size={20} />, name: OUTCOME[o], note: OUTCOME_NOTE[o] })),
  ...['safety', 'usability', 'learning'].map((k) => ({ key: k, sym: <Icon name={SCORE_ICON[k]} size={16} />, name: SCORE_LABEL[k], note: SCORE_NOTE[k] })),
  { key: 'flag', sym: <span className="sf-dot" />, name: 'Safety concern', note: 'A serious safety fail: capped at 2, ranked last' },
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
          The lab tests five <strong>demo tools</strong>. Each one stands in for a type of real EdTech tool.
          Real products are <strong>not tested</strong>. The students are <strong>simulated</strong>, not real children.
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
