// Topics a student can pick for the check. `pack` says where its questions come from:
//   'default'  the check the lab serves (maths: fractions)
//   '<id>'     a made-up demo pack in public/demo/topics/<id>.json (demo mode only)
//   null       not written yet: shown as "Coming soon" and cannot be started
// A pack swaps the first quiz, the mini-lesson and the second quiz. Reading, English and the
// "when stuck" question stay the same for every topic.
// `exact` is true only when the topic has its own questions. Every other topic starts the general
// check for its subject (see PACK_BY_SUBJECT), or stays "Coming soon" when its subject has none.
// `words` are extra search words a student might type.
// Exam programme topics (data/programmes.js) are added at the bottom and also carry
// `programme`, `programmeShort`, `unit`, `board`, `level`, `region` and `code` (the exam code).
// A programme can also be picked as a whole: searchTopics puts a "whole programme" entry first
// (`isProgramme: true`, name = the programme's short title) when the query is its code or its title.
import { PROGRAMMES } from './programmes.js'

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

// There are only eight question packs, so a subject falls back to the one written for it. A subject with
// no pack of its own stays "Coming soon": a Biology topic never starts a Physics check, and French never
// starts the Spanish one. Physics has two: a school-level pack and an A level one (beta).
const PACK_BY_SUBJECT = {
  Maths: 'default', 'Further Maths': 'further-maths-complex', Physics: 'science-forces', 'Combined Science': 'science-forces',
  'Computer Science': 'computing-binary', Economics: 'economics-elasticity', English: 'english-apostrophes',
}
const ADVANCED = /a level|ib/i
const packFor = (subject, level = '') => (subject === 'Physics' && ADVANCED.test(level) ? 'physics-projectiles' : PACK_BY_SUBJECT[subject] ?? null)
// The three A level packs are a first try ("Beta").
const BETA_PACKS = new Set(['economics-elasticity', 'further-maths-complex', 'physics-projectiles'])

