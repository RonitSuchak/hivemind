// Preset answers for the three example students on the check page. They are sent to the lab for a real match.
// The keys are the backend's question ids; null is a skipped question. If the backend's check questions
// change, these answers must be updated to match.
export const EXAMPLE_STUDENTS = [
  {
    id: 'starting_out',
    title: 'Starting out, new to English',
    detail: 'Got 1 of 5 right before the mini-lesson and 3 of 5 after, skipped 4 questions and rated their English 2 of 5.',
    answers: {
      quiz_1: { c1: '2/6', c2: '7/20', c3: '2/10', c4: null, c5: null },
      quiz_2: { c6: '4/10', c7: '6/7', c8: '1/3', c9: '9/4', c10: null },
      reading: { r1: '3', r2: 'His teacher', r3: 'She had no ingredients', r4: null },
      english_confidence: 2,
    },
  },
  {
    id: 'close_call',
    title: 'Knows fractions, finds reading harder',
    detail: 'Got 4 of 5 right before the mini-lesson and 5 of 5 after, got 2 of 4 on reading and rated their English 3 of 5.',
    answers: {
      quiz_1: { c1: '2/6', c2: '7/10', c3: '5/8', c4: '3/4', c5: '3/10' },
      quiz_2: { c6: '4/10', c7: '6/7', c8: '1/3', c9: '3/4', c10: '2/3' },
      reading: { r1: '3', r2: 'His sister', r3: 'She had no ingredients', r4: 'Half' },
      english_confidence: 3,
    },
  },
  {
    id: 'confident',
    title: 'Confident all round',
    detail: 'Got every question right and rated their English 5 of 5.',
    answers: {
      quiz_1: { c1: '2/6', c2: '7/10', c3: '5/8', c4: '3/4', c5: '1/2' },
      quiz_2: { c6: '4/10', c7: '6/7', c8: '1/3', c9: '3/4', c10: '2/3' },
      reading: { r1: '3', r2: 'His sister', r3: 'Fewer guests were coming', r4: 'One third' },
      english_confidence: 5,
    },
  },
]
