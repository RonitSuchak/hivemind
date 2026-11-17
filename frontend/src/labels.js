// Plain-words labels for backend codes. Unknown codes fall back to a readable version.
const humanise = (s) => String(s).replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())

// The three outcomes, in plain words. The data keys stay learned / a_little / left_behind.
export const OUTCOME = { learned: 'Big gain', a_little: 'Small gain', left_behind: 'Left behind' }
// The same words as a short phrase for sentences and screen readers: "8 made a big gain".
export const OUTCOME_PHRASE = { learned: 'made a big gain', a_little: 'made a small gain', left_behind: 'was left behind' }
// What each outcome means, in one line (tooltips, the key, screen-reader text).
export const OUTCOME_NOTE = { learned: 'Gained 3 or more points out of 10', a_little: 'Gained 1 or 2 points', left_behind: 'Gained nothing, or gave up' }
export const OUTCOME_ORDER = ['learned', 'a_little', 'left_behind']

// Group ids renamed in v3. The backend also sends a `label` for each; use that when you have it.
const TAGS = {
  all: 'All students', starts_high: 'Head start', starts_low: 'Starting out', new_to_english: 'New to English',
  younger_reader: 'Young reader', stops_sooner: 'Stops when stuck', learns_fast: 'Quick learner',
  // worked out on this site from the student's own profile numbers (see studentTags below)
  keeps_going: 'Keeps going', needs_time: 'Needs time', strong_reader: 'Strong reader', fluent_english: 'Fluent English',
  fast_climber: 'Fast climber', slow_steady: 'Slow and steady', all_rounder: 'All-rounder',
}
export const tagLabel = (t) => TAGS[t] || humanise(t)
// What each category means, in plain numbers (shown when you hover a chip).
const TAG_NOTE = {
  starts_high: 'Already knew a lot of the topic before the lesson', starts_low: 'Knew little of the topic before the lesson',
  new_to_english: 'Still learning English', younger_reader: 'Reading age 9 or under', stops_sooner: 'Gives up sooner when stuck', learns_fast: 'Picks new ideas up fast',
  keeps_going: 'Staying power of 7 out of 10 or more', needs_time: 'Picks new ideas up slowly (3.5 out of 10 or less)', strong_reader: 'Reading age 13 or over',
  fluent_english: 'English of 9 out of 10 or more', fast_climber: 'Starts low but picks things up fast', slow_steady: 'Learns slowly but keeps going',
  all_rounder: 'No trait is very high or very low',
}
export const tagNote = (t) => TAG_NOTE[t]
// A student's categories: the lab's own tags first, then the ones this site works out from the same profile.
// Every rule reads the student's real numbers; a student with no numbers just keeps the lab's tags.
export function studentTags(s) {
  const tags = [...(s?.tags || [])], num = (v) => typeof v === 'number'
  if (!s || !num(s.learn_speed) || !num(s.persistence)) return tags
  const add = (id, ok) => { if (ok && !tags.includes(id)) tags.push(id) }
  add('keeps_going', s.persistence >= 0.7)
  add('needs_time', s.learn_speed <= 0.35)
  add('strong_reader', num(s.reading_age) && s.reading_age >= 13)
  add('fluent_english', num(s.english) && s.english >= 0.9)
  add('fast_climber', num(s.start_level) && s.start_level <= 0.3 && s.learn_speed >= 0.7)
  add('slow_steady', s.learn_speed <= 0.45 && s.persistence >= 0.7)
  add('all_rounder', tags.length === 0)
  return tags
}

const GROUP_PEOPLE = {
  starts_high: 'Students with a head start', starts_low: 'Students starting out', new_to_english: 'Students new to English',
  younger_reader: 'Young readers (reading age 9 or under)', stops_sooner: 'Students who stop when stuck', learns_fast: 'Quick learners',
}
export const groupPeople = (g) => GROUP_PEOPLE[g] || humanise(g)

const FLAGS = { gave_answer: 'Gave the answer', too_hard_to_read: 'Too hard to read', unsafe_reply: 'Unsafe reply', off_topic: 'Went off topic', stuck: 'Got stuck' }
export const flagLabel = (f) => FLAGS[f] || humanise(f)

const MOVES = { gave_answer: 'Gave answer', hint: 'Hint', question: 'Question', explanation: 'Explanation', encouragement: 'Encouragement', off_topic: 'Off topic' }
export const moveLabel = (m) => MOVES[m] || humanise(m)

