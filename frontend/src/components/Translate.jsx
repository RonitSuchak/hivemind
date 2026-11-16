import { useEffect, useRef, useState } from 'react'
import { useMatch } from '../store.jsx'
import { LANGUAGES } from '../data/languages.js'

// Shows the site in the language a student picked, using the browser's own built-in translator
// (Chrome's on-device Translator API). Nothing is sent to a server: the browser downloads a language
// pack once and translates on the device. Browsers without it get a plain message instead.
//
// How it works: every piece of visible text on the page is swapped for its translation, and the English
// is remembered so "Show in English" can put it back. New text that appears later (a new page, a
// changed number) is translated as it arrives. Anything inside [data-no-translate] is left alone
// (the Hivemind name, tool names, language names, equations in the background).

const RTL = new Set(['ar', 'ur', 'fa', 'ps'])
const SKIP = 'script,style,svg,code,[data-no-translate],.ambient,.sr-only-keep'
const hasLetters = (s) => /\p{L}{2,}/u.test(s)
// Some browsers expose the translator but never answer. Give up after a while and say so.
const within = (promise, ms) => Promise.race([promise, new Promise((_, no) => setTimeout(() => no(new Error('timeout')), ms))])

export function useSiteTranslation() {
  const { siteLang } = useMatch()
  const [status, setStatus] = useState({ state: 'idle', lang: 'en' }) // idle | preparing | working | done | unsupported | unavailable | error
  const originals = useRef(new WeakMap()) // text node -> { src, out }
  const touched = useRef(new Set())       // text nodes we changed, to restore

  useEffect(() => {
    const root = document.getElementById('root')
    const restore = () => {
      for (const n of touched.current) { const o = originals.current.get(n); if (o && n.isConnected) n.nodeValue = o.src }
      touched.current = new Set(); originals.current = new WeakMap()
      document.documentElement.lang = 'en'; document.documentElement.dir = 'ltr'
    }
    if (!siteLang || siteLang === 'en') { restore(); setStatus({ state: 'idle', lang: 'en' }); return }

    let off = false, observer = null, translator = null
    const cache = new Map()
    const queue = []
    let running = false

    const want = (n) => n.nodeType === 3 && n.parentElement && !n.parentElement.closest(SKIP) && hasLetters(n.nodeValue)
    const collect = (node) => {
      if (node.nodeType === 3) { if (want(node)) queue.push(node); return }
      if (node.nodeType !== 1 || node.matches?.(SKIP)) return
      const w = document.createTreeWalker(node, NodeFilter.SHOW_TEXT)
      for (let n = w.nextNode(); n; n = w.nextNode()) if (want(n)) queue.push(n)
    }
    const run = async () => {
      if (running || !translator) return
      running = true
      setStatus({ state: 'working', lang: siteLang })
      while (queue.length && !off) {
        const n = queue.shift()
        if (!n.isConnected) continue
        const known = originals.current.get(n)
        if (known && n.nodeValue === known.out) continue // already ours
        const src = n.nodeValue
        const lead = src.match(/^\s*/)[0], trail = src.match(/\s*$/)[0], core = src.trim()
        try {
          let out = cache.get(core)
          if (out === undefined) { out = await translator.translate(core); cache.set(core, out) }
          if (off || !n.isConnected || n.nodeValue !== src) continue
          const text = lead + out + trail
          originals.current.set(n, { src, out: text }); touched.current.add(n)
          n.nodeValue = text
        } catch { /* leave this piece in English */ }
      }
      running = false
      if (!off) setStatus({ state: 'done', lang: siteLang })
    }

    ;(async () => {
      if (!('Translator' in self)) { setStatus({ state: 'unsupported', lang: siteLang }); return }
      setStatus({ state: 'preparing', lang: siteLang })
      try {
        const pair = { sourceLanguage: 'en', targetLanguage: siteLang }
        const can = await within(self.Translator.availability(pair), 8000)
        if (off) return
        if (can === 'unavailable') { setStatus({ state: 'unavailable', lang: siteLang }); return }
        // The first use of a language downloads its pack, which can take a while: allow two minutes.
        translator = await within(self.Translator.create({
          ...pair,
          monitor(m) { m.addEventListener('downloadprogress', (e) => { if (!off) setStatus({ state: 'preparing', lang: siteLang, progress: e.loaded }) }) },
        }), 120000)
        if (off) { translator.destroy?.(); return }
        document.documentElement.lang = siteLang
        document.documentElement.dir = RTL.has(siteLang) ? 'rtl' : 'ltr'
        collect(root)
        observer = new MutationObserver((list) => {
          for (const m of list) {
            if (m.type === 'characterData') collect(m.target)
            else m.addedNodes.forEach(collect)
          }
          run()
        })
        observer.observe(root, { childList: true, subtree: true, characterData: true })
        run()
      } catch (e) { if (!off) setStatus({ state: e?.message === 'timeout' ? 'stalled' : 'error', lang: siteLang }) }
    })()

    return () => { off = true; observer?.disconnect(); translator?.destroy?.(); restore() }
  }, [siteLang])

  return status
}

// Small bar, bottom left, on every page while a translation is on (or could not be done).
export function TranslateBar({ status }) {
  const { setSiteLang } = useMatch()
  if (status.state === 'idle') return null
  const lang = LANGUAGES.find((l) => l.id === status.lang)
  const name = lang ? lang.own : status.lang
  const text = {
    preparing: `Getting ${name} ready${status.progress != null && status.progress < 1 ? ` (${Math.round(status.progress * 100)}%)` : ''}`,
    working: `Translating to ${name}`,
    done: `Shown in ${name}. Translated by your browser, so it may not be perfect.`,
    unsupported: `This browser cannot translate pages by itself. Try Chrome on a computer, or use your browser's Translate button.`,
    unavailable: `Your browser cannot translate to ${name} yet.`,
    error: `The translation did not start. Try again in a moment.`,
    stalled: `Your browser's translator did not answer. Try Chrome on a computer, or use your browser's Translate button.`,
  }[status.state]
  return (
    <div className="trbar" role="status" data-no-translate>
      <span>{text}</span>
      <button type="button" className="btn btn-small" onClick={() => setSiteLang('en')}>Show in English</button>
    </div>
  )
}
