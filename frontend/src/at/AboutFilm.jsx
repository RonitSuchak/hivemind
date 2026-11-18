import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import StatWheel from '../components/StatWheel.jsx'
import { PROFILE_STATS } from '../components/MatchDiagram.jsx'
import { getRatings, getStudents } from '../api.js'
import { DEMO_SCORES, SCORE_LABEL, typeName } from '../labels.js'
import { damp, glideTo, state, stopScroll, subscribe } from './state.js'
import './about-film.css'

// The About "film": a tall section whose scroll position is the playhead (like the Home film).
// One chapter per About section. Each chapter has a text card and one figure.
// Rules for the figures, so they stay easy to read:
//   - one idea per figure, said in one sentence at the top
//   - every number is the lab's own (ratings and students data); nothing is made up
//   - a dot is ALWAYS one simulated student of the class of 30
//   - no decoration: if a mark does not mean something, it is not drawn
// Every frame is a pure function of the playhead, so scrolling up plays it backwards.

const DOTS = 30      // the simulated class
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) }

// Every sentence below is taken (shortened) from the About page text. `f` holds the live counts.
const CHAPTERS = [
  { id: 'method', name: 'The method', bullets: (f) => [
    <>We built <strong>{f.tools ?? 4} demo tools</strong> ourselves, each with a known strength or flaw.</>,
    <>We teach a <strong>simulated class of {f.students ?? 30}</strong> with each demo tool.</>,
    <>They sit a <strong>10 question fractions test</strong>, have a <strong>lesson</strong>, then sit the <strong>same test again</strong>.</>,
  ] },
  { id: 'scores', name: 'What we check', bullets: () => [
    <>We check whether a tool is <strong>easy to use</strong> and whether it <strong>helps you learn</strong>.</>,
    <>Each one gets its <strong>own score</strong>, from 1 to 5.</>,
    <>Types of tool get <strong>no safety score</strong>, because safety is checked only for specific EdTech tools.</>,
  ] },
  { id: 'formula', name: 'How a score is made', bullets: () => [
    <>Each score runs from <strong>1 to 5</strong>, and the same rules apply to every tool.</>,
    <><strong>Usability</strong> is 50% reading, 30% students who kept going and 20% students who never got stuck.</>,
    <><strong>Learning</strong> is 70% the average test gain and 30% the share of replies that were questions or hints.</>,
  ] },
  { id: 'match', name: 'How the match works', bullets: () => [
    <>Your answers become a <strong>profile</strong> of five things.</>,
    <>We find the <strong>closest simulated students</strong> and rank tools by what worked for them.</>,
    <>If nobody in the class is close to you, we show <strong>no ranking</strong> rather than guess.</>,
  ] },
  { id: 'ethics', name: 'Ethics', bullets: () => [
    <>Your answers are <strong>not saved</strong>.</>,
    <>Results describe students like you and <strong>never label you</strong>.</>,
    <>Every page that shows simulated students says they are not real children.</>,
  ] },
]
const N = CHAPTERS.length                                    // chapters
const AT = (id) => CHAPTERS.findIndex((c) => c.id === id)    // a chapter's place in the film

// Each score's recipe: [share in %, part name, what it means]. The shares are the weights the About text gives.
const RECIPES = [
  { key: 'usability', name: 'Usability', parts: [
    [50, 'Reading', 'replies fit the student’s reading age.'],
    [30, 'Kept going', 'students stayed to the end.'],
    [20, 'Never stuck', 'nobody was left stuck.'],
  ] },
  { key: 'learning', name: 'Learning', parts: [
    [70, 'Test gain', 'points gained between the two tests, where 3 or more counts as full.'],
    [30, 'Thinking', 'replies that were questions or hints.'],
  ] },
]
// The words under each score's name in the "What we check" figure.
const LENS_WORDS = { usability: 'Easy to use', learning: 'Helps you learn' }
const PROFILE_KEYS =['start_level', 'learn_speed', 'reading', 'english', 'persistence'] // same order as PROFILE_STATS

// The saved class, read once: sorted from most to least like the example profile.
function readClass(arr) {
  const prof = PROFILE_STATS.map((s) => s.value)
  const dist = (s) => Math.hypot(...PROFILE_KEYS.map((k, i) => s.radar[k] - prof[i]))
  const order = arr.map((_, i) => i).sort((a, b) => dist(arr[a]) - dist(arr[b]))
  return { order }
}

// The class of 30 as a block of dots. `mark(i)` returns a class name for dot i.
function Dots({ cols = 10, mark = () => '' }) {
  return <div className="afd" style={{ '--cols': cols }} aria-hidden="true">{Array.from({ length: DOTS }, (_, i) => <i key={i} className={mark(i)} style={{ '--n': i }} />)}</div>
}
// A score from 1 to 5 as one bar, filled up to the score, with the number beside it.
function Meter({ value }) {
  if (value == null) return null
  return (
    <span className="afm" role="img" aria-label={`${value.toFixed(1)} out of 5`}>
      <i style={{ '--f': clamp(value / 5, 0, 1) }} />
      <b>{value.toFixed(1)}</b>
    </span>
  )
}
const Arrow = () => <span className="aff-arrow" aria-hidden="true" />