const SAFETY = { privacy: 'Privacy', inappropriate: 'Inappropriate requests', wellbeing: 'Wellbeing', misinformation: 'Its own maths', wrong_sum: 'Correcting a wrong sum', asks_personal_info: 'Asking for personal details' }
export const safetyLabel = (t) => SAFETY[t] || humanise(t)
// The words for one row of a run's safety.checks ({ type, tested, passed }). Four checks are set traps (2 each).
// Two count something else: `misinformation` every sum the tool wrote, `asks_personal_info` every reply it wrote.
// A check with nothing to test says so: it is neither a pass nor a fail. Nothing is worked out here but the words.
export function checkResult(c) {
  const ok = c.passed === c.tested
  if (c.type === 'asks_personal_info') return ok ? `Never asked, in ${c.tested} replies` : `Asked in ${c.tested - c.passed} of ${c.tested} replies`
  if (c.type === 'misinformation') return c.tested === 0 ? 'Wrote no sums to check' : ok ? `All ${c.tested} sums correct` : `${c.tested - c.passed} of ${c.tested} sums wrong`
  if (c.tested === 0) return 'Did not come up'
  return ok ? `All ${c.tested} passed` : `${c.passed} of ${c.tested} passed`
}
export const MOMENT_LABEL = { privacy: 'Privacy', inappropriate: 'Inappropriate request', wellbeing: 'Wellbeing', wrong_sum: 'Wrong sum' }

// The lab's DEMO TOOLS each stand in for a TYPE of real EdTech tool. The site always uses the TYPE name
// ("Bite-size practice"). The lab's own names for them (`demo`, e.g. "Simple Steps") are never shown.
export const TYPE = {
  answer_machine: { name: 'Instant answers', demo: 'Answer Machine', how: 'Gives you the answer or a worked solution straight away' },
  socratic: { name: 'Guided hints', demo: 'Socratic', how: 'Guides you with questions, hints and problems to solve' },
  simple_steps: { name: 'Bite-size practice', demo: 'Simple Steps', how: 'Short, step by step practice such as drills, flashcards and quiz games' },
  lecturer: { name: 'Deep lessons', demo: 'Lecturer', how: 'Long explanations such as video lessons, courses and notes' },
  cheerleader: { name: 'Friendly chat', demo: 'Cheerleader', how: 'Warm, full of praise and chat, but drifts off the topic' },
}
export const typeName = (id, fallback) => TYPE[id]?.name || fallback || humanise(id)
// What a tab, card or bar is called: the TYPE of EdTech tool. A submitted product has no type of ours, so it keeps its own name.
export const typeLabel = (row) => TYPE[row.tutor_id]?.name || row.tutor_name

// One way to write a date everywhere: "2026-11-17" becomes "17 Nov 2026".
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const day = (iso) => { const [y, m, d] = String(iso ?? '').slice(0, 10).split('-').map(Number); return y && m && d ? `${d} ${MONTHS[m - 1]} ${y}` : String(iso ?? '') }
// Sentences written by the lab use its own demo tool names and raw dates. This swaps in the type names and
// the site's date style, and changes nothing else: plainWords('Why is Simple Steps first?') -> 'Why is Bite-size practice first?'
const DEMO_NAMES = Object.values(TYPE).sort((a, b) => b.demo.length - a.demo.length)
export const plainWords = (text) => {
  if (typeof text !== 'string') return text
  let out = text.replace(/\b(\d{4}-\d{2}-\d{2})\b/g, (m) => day(m))
  for (const t of DEMO_NAMES) out = out.split(t.demo).join(t.name)
  return out
}

// A demo tool (a TYPE of tool) has two scores. Safety is scored only for specific EdTech tools (the real-tool pilot).
export const DEMO_SCORES = ['usability', 'learning']
export const SCORE_LABEL = { safety: 'Safety', usability: 'Usability', learning: 'Learning' }
// One icon per score, used wherever the score is named.
export const SCORE_ICON = { safety: 'shield', usability: 'pointer', learning: 'cap' }
export const SCORE_HELP = {
  safety: 'Privacy, inappropriate requests, wellbeing, wrong sums and bias.',
  usability: 'Whether students could follow it and keep going.',
  learning: 'How much students improved, and how often it made them think.',
}
