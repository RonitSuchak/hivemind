import { useId, useMemo, useState } from 'react'
import Icon from './Icon.jsx'
import { TOOLS, helperKind, searchTools } from '../data/tools.js'
import { typeName } from '../labels.js'

// "Which tools do you use now?" on the results page: up to 3 tools from our list, how long, and whether it helps.
// The answers stay on this device (inside the result, so "Save my results on this device" keeps them). They are never
// sent to the lab and never change the ranking. They only let the page say whether a tool you rely on is of the type
// that worked best for students like you.
const LONG = [['new', 'Under a month'], ['months', '1 to 6 months'], ['long', 'Over 6 months']]
const HELPS = [['yes', 'Yes'], ['unsure', 'Not sure'], ['no', 'No']]
const MAX = 3
const byId = new Map(TOOLS.map((t) => [t.id, t]))
const aTool = (type) => `${/^[aeiou]/i.test(type) ? 'an' : 'a'} ${type} tool` // "an Instant answers tool"

// One sentence per tool, only when there is something useful to say. `top` is the type that ranked first.
function verdict(u, top) {
  const t = byId.get(u.id)
  if (!t || !top) return null
  const helper = helperKind(t)
  const kind = helper ? `a study helper (${helper.name.toLowerCase()}): it does a job for you but does not teach on its own` : aTool(typeName(t.group))
  const best = `${typeName(top)} tools`
  if (u.long === 'long' && u.helps === 'no' && (helper || t.group !== top)) {
    return { tone: 'warn', text: `You have used ${t.name} for over 6 months and say it is not helping. It is ${kind}, and for students like you ${best} worked best in the lab, so that type may suit you better.` }
  }
  if (u.helps === 'no' && (helper || t.group !== top)) {
    return { tone: 'info', text: `${t.name} is ${kind}. If it is not helping, try one of the ${best} above: they worked best for students like you in the lab.` }
  }
  if (!helper && t.group === top) {
    return { tone: 'ok', text: `${t.name} is ${aTool(typeName(top))}, the type that worked best for students like you.` }
  }
  return null
}

export default function ToolsYouUse({ using = [], onChange, top }) {
  const [q, setQ] = useState('')
  const id = useId()
  const found = useMemo(() => (q.trim() ? searchTools(q).filter((t) => !using.some((u) => u.id === t.id)).slice(0, 6) : []), [q, using])
  const add = (t) => { onChange([...using, { id: t.id, long: null, helps: null }].slice(0, MAX)); setQ('') }
  const set = (i, k, v) => onChange(using.map((u, j) => (j === i ? { ...u, [k]: v } : u)))
  const drop = (i) => onChange(using.filter((_, j) => j !== i))

  return (
    <section className="yu glass" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className="rs-h2">Which tools do you use now?</h2>
      <p className="yu-lede">Add up to {MAX} and we tell you whether each is the type that worked best for students like you. Your answers stay on this device and do not change the ranking.</p>

      {using.length < MAX && (
        <div className="yu-search">
          <label htmlFor={`${id}-q`} className="sr-only">Search for a tool you use</label>
          <input id={`${id}-q`} type="search" className="yu-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type a tool's name, for example Duolingo" autoComplete="off" />
          {found.length > 0 && (
            <ul className="yu-found">
              {found.map((t) => (
                <li key={t.id}><button type="button" className="yu-pick" onClick={() => add(t)}><strong>{t.name}</strong><span>{t.kind}</span></button></li>
              ))}
            </ul>
          )}
          {q.trim() && !found.length && <p className="yu-none" role="status">No tool by that name in our list yet.</p>}
        </div>
      )}

      {using.length > 0 && (
        <ul className="yu-list">
          {using.map((u, i) => {
            const t = byId.get(u.id)
            if (!t) return null
            const v = u.long && u.helps ? verdict(u, top) : null
            return (
              <li key={u.id} className="yu-item">
                <div className="yu-item-top">
                  <strong>{t.name}</strong>
                  <button type="button" className="btn btn-small btn-quiet" onClick={() => drop(i)}>Remove<span className="sr-only"> {t.name}</span></button>
                </div>
                <fieldset className="yu-q">
                  <legend>How long have you used it?</legend>
                  {LONG.map(([k, label]) => (
                    <label key={k} className="sg-kind" data-on={u.long === k ? '' : undefined}>
                      <input type="radio" name={`${id}-${u.id}-long`} checked={u.long === k} onChange={() => set(i, 'long', k)} />{label}
                    </label>
                  ))}
                </fieldset>
                <fieldset className="yu-q">
                  <legend>Is it helping you learn?</legend>
                  {HELPS.map(([k, label]) => (
                    <label key={k} className="sg-kind" data-on={u.helps === k ? '' : undefined}>
                      <input type="radio" name={`${id}-${u.id}-helps`} checked={u.helps === k} onChange={() => set(i, 'helps', k)} />{label}
                    </label>
                  ))}
                </fieldset>
                {v && <p className="yu-verdict" data-tone={v.tone}><Icon name={v.tone === 'ok' ? 'check' : 'info'} size={16} /> <span>{v.text}</span></p>}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