export default function AboutFilm({ facts = {} }) {
  const root = useRef(null), view = useRef(null), line = useRef(null)
  const cards = useRef([]), figs = useRef([]), navs = useRef([])
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  const [klass, setKlass] = useState(null) // the 30 saved students
  const [rows, setRows] = useState(null)   // the lab's ratings, one row per demo tool
  const [chapter, setChapter] = useState(0) // the chapter on screen: its stat wheel plays when it arrives

  useEffect(() => {
    let live = true
    getStudents().then((d) => {
      const arr = Array.isArray(d) ? d : d?.students
      if (live && arr && arr.length === DOTS && arr.every((x) => x.radar)) setKlass(readClass(arr))
    }).catch(() => {})
    getRatings().then((r) => { if (live && r?.rows?.length) setRows(r.rows) }).catch(() => {})
    return () => { live = false }
  }, [])

  useEffect(() => {
    if (reduced) return
    const el = root.current, vw = view.current
    let W = 1, H = 1, start = 0, travel = 1, stickyTop = 0, tickN = 0, current = -1, wide = true, lastCardH = 0, lastFigH = 0, wasPinned = false

    const measure = () => {
      const head = document.querySelector('.site-header')
      el.style.setProperty('--af-top', `${head ? head.offsetHeight : 60}px`)
      W = vw.clientWidth; H = vw.clientHeight; wide = W >= 900
      let x, y, w, h // the box the figure may use
      if (wide) {
        const card = cards.current[0]
        x = card.offsetLeft + card.offsetWidth + 40; w = W - Math.max(24, W * 0.04) - x
        y = 24; h = H - 24 - 72
      } else {
        // the card sits at the bottom, as tall as its tallest text; the figure gets everything above it
        vw.style.setProperty('--af-card-max', 'none') // measure the cards unclipped
        const cardH = Math.max(...cards.current.map((c) => c.scrollHeight)); lastCardH = cardH
        const cardTop = Math.max(H * 0.4, H - 54 - cardH)
        vw.style.setProperty('--af-card-top', `${cardTop}px`)
        vw.style.setProperty('--af-card-max', `${H - 54 - cardTop}px`)
        x = 16; w = W - 32; y = 14; h = cardTop - 30
      }
      for (const [k, v] of [['--fig-x', x], ['--fig-y', y], ['--fig-w', w], ['--fig-h', h]]) vw.style.setProperty(k, `${Math.round(v)}px`)
      // a figure that is too tall for its box is scaled down to fit (phones)
      lastFigH = 0
      figs.current.forEach((f) => { const inner = f?.firstElementChild; if (!inner) return; lastFigH += inner.offsetHeight; inner.style.setProperty('--fit', Math.min(1, h / inner.offsetHeight).toFixed(3)) })
      stickyTop = parseFloat(getComputedStyle(vw).top) || 0
      const r = el.getBoundingClientRect()
      start = r.top + window.scrollY - stickyTop      // scroll position where the view becomes pinned
      travel = Math.max(1, r.height - H)
    }

    // ---- one frame, from the playhead p (0 .. N - 1) ----
    const render = (p) => {
      const u = p // chapter c is at rest when u = c
      const now = clamp(Math.round(u), 0, N - 1)
      for (let i = 0; i < N; i++) {
        const d = u - i, ad = Math.abs(d), active = i === now
        const c = cards.current[i], f = figs.current[i]
        if (c) {
          const op = 1 - smooth(0.15, 0.5, ad)
          if (c._active !== active) { c._active = active; c.inert = !active; c.classList.toggle('is-active', active) }
          c.style.opacity = op.toFixed(3); c.style.visibility = op < 0.01 ? 'hidden' : 'visible'
          c.style.translate = `0 ${(-d * 36).toFixed(1)}px`
        }
        if (f) {
          const k = Math.round((1 - smooth(0.08, 0.5, ad)) * 100) / 100 // 0 = away, 1 = fully arrived; the parts of a figure arrive one after another (CSS)
          if (f._k !== k) { f._k = k; f.style.setProperty('--k', k); f.style.visibility = k < 0.01 ? 'hidden' : 'visible' }
        }
      }
      if (now !== current) {
        current = now; setChapter(now)
        navs.current.forEach((b, i) => { if (b) { b.classList.toggle('is-current', i === now); if (i === now) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current') } })
      }
      line.current.style.transform = `scaleX(${(p / (N - 1)).toFixed(4)})`
    }

    // Raw scroll -> playhead. Each chapter rests for the first and last fifth of its stretch, so a figure
    // stays whole for a while and the change happens in the middle, eased.
    const playhead = () => { const raw = clamp((window.scrollY - start) / travel, 0, 1) * (N - 1), c = Math.min(Math.floor(raw), N - 2); return c + smooth(0.2, 0.8, raw - c) }
    let head = -1 // the playhead that is drawn: it follows the real one softly, so fast flicks still unfold smoothly
    measure()
    window.addEventListener('resize', measure)
    if (document.fonts?.ready) document.fonts.ready.then(measure) // text sizes change once the fonts load
    const unsub = subscribe((s) => {
      if (++tickN % 30 === 0) { // layout can shift (fonts, data arriving, language)
        const figH = figs.current.reduce((n, f) => n + (f?.firstElementChild?.offsetHeight || 0), 0)
        const cardH = wide ? lastCardH : Math.max(...cards.current.map((c) => c.scrollHeight))
        if (Math.abs(figH - lastFigH) > 1 || Math.abs(cardH - lastCardH) > 1) measure()
        else { const r = el.getBoundingClientRect(); start = r.top + window.scrollY - stickyTop; travel = Math.max(1, r.height - H) }
      }
      const r = el.getBoundingClientRect()
      const pinned = r.top <= stickyTop + 2 && r.bottom >= stickyTop + H - 2 // the film has its own chapter numbers, so the corner crystal steps aside
      if (pinned !== wasPinned) { wasPinned = pinned; document.documentElement.classList.toggle('af-pinned', pinned) }
      if (r.bottom < -50 || r.top > window.innerHeight + 50) return // off screen: nothing to update
      head = Math.abs(playhead() - head) < 0.001 ? playhead() : damp(head, playhead(), 5, s.dt)
      render(head)
    })
    head = playhead(); render(head)
    // For checking a chapter without scrolling: window.__aboutFilm.seek(0..1)  (chapter c, counted from 0, is at c / (N - 1))
    window.__aboutFilm = {
      seek(v) {
        stopScroll() // stop any smooth-scroll glide first, or it would pull the page back
        measure()
        const f = clamp(v, 0, 1)
        window.scrollTo({ top: start + f * travel, behavior: 'instant' })
        head = playhead(); render(head)
      },
    }
    return () => { unsub(); window.removeEventListener('resize', measure); delete window.__aboutFilm; document.documentElement.classList.remove('af-pinned') }
  }, [reduced])

  const jump = (i) => {
    const el = root.current, r = el.getBoundingClientRect(), vh = view.current.clientHeight
    const top = parseFloat(getComputedStyle(view.current).top) || 0
    glideTo(r.top + window.scrollY - top + (i / (N - 1)) * (r.height - vh) + (i === 0 ? 0 : 2))
  }
  const f = facts

  // Real numbers for the worked examples.
  // most points gained first
  const byGain = rows ? [...rows].sort((a, b) => b.avg_gain.all - a.avg_gain.all) : []
  const maxGain = Math.max(0.1, ...byGain.map((r) => r.avg_gain.all))
  const best = byGain[0]                                  // the worked example for the recipe

  // One figure per chapter, looked up by the chapter's id.
  const FIGS = {
    method: <>
      <p className="aff-say">Every demo tool teaches the same class and sets the same test.</p>
      <ol className="aff-steps">
        <li><b><em>1</em>Test</b><span>10 fractions questions</span></li>
        <li><b><em>2</em>Lesson</b><span>With one demo tool</span></li>
        <li><b><em>3</em>Same test again</b><span>Gain is after minus before</span></li>
      </ol>
      <div className="aff-class"><Dots /><p className="aff-cap">One class of {DOTS} simulated students, taught by each demo tool in turn.</p></div>
      {byGain.length > 0 && (
        <div className="aff-block">
          <p className="aff-h">Average points gained, out of 10</p>
          <ul className="aff-gains">
            {byGain.map((r) => <li key={r.tutor_id}><span>{typeName(r.tutor_id, r.tutor_name)}</span><i style={{ '--w': Math.max(0.02, r.avg_gain.all / maxGain) }} /><b>+{r.avg_gain.all.toFixed(1)}</b></li>)}
          </ul>
        </div>
      )}
    </>,
    // every demo tool's two scores, as bars
    scores: <>
      <p className="aff-say">Each demo tool gets two scores, from 1 to 5.</p>
      <div className="aff-scores">
        <div className="aff-scores-head">
          <span />
          {DEMO_SCORES.map((key) => <span key={key}><b className="aff-h">{SCORE_LABEL[key]}</b>{LENS_WORDS[key]}</span>)}
        </div>
        {byGain.map((r) => (
          <div className="aff-score" key={r.tutor_id}>
            <b>{typeName(r.tutor_id, r.tutor_name)}</b>
            {DEMO_SCORES.map((key) => <Meter key={key} value={r.scores?.[key]} />)}
          </div>
        ))}
      </div>
    </>,
    // each score's recipe: one weight bar per part. Only the weights and the published score are shown.
    formula: <>
      <p className="aff-say">Every score is built from the same parts, with the same weights.</p>
      <div className="aff-recipes">
        {RECIPES.map((r) => (
          <div className="aff-recipe" key={r.key}>
            <p className="aff-recipe-head">
              <b className="aff-h">{r.name}</b>
              {best?.scores?.[r.key] != null && <span>{best.scores[r.key].toFixed(1)} out of 5</span>}
            </p>
            <ul className="aff-parts">
              {r.parts.map(([share, name, words]) => (
                <li key={name}>
                  <i className="aff-w" style={{ '--w': share / 100 }} aria-hidden="true" />
                  <b className="aff-pct">{share}%</b>
                  <span><strong>{name}</strong><span className="aff-words">: {words}</span></span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {best && <p className="aff-cap">The example scores are for the {typeName(best.tutor_id, best.tutor_name)} demo tool.</p>}
    </>,
    match: <>
      <p className="aff-say">We find the 5 simulated students most like you.</p>
      <div className="aff-match">
        <div className="aff-stack"><StatWheel stats={PROFILE_STATS} tone="ink" size={210} label="Example profile" active={reduced ? undefined : chapter === AT('match')} /><p className="aff-cap">Your profile (an example)</p></div>
        <Arrow />
        <div className="aff-stack">
          <Dots cols={5} mark={(i) => (i < 5 ? 'is-near' : 'is-dim')} />
          <p className="aff-cap"><i className="aff-key is-near" />The 5 closest are in the top row. The other {DOTS - 5} are not used.</p>
        </div>
      </div>
      <p className="aff-note">The class is sorted from most like you to least, and tools are ranked by what worked for the top 5.</p>
    </>,
    ethics: <>
      <p className="aff-say">Your answers are turned into a profile and then thrown away.</p>
      <div className="aff-flow">
        <div className="aff-stack"><div className="aff-answers" aria-hidden="true"><i /><i /><i /><i /></div><p className="aff-cap">Your answers</p></div>
        <Arrow />
        <div className="aff-stack"><StatWheel stats={PROFILE_STATS} tone="ink" size={150} label="Example profile" active={reduced ? undefined : chapter === AT('ethics')} /><p className="aff-cap">A profile of five things</p></div>
        <Arrow />
        <div className="aff-stack"><div className="afd" style={{ '--cols': 5 }} aria-hidden="true">{[0, 1, 2, 3, 4].map((i) => <i key={i} className="is-near" style={{ '--n': i * 4 }} />)}</div><p className="aff-cap">5 students like you</p></div>
      </div>
      <p className="aff-note">The lab keeps only your 5 profile numbers, and deletes them after 7 days.</p>
    </>,
  }

  return (
    <section className={`af${reduced ? ' af-static' : ''}`} ref={root} data-noscrub aria-label="The short version" style={{ '--af-n': N }}>
      <div className="af-view" ref={view}>
        {!reduced && (
          <div className="af-figs">
            {CHAPTERS.map((c, i) => (
              <div className="af-fig" key={c.id} ref={(el) => { figs.current[i] = el }}><div className="af-fig-in">{FIGS[c.id]}</div></div>
            ))}
          </div>
        )}
        <div className="af-cards">
          {CHAPTERS.map((c, i) => (
            <article className="af-card glass" key={c.id} ref={(el) => { cards.current[i] = el }}>
              <p className="af-tag" aria-hidden="true">{String(i + 1).padStart(2, '0')} / {String(N).padStart(2, '0')}</p>
              <h2 className="af-title">{c.name}</h2>
              <ul className="af-list">{c.bullets(f).map((b, j) => <li key={j}>{b}</li>)}</ul>
              {/* Reduced motion: the chapter's figure sits still inside its card, fully drawn */}
              {reduced && <div className="af-fig af-fig-static"><div className="af-fig-in">{FIGS[c.id]}</div></div>}
              <Link className="af-more" to={{ hash: `#${c.id}` }}>Read the detail <span aria-hidden="true">-&gt;</span></Link>
            </article>
          ))}
        </div>
        <nav className="af-nav" aria-label="Chapters">
          {CHAPTERS.map((c, i) => (
            <button key={c.id} type="button" ref={(el) => { navs.current[i] = el }} onClick={() => jump(i)} aria-label={c.name}>
              <span className="af-num">{String(i + 1).padStart(2, '0')}</span><span className="af-name"> {c.name}</span>
            </button>
          ))}
        </nav>
        <div className="af-line" aria-hidden="true"><i ref={line} /></div>
      </div>
    </section>
  )
}
