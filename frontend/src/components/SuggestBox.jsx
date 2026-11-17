import { useId, useState } from 'react'
import { postSuggestion } from '../api.js'
import Icon from './Icon.jsx'

// The suggestion box: anyone can pitch a tool to test, something new to measure, or a feature for the site.
// It sends { kind, text } to the lab (POST /api/suggestions). It never says "sent" unless the lab took it:
// with saved results only, or a lab that has no suggestions address yet, it says so and keeps the text.
// No name, email or account is asked for.
const KINDS = [
  ['tool', 'A tool to test', 'A site or app you want Hivemind to test.'],
  ['measure', 'Something to measure', 'A new check or benchmark for tools or for students.'],
  ['feature', 'A feature', 'Something the site should do.'],
]
const MAX = 500

export default function SuggestBox({ id = 'suggest' }) {
  const uid = useId()
  const [kind, setKind] = useState('tool')
  const [text, setText] = useState('')
  const [state, setState] = useState('idle') // idle | sending | sent | failed
  const [why, setWhy] = useState('')
  const clean = text.trim()
  const hint = KINDS.find(([k]) => k === kind)[2]

  const send = async (e) => {
    e.preventDefault()
    if (!clean || state === 'sending') return
    setState('sending'); setWhy('')
    try {
      await postSuggestion({ kind, text: clean.slice(0, MAX) })
      setState('sent'); setText('')
    } catch (err) {
      setState('failed')
      setWhy(err.code === 'needs_live' ? 'Suggestions go to the live lab, which is not connected right now.'
        : err.status === 404 ? 'The lab cannot take suggestions yet.'
        : err.message || 'The suggestion could not be sent.')
    }
  }

  return (
    <section className="sg" id={id} aria-labelledby={`${uid}-h`} data-noscrub>{/* a form: no scroll reveal on its lines */}
      <div className="sg-head">
        <h2 id={`${uid}-h`}>Suggest an idea</h2>
        <p>EdTech tools change fast, so tell us what Hivemind should test, measure or build next.</p>
      </div>
      <form className="sg-form" onSubmit={send}>
        <fieldset className="sg-kinds">
          <legend className="sr-only">What is your suggestion about?</legend>
          {KINDS.map(([k, label]) => (
            <label key={k} className="sg-kind" data-on={kind === k || undefined}>
              <input type="radio" name={`${uid}-kind`} value={k} checked={kind === k} onChange={() => { setKind(k); if (state !== 'sending') setState('idle') }} />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>
        <label className="sg-label" htmlFor={`${uid}-box`}>{hint}</label>
        <textarea id={`${uid}-box`} className="sg-box" rows={4} maxLength={MAX} value={text} disabled={state === 'sending'}
          onChange={(e) => { setText(e.target.value); if (state !== 'sending') setState('idle') }}
          aria-describedby={`${uid}-note`} />
        <div className="sg-foot">
          <p className="sg-note" id={`${uid}-note`}>Please leave out your name and contact details. A new measurement means running every class again, so it can take a while.</p>
          <span className="sg-count" aria-hidden="true">{text.length} / {MAX}</span>
          <button type="submit" className="btn btn-primary" disabled={!clean || state === 'sending'}>
            {state === 'sending' ? 'Sending' : 'Send suggestion'} <Icon name="arrow" size={16} className="icon-nudge" />
          </button>
        </div>
        <p className="sg-status" role="status" data-state={state}>
          {state === 'sent' && <><Icon name="check" size={16} /> <span>Thank you. Your suggestion was sent.</span></>}
          {state === 'failed' && <><Icon name="info" size={16} /> <span>{why} Your text is still in the box.</span></>}
        </p>
      </form>
    </section>
  )
}
