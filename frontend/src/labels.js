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
  all: 'All students', starts_high: 'Starts high', starts_low: 'Starts low', new_to_english: 'New to English',
  younger_reader: 'Reading age 9 or under', stops_sooner: 'Stops sooner when stuck', learns_fast: 'Picks things up fast',
}
export const tagLabel = (t) => TAGS[t] || humanise(t)

const GROUP_PEOPLE = {
  starts_high: 'Students who start high', starts_low: 'Students who start low', new_to_english: 'New-to-English students',
  younger_reader: 'Students with a reading age of 9 or under', stops_sooner: 'Students who stop sooner when stuck', learns_fast: 'Students who pick things up fast',
}
export const groupPeople = (g) => GROUP_PEOPLE[g] || humanise(g)

const FLAGS = { gave_answer: 'Gave the answer', too_hard_to_read: 'Too hard to read', unsafe_reply: 'Unsafe reply', off_topic: 'Went off topic', stuck: 'Got stuck' }
export const flagLabel = (f) => FLAGS[f] || humanise(f)

const MOVES = { gave_answer: 'Gave answer', hint: 'Hint', question: 'Question', explanation: 'Explanation', encouragement: 'Encouragement', off_topic: 'Off topic' }
export const moveLabel = (m) => MOVES[m] || humanise(m)

const SAFETY = { privacy: 'Privacy', inappropriate: 'Inappropriate requests', wellbeing: 'Wellbeing', misinformation: 'Maths accuracy', wrong_sum: 'Wrong sums' }
export const safetyLabel = (t) => SAFETY[t] || humanise(t)
export const MOMENT_LABEL = { privacy: 'Privacy', inappropriate: 'Inappropriate request', wellbeing: 'Wellbeing', wrong_sum: 'Wrong sum' }

// The lab tests 5 DEMO TOOLS (Socratic, Simple Steps, Lecturer, Answer Machine, Cheerleader): their names come
// from the backend and are shown as sent. Each one stands in for a TYPE of real EdTech tool. The type names
// below are ours: a plain label for the kind of website or app, keyed by the demo tool's id.
export const TYPE = {
  answer_machine: { name: 'Instant answers', how: 'Gives you the answer or a worked solution straight away' },
  socratic: { name: 'Guided hints', how: 'Guides you with questions, hints and problems to solve' },
  simple_steps: { name: 'Bite-size practice', how: 'Short, step by step practice such as drills, flashcards and quiz games' },
  lecturer: { name: 'Deep lessons', how: 'Long explanations such as video lessons, courses and notes' },
  cheerleader: { name: 'Friendly chat', how: 'Warm, full of praise and chat, but drifts off the topic' },
}
export const typeName = (id, fallback) => TYPE[id]?.name || fallback || humanise(id)
// What a tab, card or bar is called: the TYPE of EdTech tool (what the site is about). The demo tool that was
// actually tested for it (the backend's name) is shown next to it as "via Socratic". A submitted product has no
// type of ours, so it keeps its own name.
export const typeLabel = (row) => TYPE[row.tutor_id]?.name || row.tutor_name

export const SCORE_LABEL = { safety: 'Safety', usability: 'Usability', learning: 'Learning' }
// One icon per score, used wherever the score is named.
export const SCORE_ICON = { safety: 'shield', usability: 'pointer', learning: 'cap' }
export const SCORE_HELP = {
  safety: 'Privacy, inappropriate requests, wellbeing, wrong sums and bias.',
  usability: 'Whether students could follow it and keep going.',
  learning: 'How much students improved, and how often it made them think.',
}
