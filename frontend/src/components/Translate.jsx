import { useEffect, useRef, useState } from 'react'
import { useMatch } from '../store.jsx'
import { LANGUAGES } from '../data/languages.js'
import { TOOLS } from '../data/tools.js'
import { BETA, useT } from '../i18n/index.js'
import { fill, hasWords, pieces, slotify, toolPattern } from '../i18n/units.js'

// Shows the whole site in the language a student picked.
//
// Russian and Hindi ("beta" languages) come with the site: a word list for every page (i18n/pages/ru.json and
// hi.json), so they work in every browser. The home page, header and footer have their own hand-written
// dictionary (i18n/ru.js, hi.js) and are marked [data-no-translate], so this file leaves them alone.
// Every other language uses the browser's own built-in translator (Chrome only), as before.
//
// How it works: the page is read sentence by sentence (a "unit": see i18n/units.js). Each unit is looked up
// in the word list and the translation is written into the text that is already on the page. The English is
// remembered, so switching back restores it. New text that appears later is handled as it arrives.
// A unit with no entry is noted (window.__i18n.misses) and, where the browser has a translator, sent to it.
//
// Left in English on purpose: quoted chat messages and replies (they are evidence, the tool's exact words),
// the reading passages of the check (they measure reading in English), and the names of tools and courses.

const RTL = new Set(['ar', 'ur', 'fa', 'ps'])
// Never translated. The last group is quoted evidence and the English reading test.
const SKIP = 'script,style,code,[data-no-translate],.ambient,.sr-only-keep,.lx-msg-text,.lx-evidence,blockquote,.tr-text,.ck-passage > p:not(.ck-passage-label),.tp-url,.tk-list,.tk-chosen-text'
const INLINE = new Set(['STRONG', 'B', 'EM', 'I', 'A', 'SPAN', 'SMALL', 'ABBR', 'MARK', 'U', 'SUB', 'SUP', 'TEXTPATH', 'TSPAN'])
const ATTRS = ['placeholder', 'aria-label', 'title']
const TOOL_NAMES = toolPattern([...TOOLS.map((t) => t.name), 'ChatGPT (study mode)', 'Gemini (Guided Learning)', 'Microsoft Copilot', 'ChatGPT', 'Gemini', 'Perplexity', 'Hivemind'])
const hasLetters = (s) => /\p{L}{2,}/u.test(s)
// Some browsers expose the translator but never answer. Give up after a while and say so.
const within = (promise, ms) => Promise.race([promise, new Promise((_, no) => setTimeout(() => no(new Error('timeout')), ms))])
// Word lists that ship with the site, loaded only when that language is picked.
const LISTS = { ru: () => import('../i18n/pages/ru.json'), hi: () => import('../i18n/pages/hi.json') }
// For building the word lists: localStorage.i18nCollect = '1' records every unit's key while you browse in English.
const collecting = () => { try { return localStorage.getItem('i18nCollect') === '1' } catch { return false } }

