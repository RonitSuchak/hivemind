import { createElement, Fragment, useMemo } from 'react'
import { useMatch } from '../store.jsx'
import ru from './ru.js'
import hi from './hi.js'

// Hand-translated "beta" languages. English below is the source of truth (key -> string);
// ru.js and hi.js hold exactly the same keys. A missing key, or a language with no dictionary,
// falls back to English. Other languages are left to the browser's own translator (Translate.jsx).
//
// Placeholders: {name} is filled from the second argument of t(). **double stars** mark bold text;
// use t.rich(key) to get them as <strong> elements (React nodes, never HTML), so each language can
// put the bold words wherever its own word order wants them.
export const BETA = ['en', 'ru', 'hi']

export const en = {
  // header, footer, notices
  'skip': 'Skip to content',
  'nav.main': 'Main',
  'nav.footer': 'Footer',
  'nav.advisor': 'AI Advisor',
  'nav.tools': 'EdTech tools',
  'nav.lab': 'Simulation Lab',
  'nav.about': 'About',
  'notice.demo': 'Saved results from the lab, not live. Some demo tools are scripted previews until their full AI run is done.',
  'notice.offline': 'The lab is not connected, so there are no numbers or charts yet.',
  'notice.retry': 'Retry',
  'footer.tagline': 'Find the EdTech tool that works for students like you.',
  'footer.note': 'Students are simulated, not real children. Hivemind stores no names or answers.',

  // buttons used in more than one place
  'cta.check': 'Take the check',
  'cta.lab': 'See the lab',
  'cta.method': 'Read the method',

  // hero
  'hero.line1': 'Meet Hivemind, the #1 tool to',
  'hero.line2': 'find the EdTech tool that works for you.',
  'hero.lede': 'We test types of EdTech tool on a simulated class. You get a ranked list of the tool types that worked for students like you.',

  // how it works
  'how.title': 'How it works',
  'how.lede': 'Take a short check, get a ranked list. Your answers are not saved.',
  'how.1.title': 'Take a short check',
  'how.1.text': 'Pick your topic. A short quiz, a mini-lesson, a second quiz and some reading. Skip any you like. Your answers are not saved.',
  'how.2.title': 'Meet students like you',
  'how.2.text': 'We compare your profile with a simulated class. The closest students show which tool types worked for them.',
  'how.3.title': 'See who each tool type works for',
  'how.3.text': 'Each tool type gets three separate scores: safety, usability and learning. A serious safety failure is never averaged away.',

  // the class
  'class.title': 'One class. Every tool type.',
  'class.lede': 'Every tool type teaches the same class, so any difference comes from the teaching. Students vary in five ways: what they already know, how fast they pick up new ideas, reading, language and staying power.',
  'class.note': 'The students are simulated, not real children.',
  'class.list': 'The simulated class of 30',
  'class.student': '{name}, simulated student',
  'class.hint': 'Move over the class. Select a student to see their profile.',
  'class.sim': 'Simulated student, age {age}. Not a real child.',
  'class.seeLab': 'See {name} in the lab',

  // three checks
  'checks.title': 'We check three things.',
  'checks.safe.title': 'Safe',
  'checks.safe.text': 'It gets sums **right**, is **fair** to every group, keeps things **private** and responds with **care**.',
  'checks.easy.title': 'Easy to use',
  'checks.easy.text': 'You can **follow it** and **keep going**.',
  'checks.learn.title': 'Helps you learn',
  'checks.learn.text': 'You **improve**, and it makes you **think**.',
  'checks.note': 'Each one gets its **own score**. A demo tool with a serious safety fail is **ranked last**.',

  // languages section
  'langs.title': 'Which language do you speak?',
  'langs.lede': 'Pick your language. The site switches to it.',

  // finale
  'finale.title': 'See which tool types worked for students like you.',

  // language picker
  'picker.betaLabel': 'Translated by hand',
  'picker.other': "Other languages use your browser's own translator, so they may not work everywhere.",
  'picker.search': 'Search languages',
  'picker.placeholder': 'Type a language, like Polish or العربية',
  'picker.clear': 'Clear',
  'picker.list': 'Languages',
  'picker.noMatch': 'No language matches. Check the spelling, or type it in English.',
  'picker.count': '{n} languages. Type to find yours.',
  'picker.one': 'You picked {name}. Pick another to switch.',
  'picker.many': 'You picked {n} languages.',

  // translate bar
  'bar.beta': 'Beta: only the home page is in {lang} so far.',
  'bar.betaDone': 'Beta: the home page is in {lang}. Your browser translates the rest.',
  'bar.showEnglish': 'English',
}

export const DICTS = { en, ru, hi }

const fill = (s, vars) => (vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s)

// Plain function, usable outside React: translate('ru', 'nav.about')
export function translate(lang, key, vars) {
  return fill(DICTS[lang]?.[key] ?? en[key] ?? key, vars)
}

// "**bold**" parts become <strong> elements. The text itself stays a plain React text node.
function rich(s) {
  const parts = s.split('**')
  return createElement(Fragment, null, ...parts.map((p, i) => (i % 2 ? createElement('strong', { key: i }, p) : p)))
}

export function makeT(lang) {
  const t = (key, vars) => translate(lang, key, vars)
  t.rich = (key, vars) => rich(translate(lang, key, vars))
  return t
}

// const t = useT();  t('nav.about')  t.rich('checks.safe.text')
export function useT() {
  const { siteLang } = useMatch()
  return useMemo(() => makeT(siteLang), [siteLang])
}

// True when the site is showing a hand-translated language other than English. Those regions
// are marked [data-no-translate] so the browser translator leaves our own words alone.
export function useBetaActive() {
  const { siteLang } = useMatch()
  return siteLang !== 'en' && BETA.includes(siteLang)
}
// Spread onto an element: <header {...noTr}>. Empty in English, so English markup is unchanged.
export function useNoTranslate() {
  return useBetaActive() ? { 'data-no-translate': '' } : {}
}
