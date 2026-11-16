import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getTutors, postChat } from '../api.js'
import { useLoad, usePageTitle, useStatus } from '../hooks.js'
import { Async, Empty } from '../components/States.jsx'
import Icon from '../components/Icon.jsx'
import '../styles/try.css'

// Try a demo tool: a live chat with one of our built-in demo tools (POST /api/chat, docs/BACKEND.md 5.10).
// The chat lives in memory only. All text from the tool is shown as plain text, never as HTML.
const MAX_CHARS = 500
const MAX_TURNS = 12

export default function Try() {
  usePageTitle('Try a demo tool')
  const { tutorId } = useParams()
  const tutors = useLoad(getTutors, [])
  return (
    <Async state={tutors} label="Loading the demo tool" unavailable={<TryOff />}>
      {(list) => {
        const tool = list.find((t) => t.tutor_id === tutorId)
        if (!tool) {
          return (
            <div className="tr">
              <Empty title="We could not find that demo tool" action={<Link to="/lab" className="btn">See the lab</Link>}>
                Pick one from the Simulation Lab instead.
              </Empty>
            </div>
          )
        }
        return tool.live_chat === false ? <TryBlocked tool={tool} /> : <Chat key={tool.tutor_id} tool={tool} />
      }}
    </Async>
  )
}

function TryOff() {
  return (
    <div className="tr">
      <div className="tr-card glass" role="note">
        <h1>Live chat is not available</h1>
        <p className="tr-sub">Chatting with a demo tool needs the lab, and the lab is not connected right now. Nothing has been sent or saved.</p>
      </div>
    </div>
  )
}

// A demo tool that failed a critical safety check has live chat turned off (403 safety_concern).
function TryBlocked({ tool }) {
  return (
    <div className="tr">
      <div className="tr-card glass" role="note">
        <h1>{tool.tutor_name}: live chat is off</h1>
        <p className="tr-sub tr-flag"><Icon name="flag" size={18} /> <span>This demo tool did not pass a safety check in our tests, so you cannot chat with it. You can still read how it did in the lab.</span></p>
        <p className="actions"><Link to="/lab" className="btn">See the lab</Link></p>
      </div>
    </div>
  )
}