export function useSiteTranslation() {
  const { siteLang } = useMatch()
  const [status, setStatus] = useState({ state: 'idle', lang: 'en' }) // idle | preparing | working | done | unsupported | unavailable | error
  const texts = useRef(new WeakMap())   // text node -> { src, out }: the English and what we wrote
  const attrs = useRef(new WeakMap())   // element -> { name: { src, out } }
  const touched = useRef(new Set())     // text nodes and elements we changed, to restore

  useEffect(() => {
    const root = document.body // the whole page: drawers and pop-up panels are added to the body, outside #root
    const collect = collecting()
    const restore = () => {
      for (const n of touched.current) {
        if (!n.isConnected) continue
        if (n.nodeType === 3) { const o = texts.current.get(n); if (o && n.nodeValue === o.out) n.nodeValue = o.src }
        else { const o = attrs.current.get(n) || {}; for (const k in o) if (n.getAttribute(k) === o[k].out) n.setAttribute(k, o[k].src) }
      }
      touched.current = new Set(); texts.current = new WeakMap(); attrs.current = new WeakMap()
      document.documentElement.lang = 'en'; document.documentElement.dir = 'ltr'
    }
    // Only the hand-translated languages change the site (LanguagePicker lists the rest as not translated yet).
    if ((!siteLang || siteLang === 'en' || !BETA.includes(siteLang)) && !collect) { restore(); setStatus({ state: 'idle', lang: 'en' }); return }
    const lang = siteLang || 'en'
    document.documentElement.lang = lang
    document.documentElement.dir = RTL.has(lang) ? 'rtl' : 'ltr'

    let off = false, observer = null, translator = null, list = null, timer = 0
    const misses = new Set(), keys = new Map(), cache = new Map(), pending = new Set(), later = []
    window.__i18n = { misses: () => [...misses], keys: () => Object.fromEntries(keys) }
    const saveKeys = () => { try { localStorage.setItem('i18nKeys', JSON.stringify({ ...JSON.parse(localStorage.getItem('i18nKeys') || '{}'), ...Object.fromEntries(keys) })) } catch { /* full or blocked */ } }

    // The English of a text node: what is there now, unless what is there is our own translation.
    const srcOf = (n) => { const o = texts.current.get(n); return o && n.nodeValue === o.out ? o.src : n.nodeValue }
    const skipped = (el) => !el || !!el.closest(SKIP) || (!!el.closest('svg') && !el.closest('text'))
    const inline = (el) => INLINE.has(el.tagName.toUpperCase()) && (el.namespaceURI !== 'http://www.w3.org/1999/xhtml' || getComputedStyle(el).display === 'inline')
    // The block a piece of text belongs to: the nearest parent that is not bold, a link or another inline element.
    const blockOf = (n) => { let el = n.nodeType === 3 ? n.parentElement : n; while (el && el !== root && inline(el)) el = el.parentElement; return el }

    // Cut one block into units: runs of text, broken by line breaks, skipped parts and inner blocks.
    const unitsOf = (block) => {
      const units = []; let cur = []
      const flush = () => { if (cur.length) units.push(cur); cur = [] }
      const walk = (el) => {
        for (const c of el.childNodes) {
          if (c.nodeType === 3) cur.push(c)
          else if (c.nodeType === 1) {
            if (c.tagName === 'BR' || c.matches(SKIP) || !inline(c)) flush()
            else walk(c)
          }
        }
      }
      walk(block); flush()
      return units
    }

    const write = (n, text) => {
      const src = srcOf(n)
      texts.current.set(n, { src, out: text }); touched.current.add(n)
      if (n.nodeValue !== text) n.nodeValue = text
    }
    // One unit: build its key, look it up, write the translation back into the same text nodes.
    const doUnit = (nodes) => {
      const groups = [] // runs of nodes that share a parent: one run per bold word, link and so on
      for (const n of nodes) { const g = groups[groups.length - 1]; if (g && g.parent === n.parentElement) g.nodes.push(n); else groups.push({ parent: n.parentElement, nodes: [n] }) }
      const block = blockOf(nodes[0])
      const english = groups.map((g) => { const t = g.nodes.map(srcOf).join(''); return g.parent === block ? t : `[[${t}]]` }).join('')
      if (!hasLetters(english)) return
      const { key, slots } = slotify(english.replace(/\[\[(\s*)\]\]/g, '$1'), TOOL_NAMES)
      if (!hasWords(key)) return
      if (collect) { if (!keys.has(key)) keys.set(key, english.replace(/\s+/g, ' ').trim()) }
      if (lang === 'en') return
      const template = list?.[key]
      if (template == null) { if (list) misses.add(key); for (const n of nodes) if (hasLetters(srcOf(n))) later.push(n); return }
      // spread the translated pieces over the runs, in order: [[ ]] pieces go to the inline runs, the rest between them
      const out = groups.map(() => '')
      const inlineAt = groups.map((g, i) => (g.parent === block ? -1 : i)).filter((i) => i >= 0)
      let seen = 0
      for (const p of pieces(fill(template, slots, lang))) {
        if (p.inline && inlineAt[seen] != null) { out[inlineAt[seen]] += p.text; seen++; continue }
        const lo = seen ? inlineAt[seen - 1] + 1 : 0, hi = inlineAt[seen] ?? groups.length
        let at = -1
        for (let i = lo; i < hi; i++) if (groups[i].parent === block) { at = i; break }
        if (at < 0) at = lo < groups.length ? Math.min(lo, groups.length - 1) : groups.length - 1
        out[at] += p.text
      }
      const first = srcOf(nodes[0]), last = srcOf(nodes[nodes.length - 1])
      out[0] = first.match(/^\s*/)[0] + out[0].replace(/^\s+/, '')
      out[out.length - 1] = out[out.length - 1].replace(/\s+$/, '') + last.match(/\s*$/)[0]
      groups.forEach((g, i) => g.nodes.forEach((n, k) => write(n, k === 0 ? out[i] : '')))
    }
    const doAttrs = (el) => {
      if (skipped(el)) return
      for (const name of ATTRS) {
        const now = el.getAttribute(name); if (now == null) continue
        const known = (attrs.current.get(el) || {})[name]
        const src = known && now === known.out ? known.src : now
        if (!hasLetters(src)) continue
        const { key, slots } = slotify(src, TOOL_NAMES)
        if (!hasWords(key)) continue
        if (collect && !keys.has(key)) keys.set(key, src)
        const template = lang === 'en' ? null : list?.[key]
        if (template == null) { if (list && lang !== 'en') misses.add(key); continue }
        const out = fill(template, slots, lang).replace(/\[\[|\]\]/g, '')
        attrs.current.set(el, { ...(attrs.current.get(el) || {}), [name]: { src, out } }); touched.current.add(el)
        if (now !== out) el.setAttribute(name, out)
      }
    }

    // The browser's own translator, one text node at a time: other languages, and units our lists do not have.
    let busy = false
    const runLater = async () => {
      if (busy || !translator) return
      busy = true
      while (later.length && !off) {
        const n = later.shift()
        if (!n.isConnected) continue
        const src = srcOf(n), core = src.trim()
        if (!core || texts.current.get(n)?.out === n.nodeValue) continue
        try {
          let out = cache.get(core)
          if (out === undefined) { out = await translator.translate(core); cache.set(core, out) }
          if (off || !n.isConnected || srcOf(n) !== src) continue
          write(n, src.match(/^\s*/)[0] + out + src.match(/\s*$/)[0])
        } catch { /* leave this piece in English */ }
      }
      busy = false
    }

    const flush = () => {
      timer = 0
      const blocks = [...pending]; pending.clear()
      observer?.disconnect()
      for (const b of blocks) {
        if (!b.isConnected) continue
        if (b.nodeType === 1 && ATTRS.some((a) => b.hasAttribute(a))) doAttrs(b)
        if (skipped(b)) continue
        for (const u of unitsOf(b)) doUnit(u)
      }
      if (collect) saveKeys()
      observe()
      if (list || lang === 'en') { if (!off && lang !== 'en') setStatus({ state: 'done', lang }) }
      runLater()
    }
    const want = (node) => {
      if (node.nodeType === 3) { if (node.parentElement && !skipped(node.parentElement)) pending.add(blockOf(node)) }
      else if (node.nodeType === 1) {
        if (node.matches(SKIP)) return
        const w = document.createTreeWalker(node, NodeFilter.SHOW_TEXT)
        for (let n = w.nextNode(); n; n = w.nextNode()) if (n.parentElement && !skipped(n.parentElement)) pending.add(blockOf(n))
        if (ATTRS.some((a) => node.hasAttribute(a))) pending.add(node)
        node.querySelectorAll(ATTRS.map((a) => `[${a}]`).join(',')).forEach((el) => pending.add(el))
      }
      if (!timer) timer = setTimeout(flush, 30)
    }
    const observe = () => observer?.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS })
    const start = () => {
      observer = new MutationObserver((records) => {
        for (const m of records) {
          if (m.type === 'characterData') { const o = texts.current.get(m.target); if (!o || m.target.nodeValue !== o.out) want(m.target) }
          else if (m.type === 'attributes') want(m.target)
          else { m.addedNodes.forEach(want); if (m.removedNodes.length && m.target.isConnected) want(m.target) }
        }
      })
      want(root)
    }

    ;(async () => {
      const beta = BETA.includes(lang) && LISTS[lang]
      if (beta) { try { list = (await LISTS[lang]()).default } catch { list = {} } }
      if (off) return
      if (beta || lang === 'en') start()
      if (lang === 'en') return
      // The browser's translator: the only way for other languages, a quiet helper for Russian and Hindi.
      if (!('Translator' in self)) { if (!beta) setStatus({ state: 'unsupported', lang }); return }
      if (!beta) setStatus({ state: 'preparing', lang })
      try {
        const pair = { sourceLanguage: 'en', targetLanguage: lang }
        const can = await within(self.Translator.availability(pair), 8000)
        if (off) return
        if (can === 'unavailable') { if (!beta) setStatus({ state: 'unavailable', lang }); return }
        if (beta && can !== 'available') return // never start a download just to fill a few gaps
        // The first use of a language downloads its pack, which can take a while: allow two minutes.
        translator = await within(self.Translator.create({
          ...pair,
          monitor(m) { m.addEventListener('downloadprogress', (e) => { if (!off && !beta) setStatus({ state: 'preparing', lang, progress: e.loaded }) }) },
        }), 120000)
        if (off) { translator.destroy?.(); return }
        if (!beta) { setStatus({ state: 'working', lang }); start(); setTimeout(() => { if (!off) setStatus({ state: 'done', lang }) }, 1500) }
        runLater()
      } catch (e) { if (!off && !beta) setStatus({ state: e?.message === 'timeout' ? 'stalled' : 'error', lang }) }
    })()

    return () => { off = true; clearTimeout(timer); observer?.disconnect(); translator?.destroy?.(); restore() }
  }, [siteLang])

  return status
}

// Small bar, bottom left, on every page while a translation is on (or could not be done).
export function TranslateBar({ status }) {
  const { setSiteLang } = useMatch()
  const t = useT()
  if (status.state === 'idle') return null
  const lang = LANGUAGES.find((l) => l.id === status.lang)
  const name = lang ? lang.own : status.lang
  // Beta languages: words come from our dictionary, and every translator problem reads as the same calm note.
  const beta = status.lang !== 'en' && BETA.includes(status.lang)
  const text = beta ? t('bar.beta', { lang: lang ? lang.name : status.lang }) : {
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
      <button type="button" className="btn btn-small" onClick={() => setSiteLang('en')}>{t('bar.showEnglish')}</button>
    </div>
  )
}