// A topic that names its own pack has its own questions (exact). Otherwise it uses the subject's general pack.
const T = (subject, name, words = '', pack = null) => {
  const use = pack ?? packFor(subject)
  return { id: `${subject}-${name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'), subject, name, words, pack: use, exact: !!pack, beta: BETA_PACKS.has(use) }
}

// Each subject is its own section. Computer Science is not part of Science, Further Maths is not part of
// Maths, and the three sciences are separate (Combined Science is the GCSE course that covers all three).
export const SUBJECTS = ['Maths', 'Further Maths', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Economics', 'English', 'Languages', 'Geography', 'History']

export const TOPICS = [
  T('Maths', 'Fractions', 'half quarter third numerator denominator equivalent', 'default'),
  T('Maths', 'Sharing in a ratio', 'ratios proportion share split parts'),
  T('Further Maths', 'Complex numbers: conjugates and dividing', 'complex conjugate divide division imaginary i argand a level', 'further-maths-complex'),
  T('Physics', 'Projectile motion', 'projectiles horizontal vertical suvat kinematics mechanics a level', 'physics-projectiles'),
  T('Economics', 'Price elasticity of demand', 'ped elastic inelastic revenue demand a level', 'economics-elasticity'),
  T('Maths', 'Percentages', 'percent discount sale increase'),
  T('Maths', 'Solving equations', 'algebra x unknown balance'),
  T('Maths', 'Area and perimeter', 'shapes rectangle triangle length'),
  T('Maths', 'Angles', 'degrees triangle parallel lines geometry'),
  T('Maths', 'Probability', 'chance dice likely'),
  T('Maths', 'Negative numbers', 'minus below zero temperature'),
  T('Maths', 'Decimals', 'point tenths hundredths place value'),
  T('Maths', 'Times tables', 'multiply multiplication'),
  T('English', 'Apostrophes', "possession punctuation its it's grammar", 'english-apostrophes'),
  T('English', 'Commas', 'punctuation lists clauses grammar'),
  T('English', 'Spelling', 'words letters'),
  T('English', 'Sentence types', 'grammar clause simple compound complex'),
  T('English', 'Persuasive writing', 'essay argument techniques'),
  T('English', 'Reading for meaning', 'comprehension inference text'),
  T('Physics', 'Forces', 'physics newtons balanced unbalanced resultant push pull', 'science-forces'),
  T('Physics', 'Electricity and circuits', 'physics current voltage bulb battery'),
  T('Biology', 'Cells', 'biology nucleus membrane microscope'),
  T('Chemistry', 'States of matter', 'chemistry solid liquid gas particles'),
  T('Biology', 'Photosynthesis', 'biology plants light leaves'),
  T('Chemistry', 'Acids and alkalis', 'chemistry pH indicator neutral'),
  T('Physics', 'The solar system', 'physics space planets sun moon'),
  T('Computer Science', 'Binary numbers', 'bits ones zeros base 2 computer science', 'computing-binary'),
  T('Computer Science', 'Algorithms', 'steps flowchart sorting computer science'),
  T('Computer Science', 'Python basics', 'coding programming variables code'),
  T('Digital skills', 'Spreadsheets', 'formulas cells excel sheets'),
  T('Digital skills', 'Staying safe online', 'internet passwords privacy'),
  T('Languages', 'Spanish basics', 'español el la greetings mfl', 'languages-spanish-basics'),
  T('Languages', 'French basics', 'français le la greetings mfl'),
  T('Languages', 'German basics', 'deutsch der die das greetings mfl'),
  T('Languages', 'Mandarin basics', 'chinese pinyin tones greetings mfl'),
  T('Geography', 'Map skills', 'geography grid references compass scale'),
  T('Geography', 'Rivers', 'geography erosion meander flood'),
  T('History', 'The Romans', 'history empire rome'),
  T('History', 'World War Two', 'history ww2 second world war'),
]


// Exam programme topics: one per topic name, with the programme and unit it belongs to.
const programmeTopic = (p, unit, name) => ({
  id: `${p.id}--${slug(unit.name)}--${slug(name)}`, subject: p.subject, name, words: '', pack: packFor(p.subject, p.level), exact: false, beta: BETA_PACKS.has(packFor(p.subject, p.level)),
  programme: p.title, programmeShort: p.short, unit: unit.name, board: p.board, level: p.level, region: p.region, code: p.code,
})
// The whole course as one pickable entry. It works like any topic (same subject pack, never exact).
const programmeEntry = (p, topicCount) => ({
  id: `${p.id}--programme`, subject: p.subject, name: p.short, words: '', pack: packFor(p.subject, p.level), exact: false, isProgramme: true, beta: BETA_PACKS.has(packFor(p.subject, p.level)),
  programme: p.title, programmeShort: p.short, unit: null, board: p.board, level: p.level, region: p.region, code: p.code,
  unitCount: p.units.length, topicCount,
})
const PROGRAMME_TOPICS = PROGRAMMES.flatMap((p) => p.units.flatMap((u) => u.topics.map((name) => programmeTopic(p, u, name))))
TOPICS.push(...PROGRAMME_TOPICS)

// All topics of one programme, in unit order.
const BY_PROGRAMME = new Map(PROGRAMMES.map((p) => [p.id, PROGRAMME_TOPICS.filter((t) => t.programme === p.title)]))
export const programmeTopics = (programmeId) => BY_PROGRAMME.get(programmeId) ?? []

// Words that find a subject besides its own name. "science" means the sciences: Computer Science is its own
// section, so it answers to "computer", "computing" and "cs" instead.
const SUBJECT_WORDS = {
  Physics: ['physics', 'science'], Chemistry: ['chemistry', 'science'], Biology: ['biology', 'science'], 'Combined Science': ['combined', 'science'],
  'Computer Science': ['computer', 'computing', 'cs', 'compsci'],
}
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
const split = (s) => norm(s).split(' ').filter(Boolean)
// Letters and digits only, so "9 FM0", "9fm0" and "IB MAA" / "ibmaa" all compare equal.
const compact = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '')

// Computed once at load, never per search: the normalised word lists for every topic and programme.
const PROGS = PROGRAMMES.map((p) => {
  const codes = [p.code, ...(p.codes ?? [])]
  return {
    p, order: 0, entry: programmeEntry(p, BY_PROGRAMME.get(p.id).length), codeKeys: codes.map(compact),
    // Words a student may type to mean the whole course (not its topics).
    titleWords: [...split([p.short, p.title, p.board, p.level, p.region, ...codes].join(' ')), ...(SUBJECT_WORDS[p.subject] ?? [])],
    codeWords: split(codes.join(' ')),
    // Board, level, region and code words only: a query made of these is asking for courses, not topics.
    metaWords: split([p.board, p.level, p.region, ...codes].join(' ')),
  }
})
PROGS.forEach((x, i) => { x.order = i })
const PROG_BY_ID = new Map(PROGS.map((x) => [x.p.id, x]))
const PROG_BY_TITLE = new Map(PROGS.map((x) => [x.p.title, x]))

const INDEX = TOPICS.map((t) => {
  const name = split(t.name), subject = SUBJECT_WORDS[t.subject] ?? split(t.subject)
  const extra = t.programme ? PROG_BY_TITLE.get(t.programme).codeWords : []
  const words = [...split([t.words, t.programme, t.programmeShort, t.unit, t.board, t.level, t.region].filter(Boolean).join(' ')), ...extra]
  return { name, subject, subjectStr: split(t.subject).join(' '), words, all: [...name, ...subject, ...words], nameStr: name.join(' '), metaStr: ` ${split([t.board, t.level, t.region].filter(Boolean).join(' ')).join(' ')}` }
})

// A programme's short label or full title typed in full (or its exact code) names exactly that programme.
const BY_QUERY = new Map(PROGRAMMES.flatMap((p) => [[norm(p.short), p], [norm(p.title), p]]))
const BY_CODE = new Map(PROGS.flatMap((x) => x.codeKeys.map((k) => [k, x.p])))
export const programmeForQuery = (query) => (BY_QUERY.get(norm(query)) ?? BY_CODE.get(compact(query)))?.id ?? null

// Programmes whose exam code starts with what was typed (three characters or more), exact code first.
function codeMatches(query) {
  const c = compact(query)
  if (c.length < 3) return []
  const hit = PROGS.filter((x) => x.codeKeys.some((k) => k.startsWith(c)))
  return hit.sort((a, b) => Number(b.codeKeys.includes(c)) - Number(a.codeKeys.includes(c)) || a.order - b.order)
}

// Most programme entries worth listing above topics. A broader query ("maths") is about topics, not courses.
const MAX_ENTRIES = 6

// Narrowing search. Order of results:
//   1. An exam code (case-insensitive, three characters or more): the matching programme entries, then their topics in unit order.
//   2. A programme's full or short title typed in full: that programme's entry, then its topics in unit order.
//   3. Anything else: every word typed must start a word in the topic's subject, name, search words, programme, unit, board,
//      level, region or code (or sit inside one, which ranks lower). Programme entries come first when the query is only board,
//      level, region or code words ("ib", "igcse", "a level"), or when at most six programmes match by title. Best matches first; on a tie, topics you can start now win, then topics with
//      their own questions, then the list order.
// `canStart(topic)` says whether a topic is ready in this session.
export function searchTopics(query, canStart = () => true) {
  const q = split(query)
  if (!q.length) return []
  const ready = (t, score, order) => ({ ...t, score, ready: canStart(t), order })

  const byCode = codeMatches(query)
  if (byCode.length) {
    const entries = byCode.map((x) => x.entry)
    const topics = byCode.flatMap((x) => BY_PROGRAMME.get(x.p.id))
    return [...entries, ...topics].map((t, order) => ready(t, 1000, order))
  }
  const whole = BY_QUERY.get(norm(query))
  if (whole) return [PROG_BY_ID.get(whole.id).entry, ...BY_PROGRAMME.get(whole.id)].map((t, order) => ready(t, 1000, order))

  const entries = PROGS.filter((x) => q.every((tok) => x.titleWords.some((w) => w.startsWith(tok))))
  // "ib", "igcse" or "a level" name no topic, so every matching course is listed. "maths" is about topics: only a few courses lead.
  const aboutCourses = q.some((tok) => tok.length >= 2) && PROGS.some((x) => q.every((tok) => x.metaWords.some((w) => w.startsWith(tok))))
  const listed = aboutCourses || entries.length <= MAX_ENTRIES ? entries : []

  const joined = q.join(' ')
  const out = []
  for (let order = 0; order < TOPICS.length; order++) {
    const { name, subject, subjectStr, words, all, nameStr, metaStr } = INDEX[order]
    let score = 0
    let ok = true
    for (const tok of q) {
      // A subject match ranks above a topic-name match, so "mat" lists Maths before "States of matter".
      // Matches inside a word only count once three letters are typed, so one letter does not match everything.
      const s = subject.some((w) => w.startsWith(tok)) ? 5
        : name.some((w) => w.startsWith(tok)) ? 4
        : words.some((w) => w.startsWith(tok)) ? 2
        : tok.length >= 3 && all.some((w) => w.includes(tok)) ? 1 : 0
      if (!s) { ok = false; break }
      score += s
    }
    if (!ok) continue
    if (subjectStr === joined || subjectStr.startsWith(`${joined} `)) score += 4 // the subject typed in full leads its own section
    if (nameStr.startsWith(joined)) score += 3
    else if (q.length > 1 && metaStr.includes(` ${joined}`)) score += 6 // "a level" typed as a phrase beats scattered word matches
    out.push(ready(TOPICS[order], score, order))
  }
  out.sort((a, b) => b.score - a.score || Number(b.ready) - Number(a.ready) || Number(b.exact) - Number(a.exact) || a.order - b.order)
  if (!listed.length) return out
  const lead = listed.map((x, i) => ready(x.entry, 2000, -listed.length + i)).sort((a, b) => Number(b.ready) - Number(a.ready) || a.order - b.order)
  return [...lead, ...out]
}
