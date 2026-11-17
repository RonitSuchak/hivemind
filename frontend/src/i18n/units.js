// Turning a piece of English page text into a look-up key, and a translated template back into text.
// Used by components/Translate.jsx on the page and by scripts/check-i18n.mjs when the word lists are checked.
//
// A "unit" is one sentence or label as the reader sees it, even when the page builds it from several pieces:
//   "Tested 17 Nov 2026 on 30 simulated students"  ->  key "Tested {d0} on {n0} simulated students"
//   "Each one gets its <strong>own score</strong>"  ->  key "Each one gets its [[own score]]"
// Slots keep the changing parts out of the key, so one translation covers every number, date and name:
//   {n0} a number   {d0} a date   {s0} a simulated student's name   {t0} the name of a real tool
// [[ ]] marks words inside bold, a link or another inline element. A translation keeps the same slots and
// the same number of [[ ]] pairs, in the same order, and may move them inside the sentence.

export const STUDENTS = ['Aisha', 'Ben', 'Chen', 'Dara', 'Emre', 'Fatima', 'Linh', 'Gabriel', 'Hana', 'Isaac', 'Jaya', 'Kwame', 'Lena', 'Mateo', 'Noor', 'Oscar', 'Priya', 'Quinn', 'Rahim', 'Sofia', 'Tomasz', 'Uma', 'Victor', 'Wen', 'Xavier', 'Yara', 'Zain', 'Amara', 'Bilal', 'Chloe']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_IN = {
  ru: ['янв.', 'февр.', 'мар.', 'апр.', 'мая', 'июн.', 'июл.', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.'],
  hi: ['जन॰', 'फ़र॰', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुल॰', 'अग॰', 'सित॰', 'अक्टू॰', 'नव॰', 'दिस॰'],
}
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const DATE = new RegExp(`\\b(\\d{1,2}) (${MONTHS.join('|')}) (\\d{4})\\b`, 'g')
const STUDENT = new RegExp(`(?<![\\p{L}\\d])(${STUDENTS.join('|')})(?![\\p{L}\\d])`, 'gu')
const NUMBER = /\d+(?:[.,]\d+)*/g
const MARK = '\u0001' // stands in for a slot while the others are found, so digits inside a slot are never counted twice

// names: extra proper names to keep as they are (real tool names), longest first
export function toolPattern(names) {
  const list = [...new Set(names)].filter((n) => n && n.length >= 3).sort((a, b) => b.length - a.length)
  return list.length ? new RegExp(`(?<![\\p{L}\\d])(${list.map(esc).join('|')})(?![\\p{L}\\d])`, 'gu') : null
}

// English text in, { key, slots } out. `slots` holds the real values in the order they appeared.
export function slotify(text, tools = null) {
  const slots = { d: [], t: [], s: [], n: [] }
  let s = text.replace(/\s+/g, ' ').trim()
  s = s.replace(DATE, (m) => { slots.d.push(m); return `${MARK}d${MARK}` })
  if (tools) s = s.replace(tools, (m) => { slots.t.push(m); return `${MARK}t${MARK}` })
  s = s.replace(STUDENT, (m) => { slots.s.push(m); return `${MARK}s${MARK}` })
  s = s.replace(NUMBER, (m) => { slots.n.push(m); return `${MARK}n${MARK}` })
  const count = { d: 0, t: 0, s: 0, n: 0 }
  const key = s.replace(new RegExp(`${MARK}([dtsn])${MARK}`, 'g'), (_, k) => `{${k}${count[k]++}}`)
  return { key, slots }
}

// True when a key still has real words in it once slots and marks are taken out ("{n0} / {n1}" has none).
export const hasWords = (key) => /\p{L}{2,}/u.test(key.replace(/\{[dtsn]\d+\}/g, '').replace(/\[\[|\]\]/g, ''))

const localDate = (en, lang) => {
  const m = en.match(/^(\d{1,2}) (\w{3}) (\d{4})$/), names = MONTHS_IN[lang]
  return m && names ? `${m[1]} ${names[MONTHS.indexOf(m[2])]} ${m[3]}` : en
}

// A translated template plus the real values in, finished text out (still with its [[ ]] marks).
export function fill(template, slots, lang) {
  return template.replace(/\{([dtsn])(\d+)\}/g, (m, k, i) => {
    const v = slots[k]?.[Number(i)]
    return v == null ? m : k === 'd' ? localDate(v, lang) : v
  })
}

// "a [[b]] c" -> [{ inline: false, text: 'a ' }, { inline: true, text: 'b' }, { inline: false, text: ' c' }]
export function pieces(text) {
  return text.split(/(\[\[.*?\]\])/).filter((p) => p !== '').map((p) => (p.startsWith('[[') && p.endsWith(']]') ? { inline: true, text: p.slice(2, -2) } : { inline: false, text: p }))
}

// What must match between an English key and its translation: the same slots, and the same number of [[ ]] pairs.
export function shapeOf(s) {
  return {
    slots: (s.match(/\{[dtsn]\d+\}/g) || []).sort().join(' '),
    marks: (s.match(/\[\[/g) || []).length,
    closed: (s.match(/\[\[/g) || []).length === (s.match(/\]\]/g) || []).length,
  }
}
export function sameShape(key, translation) {
  const a = shapeOf(key), b = shapeOf(translation)
  return b.closed && a.slots === b.slots && a.marks === b.marks
}
