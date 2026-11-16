import { useState } from 'react'
import { SHOTS } from '../data/shots.js'

// A little browser window showing a saved screenshot of a tool's home page (public/previews/<id>.jpg).
// Most of these sites refuse to load inside another page, so a live frame is not possible.
// Tools without a screenshot (see data/shots.js) show the tool's name on a plain panel instead.
export default function ToolPreview({ tool }) {
  const [failed, setFailed] = useState(false)
  const host = tool.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')
  return (
    <span className="tp" aria-hidden="true">
      <span className="tp-bar"><i /><i /><i /><span className="tp-url">{host}</span></span>
      <span className="tp-shot">
        {failed || !SHOTS.has(tool.id)
          ? <span className="tp-none"><b>{tool.name}</b><i>{tool.kind}</i></span>
          : <img src={`${import.meta.env.BASE_URL}previews/${tool.id}.jpg`} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />}
      </span>
    </span>
  )
}
