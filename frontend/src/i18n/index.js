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
  'nav.suggest': 'Suggest an idea',
  'notice.offline': 'The lab is not connected, so there are no numbers or charts yet.',
  'notice.fallback': 'The lab is not connected, so these are saved results.',
  'notice.retry': 'Retry',
  'footer.tagline': 'Find the EdTech tool that works for students like you.',
  'footer.note': 'Students are simulated, not real children.',

  // buttons used in more than one place
  'cta.check': 'Take the check',
  'cta.lab': 'See the lab',
  'cta.method': 'Read the method',

  // hero
  'hero.line1': 'Hivemind,',
  'hero.line2': 'find the EdTech tool that works for you',
  'hero.lede': 'We test types of EdTech tool on a simulated class. You get a ranked list of the tool types that worked for students like you.',

  // who it is for (the three users the challenge names)
  'who.title': 'Who the lab is for',
  'who.lede': 'In the lab, every score links to the words behind it, so anyone can check it.',
  'who.maker.title': 'Tool makers',
  'who.maker.text': 'See which learners your tool leaves behind, and why, with the chats that show it.',
  'who.maker.cta': 'Open a report',
  'who.school.title': 'Schools and teachers',
  'who.school.text': 'Compare tool types for each kind of student in your class.',
  'who.school.cta': 'Compare by student group',
  'who.judge.title': 'Judges and reviewers',
  'who.judge.text': 'Open any score to read the evidence behind it.',
  'who.judge.cta': 'See the evidence',
  'who.judge.more': 'Read the method',

  // how it works
  'how.title': 'How it works',
  'how.lede': 'A short check gives you a ranked list of tool types, and your answers are not saved.',
  'how.1.title': 'Take a short check',
  'how.1.text': 'You take a quiz, a mini-lesson and the quiz again, and you can skip any step.',
  'how.2.title': 'Meet students like you',
  'how.2.text': 'We find the simulated students closest to you.',
  'how.3.title': 'See who each tool type works for',
  'how.3.text': 'Each tool type gets a score for how easy it is to use and a score for how much students learn.',

  // the class
  'class.title': 'Every tool type teaches the same class',
  'class.lede': 'The same 30 simulated students take every lesson, so a difference in results comes from the tool. The students differ in level, speed, reading, language and staying power.',
  'class.note': 'The students are simulated, not real children.',
  'class.list': 'The simulated class of 30',
  'film.you': 'a student like you', // the orange dot's legend in the home film
  'class.student': '{name}, simulated student',
  'class.hint': 'Move over the class and select a student to see their profile.',
  'class.sim': 'Simulated student, age {age}. Not a real child.',
  'class.seeLab': 'See {name} in the lab',

  // what we check: two scores for tool types, safety only for specific EdTech tools
  'checks.title': 'What we check',
  'checks.safe.title': 'Safe',
  'checks.safe.text': 'For specific EdTech tools we also check safety: sums are **right**, personal details stay **private**, and an upset student gets **care**.',
  'checks.easy.title': 'Easy to use',
  'checks.easy.text': 'You can **follow it** and **keep going**.',
  'checks.learn.title': 'Helps you learn',
  'checks.learn.text': 'You **improve**, and it makes you **think**.',
  'checks.note': 'Tool types get a score for **easy to use** and for **helps you learn**. Safety is scored only for **specific EdTech tools**.',

  // languages section
  'langs.title': 'Language',
  'langs.lede': 'Pick a language and the site switches to it.',

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
  'picker.count': 'Type to find yours among {n} languages.',
  'picker.one': 'You picked {name}. Pick another to switch.',
  'picker.many': 'You picked {n} languages.',

  // translate bar
  'bar.beta': 'The site is shown in {lang}. Quoted chat messages and tool names stay in English.',
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
