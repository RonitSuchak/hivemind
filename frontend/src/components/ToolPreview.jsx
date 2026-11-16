import { useState } from 'react'

// A little browser window showing a saved screenshot of a tool's home page (public/previews/<id>.jpg).
// Most of these sites refuse to load inside another page, so a live frame is not possible.
// If there is no screenshot, the window shows the tool's name on a plain panel instead of a broken image.
export default function ToolPreview({ tool }) {
  const [failed, setFailed] = useState(false)
  const host = tool.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')
  return (
    <span className="tp" aria-hidden="true">
      <span className="tp-bar"><i /><i /><i /><span className="tp-url">{host}</span></span>
      <span className="tp-shot">
        {failed
          ? <span className="tp-none"><b>{tool.name}</b><i>{tool.kind}</i></span>
          : <img src={`${import.meta.env.BASE_URL}previews/${tool.id}.jpg`} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />}
      </span>
    </span>
  )
}
