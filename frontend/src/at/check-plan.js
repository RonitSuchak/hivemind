// The check's plan: which steps run, how many questions, how long it takes. Plain functions, no React,
// so the page and a test script can both use them.

export const SHORT_QUIZ = 4 // a single exact topic asks the first 4 questions of each quiz (when a quiz has more)

export const languageQuestions = (c) => (Array.isArray(c.english_questions) ? c.english_questions.filter((q) => q?.id && q.options?.length) : [])
export const hasChallenge = (c) => !!(c.challenge?.id && c.challenge.options?.length && Array.isArray(c.challenge.hints))
// Every reading question, each remembering the passage it belongs to.
export const readingQuestions = (c) => (c.reading || []).flatMap((p) => (p.questions || []).map((q) => ({ ...q, passage: p.passage })))

// v3 check: quiz_1, mini_lesson, quiz_2, reading (a list of passages) and one english_question object.
// Demo packs may add `english_questions` (a list) and `challenge` (one hard question with hints).
export function buildSteps(c) {
  const steps = [{ kind: 'intro', part: 'Before you start' }]
  c.quiz_1.forEach((q, i) => steps.push({ kind: 'q', part: 'Part 1 · What you know', measure: 'level', q, n: i + 1, of: c.quiz_1.length }))
  steps.push({ kind: 'lesson', part: 'Part 2 · A new idea', measure: 'speed' })
  c.quiz_2.forEach((q, i) => steps.push({ kind: 'q', part: 'Part 2 · A new idea', measure: 'speed', q, n: i + 1, of: c.quiz_2.length }))
  const rq = readingQuestions(c)
  rq.forEach((q, i) => steps.push({ kind: 'q', part: 'Part 3 · Reading', measure: 'reading', q, n: i + 1, of: rq.length, passage: q.passage }))
  const lq = languageQuestions(c)
  lq.forEach((q, i) => steps.push({ kind: 'q', part: 'Part 4 · Language', measure: 'english', trial: true, q, n: i + 1, of: lq.length }))
  if (c.english_question) steps.push({ kind: 'english', part: 'Part 4 · Language', measure: 'english' })
  if (hasChallenge(c)) steps.push({ kind: 'challenge', part: 'Part 5 · Staying power', measure: 'persistence', trial: true, q: c.challenge })
  return steps
}

// Is this a quiz question the pace timer watches? (The two quizzes only, never reading or language.)
export const isTimed = (s) => s.kind === 'q' && (s.measure === 'level' || s.measure === 'speed')

// Does this pick get the shorter check? Only a single exact topic of a DEMO pack, and only when a quiz has more than 4.
// Never the lab's own check ('default'): the lab scores its fixed question ids, and a missing answer counts as a skip.
export const isShortPick = (topic, full) => !!topic && topic.pack !== 'default' && topic.exact === true && !topic.isProgramme
  && (full.quiz_1.length > SHORT_QUIZ || full.quiz_2.length > SHORT_QUIZ)

// The check that will really run: the lab's check, with the pack's parts on top (demo packs), then shortened if the pick is one exact topic.
export function makeCheck(base, pack, topic) {
  if (!pack) return base
  const own = {}
  for (const k of ['quiz_1', 'mini_lesson', 'quiz_2', 'english_questions']) if (Array.isArray(pack[k]) && pack[k].length) own[k] = pack[k]
  // A pack's reading is one passage with its questions; the lab's is a list of passages.
  if (pack.reading?.passage && pack.reading.questions?.length) own.reading = [{ id: 'pack', ...pack.reading }]
  else if (Array.isArray(pack.reading) && pack.reading.length) own.reading = pack.reading
  if (pack.challenge) own.challenge = pack.challenge
  // A pack with its own lesson uses its own lesson time (120 s when it does not say).
  if (own.mini_lesson) own.mini_lesson_seconds = Number(pack.mini_lesson_seconds) > 0 ? Number(pack.mini_lesson_seconds) : 120
  const full = { ...base, ...own }
  if (!isShortPick(topic, full)) return full
  return { ...full, quiz_1: full.quiz_1.slice(0, SHORT_QUIZ), quiz_2: full.quiz_2.slice(0, SHORT_QUIZ), short: true } // `short` is only a flag for the page
}

// One plain line saying which length this pick gets.
export function lengthLine(topic, short) {
  if (!topic) return ''
  if (topic.pack === 'default') return 'Full check: the same questions for everyone'
  if (short) return 'Short check: one topic'
  if (topic.isProgramme) return 'Full check: a whole course'
  return topic.exact ? 'Full check: one topic' : 'Full check: the whole subject'
}

// "N questions · about M minutes". 30 s a quiz or language question, the lesson's own time (120 s if missing),
// 45 s a reading question, 60 s for the hard question. The one self-rating counts as a question but adds no time.
export function estimate(steps, check) {
  let seconds = 0, questions = 0
  for (const s of steps) {
    if (s.kind === 'q') { questions += 1; seconds += s.measure === 'reading' ? 45 : 30 }
    else if (s.kind === 'lesson') seconds += Number(check.mini_lesson_seconds) > 0 ? Number(check.mini_lesson_seconds) : 120
    else if (s.kind === 'challenge') { questions += 1; seconds += 60 }
    else if (s.kind === 'english') questions += 1
  }
  return { questions, minutes: Math.max(1, Math.round(seconds / 60)) }
}