function Chat({ tool }) {
  const status = useStatus()
  const demo = status === 'demo'
  const [msgs, setMsgs] = useState([]) // { from: 'you' | 'tool', text, notice? }
  const [session, setSession] = useState(null)
  const [turnsLeft, setTurnsLeft] = useState(MAX_TURNS)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [expired, setExpired] = useState(false)
  const end = useRef(null)
  const box = useRef(null)

  const over = turnsLeft <= 0
  const locked = demo || expired || over
  const left = MAX_CHARS - draft.length
  const canSend = !locked && !busy && draft.trim().length > 0 && draft.length <= MAX_CHARS

  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }) }, [msgs, busy])

  async function send() {
    if (!canSend) return
    const text = draft.trim()
    setBusy(true); setError(null)
    setMsgs((m) => [...m, { from: 'you', text }])
    setDraft('')
    try {
      const r = await postChat({ tutor_id: tool.tutor_id, session_id: session, message: text })
      setSession(r.session_id)
      setTurnsLeft(r.turns_left)
      setMsgs((m) => [...m, { from: 'tool', text: r.reply, notice: r.replaced ? r.notice : null }])
    } catch (e) {
      // Take the message back out of the chat and into the box, so nothing the person wrote is lost.
      setMsgs((m) => m.slice(0, -1))
      setDraft(text)
      if (e.code === 'session_expired') setExpired(true)
      else if (e.code === 'turn_limit') setTurnsLeft(0)
      else setError(e)
    } finally {
      setBusy(false)
      if (!locked) box.current?.focus()
    }
  }

  function restart() {
    setMsgs([]); setSession(null); setTurnsLeft(MAX_TURNS); setDraft(''); setError(null); setExpired(false)
    box.current?.focus()
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div className="tr">
      <header className="tr-head">
        <h1>Try {tool.tutor_name}</h1>
        <p className="tr-sub">{tool.style ? `${tool.style}. ` : ''}This demo tool was built by the Hivemind team on an AI model. Its replies can be wrong.</p>
        <p className="tr-privacy"><Icon name="lock" size={16} /> <span>Do not type personal details like your name, address, phone number or email. Nothing is saved, and the chat is forgotten after 30 minutes.</span></p>
      </header>

      {demo && (
        <p className="tr-note" role="note"><Icon name="info" size={18} /> <span>You are looking at saved results, so live chat is off. Connect the lab to chat with this demo tool.</span></p>
      )}

      <section className="tr-card glass" aria-label={`Chat with ${tool.tutor_name}`}>
        <div className="tr-meta">
          <span>{over ? 'No turns left' : `${turnsLeft} of ${MAX_TURNS} turns left`}</span>
          {msgs.length > 0 && <button type="button" className="btn btn-quiet btn-small" onClick={restart}>Start a new chat</button>}
        </div>

        <ol className="tr-log" role="log" aria-live="polite" aria-label="The chat so far">
          {msgs.length === 0 && <li className="tr-empty">Ask a maths question, like &ldquo;how do I add 1/3 and 1/6?&rdquo;</li>}
          {msgs.map((m, i) => (
            <li key={i} className="tr-msg" data-from={m.from}>
              <span className="tr-who">{m.from === 'you' ? 'You' : tool.tutor_name}</span>
              <p className="tr-text">{m.text}</p>
              {m.notice && <p className="tr-replaced" role="note"><Icon name="flag" size={14} /> <span>{m.notice}</span></p>}
            </li>
          ))}
          {busy && <li className="tr-msg tr-wait" data-from="tool"><span className="tr-who">{tool.tutor_name}</span><p className="tr-text" role="status">Thinking…</p></li>}
          <li ref={end} aria-hidden="true" className="tr-end" />
        </ol>

        {expired && (
          <div className="tr-alert" role="alert">
            <Icon name="warn" size={18} /> <span>This chat was idle for too long and has been forgotten.</span>
            <button type="button" className="btn btn-small" onClick={restart}>Start a new chat</button>
          </div>
        )}
        {over && !expired && (
          <div className="tr-alert" role="note">
            <Icon name="info" size={18} /> <span>That is all 12 turns. Start a new chat to keep going.</span>
            <button type="button" className="btn btn-small" onClick={restart}>Start a new chat</button>
          </div>
        )}
        {error && (
          <div className="tr-alert" role="alert">
            <Icon name="warn" size={18} />
            <span>{errorText(error)}</span>
          </div>
        )}

        <form className="tr-form" onSubmit={(e) => { e.preventDefault(); send() }}>
          <label className="sr-only" htmlFor="tr-box">Your message</label>
          <textarea id="tr-box" ref={box} rows={3} value={draft} disabled={locked} maxLength={MAX_CHARS + 50}
            placeholder={locked ? '' : 'Type your message'} aria-describedby="tr-count"
            onChange={(e) => setDraft(e.target.value)} onKeyDown={onKeyDown} />
          <div className="tr-bar">
            <span id="tr-count" className={`tr-count ${left < 0 ? 'is-over' : left < 50 ? 'is-near' : ''}`}>
              {left < 0 ? `${-left} characters too many` : `${left} characters left`}
            </span>
            <button type="submit" className="btn btn-primary" disabled={!canSend} aria-busy={busy}>
              {busy && <span className="spinner spinner-sm" aria-hidden="true" />}
              Send <Icon name="arrow" size={18} className="icon-nudge" />
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

// Backend errors: show its own message, with the friendly extras the contract asks for.
function errorText(e) {
  if (e.code === 'rate_limited') return e.retryAfter ? `Too many messages. Wait ${e.retryAfter} seconds, then try again.` : 'Too many messages. Wait a moment, then try again.'
  if (e.code === 'ai_unavailable' || e.code === 'store_unavailable') return 'The lab is busy. Try again in a minute.'
  if (e.code === 'safety_concern') return 'Live chat is off for this demo tool because it did not pass a safety check.'
  return e.message
}
