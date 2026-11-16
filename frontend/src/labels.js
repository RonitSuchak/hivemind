// Plain-words labels for backend codes. Unknown codes fall back to a readable version.
const humanise = (s) => String(s).replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())

// The three outcomes, in plain words. The data keys stay learned / a_little / left_behind.
export const OUTCOME = { learned: 'Big gain', a_little: 'Small gain', left_behind: 'No gain' }
// The same words as a short phrase for sentences and screen readers: "8 made a big gain".
export const OUTCOME_PHRASE = { learned: 'made a big gain', a_little: 'made a small gain', left_behind: 'made no gain' }
// What each outcome means, in one line (tooltips, the key, screen-reader text).
export const OUTCOME_NOTE = { learned: 'Gained 4 or more points out of 10', a_little: 'Gained 1 to 3 points', left_behind: 'Gained nothing, or gave up' }
export const OUTCOME_ORDER = ['learned', 'a_little', 'left_behind']

const TAGS = {
  all: 'All students', confident: 'Confident', struggling: 'Struggling', new_to_english: 'New to English',
  low_reading: 'Low reading', gives_up_easily: 'Gives up easily', fast_learner: 'Fast learner',
}
export const tagLabel = (t) => TAGS[t] || humanise(t)

const GROUP_PEOPLE = {
  confident: 'Confident students', struggling: 'Students who start low', new_to_english: 'New-to-English students',
  low_reading: 'Students with a low reading age', gives_up_easily: 'Students who give up easily', fast_learner: 'Fast learners',
}
export const groupPeople = (g) => GROUP_PEOPLE[g] || humanise(g)

const FLAGS = { gave_answer: 'Gave the answer', too_hard_to_read: 'Too hard to read', unsafe_reply: 'Unsafe reply', wrong_maths: 'Wrong maths' }
export const flagLabel = (f) => FLAGS[f] || humanise(f)

const MOVES = { gave_answer: 'Gave answer', hint: 'Hint', question: 'Question', explanation: 'Explanation', encouragement: 'Encouragement', off_topic: 'Off topic' }
export const moveLabel = (m) => MOVES[m] || humanise(m)

const SAFETY = { privacy: 'Privacy', inappropriate: 'Inappropriate requests', wellbeing: 'Wellbeing', misinformation: 'Maths accuracy' }
export const safetyLabel = (t) => SAFETY[t] || humanise(t)
export const MOMENT_LABEL = { privacy: 'Privacy', inappropriate: 'Inappropriate request', wellbeing: 'Wellbeing' }

export const SCORE_LABEL = { safety: 'Safety', usability: 'Usability', learning: 'Learning' }
// One icon per score, used wherever the score is named.
export const SCORE_ICON = { safety: 'shield', usability: 'pointer', learning: 'cap' }
export const SCORE_HELP = {
  safety: 'Misinformation, bias, privacy and inappropriate content.',
  usability: 'Whether students could follow it and keep going.',
  learning: 'How much students improved.',
}
