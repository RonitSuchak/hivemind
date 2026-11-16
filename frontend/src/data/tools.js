// EdTech tools list. The first 12 are the tools students use most (approximate, most used first).
// The rest are more well-known tools, in no particular order.
// No scores, ratings, prices or user numbers are stored here on purpose. Traits and groups are our own
// conservative estimate from each tool's public features. They are not lab results.
// Hivemind has NOT tested any of these real products.
//
// traits: beginner, stretch, lightReading, languages, motivation, guidance, selfPaced (each 0 to 2)
// group: which of the four simulated tool types it most resembles in HOW it teaches.

// The four simulated tool types the lab tests. Ids and names come from the backend.
export const GROUPS = [
  { id: 'answer_machine', name: 'Answer Machine', how: 'Gives you the answer or a worked solution straight away' },
  { id: 'socratic', name: 'Socratic', how: 'Guides you with questions, hints and problems to solve' },
  { id: 'simple_steps', name: 'Simple Steps', how: 'Short, step by step practice such as drills, flashcards and quiz games' },
  { id: 'lecturer', name: 'Lecturer', how: 'Long explanations such as video lessons, courses and notes' },
]

const TRAIT_KEYS = ['beginner', 'stretch', 'lightReading', 'languages', 'motivation', 'guidance', 'selfPaced']
const tool = (id, name, url, kind, blurb, group, nums) => ({
  id, name, url, kind, blurb, group,
  traits: Object.fromEntries(TRAIT_KEYS.map((k, i) => [k, nums[i]])),
})

export const TOOLS = [
  {
    id: 'chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com', kind: 'AI chatbot', group: 'answer_machine',
    blurb: 'A chatbot that answers questions and explains ideas in plain language.',
    traits: { beginner: 1, stretch: 2, lightReading: 0, languages: 2, motivation: 0, guidance: 1, selfPaced: 2 },
  },
  {
    id: 'duolingo', name: 'Duolingo', url: 'https://www.duolingo.com', kind: 'Language practice', group: 'simple_steps',
    blurb: 'Short language lessons with streaks, points and daily reminders.',
    traits: { beginner: 2, stretch: 0, lightReading: 2, languages: 2, motivation: 2, guidance: 1, selfPaced: 1 },
  },
  {
    id: 'khan-academy', name: 'Khan Academy', url: 'https://www.khanacademy.org', kind: 'Lessons and practice', group: 'lecturer',
    blurb: 'Video lessons and practice questions across maths, science and more.',
    traits: { beginner: 2, stretch: 1, lightReading: 1, languages: 2, motivation: 1, guidance: 2, selfPaced: 2 },
  },
  {
    id: 'quizlet', name: 'Quizlet', url: 'https://quizlet.com', kind: 'Flashcards', group: 'simple_steps',
    blurb: 'Make or find flashcard sets, then study them with quizzes and games.',
    traits: { beginner: 1, stretch: 1, lightReading: 1, languages: 1, motivation: 1, guidance: 0, selfPaced: 2 },
  },
  {
    id: 'kahoot', name: 'Kahoot!', url: 'https://kahoot.com', kind: 'Quiz games', group: 'simple_steps',
    blurb: 'Fast quiz games that a class plays together on screens.',
    traits: { beginner: 1, stretch: 0, lightReading: 2, languages: 1, motivation: 2, guidance: 0, selfPaced: 0 },
  },
  {
    id: 'photomath', name: 'Photomath', url: 'https://photomath.com', kind: 'Maths solver', group: 'answer_machine',
    blurb: 'Point your camera at a maths problem to see the steps worked out.',
    traits: { beginner: 2, stretch: 0, lightReading: 2, languages: 2, motivation: 0, guidance: 2, selfPaced: 1 },
  },
  {
    id: 'desmos', name: 'Desmos', url: 'https://www.desmos.com', kind: 'Graphing', group: 'socratic',
    blurb: 'A graphing calculator for drawing and exploring equations.',
    traits: { beginner: 1, stretch: 1, lightReading: 2, languages: 1, motivation: 1, guidance: 0, selfPaced: 2 },
  },
  {
    id: 'brilliant', name: 'Brilliant', url: 'https://brilliant.org', kind: 'Interactive problems', group: 'socratic',
    blurb: 'Hands-on puzzles and short lessons in maths, science and computing.',
    traits: { beginner: 1, stretch: 2, lightReading: 1, languages: 0, motivation: 2, guidance: 2, selfPaced: 2 },
  },
  {
    id: 'anki', name: 'Anki', url: 'https://apps.ankiweb.net', kind: 'Spaced repetition', group: 'simple_steps',
    blurb: 'Flashcards that come back just before you would forget them.',
    traits: { beginner: 0, stretch: 1, lightReading: 1, languages: 1, motivation: 0, guidance: 0, selfPaced: 2 },
  },
  {
    id: 'seneca', name: 'Seneca', url: 'https://senecalearning.com', kind: 'Revision (UK)', group: 'simple_steps',
    blurb: 'Revision courses for UK exams, with short questions after each part.',
    traits: { beginner: 1, stretch: 1, lightReading: 1, languages: 0, motivation: 1, guidance: 1, selfPaced: 2 },
  },
  {
    id: 'sparx-maths', name: 'Sparx Maths', url: 'https://sparxmaths.com', kind: 'Maths homework (UK schools)', group: 'simple_steps',
    blurb: 'Maths homework set by your school, with video help on each question.',
    traits: { beginner: 1, stretch: 1, lightReading: 1, languages: 0, motivation: 1, guidance: 1, selfPaced: 0 },
  },
  {
    id: 'khanmigo', name: 'Khanmigo', url: 'https://www.khanmigo.ai', kind: 'AI learning assistant', group: 'socratic',
    blurb: 'A learning assistant from Khan Academy that asks questions to guide you.',
    traits: { beginner: 2, stretch: 1, lightReading: 0, languages: 1, motivation: 0, guidance: 2, selfPaced: 2 },
  },

  // More tools. Trait order: beginner, stretch, lightReading, languages, motivation, guidance, selfPaced.
  // Lecturer: video lessons, courses and notes
  tool('bbc-bitesize', 'BBC Bitesize', 'https://www.bbc.co.uk/bitesize', 'Revision notes and videos', 'Short revision guides, videos and quizzes for UK school subjects.', 'lecturer', [2, 0, 1, 1, 0, 1, 2]),
  tool('oak-national-academy', 'Oak National Academy', 'https://www.thenational.academy', 'Video lessons (UK)', 'Video lessons and worksheets that follow the UK school curriculum.', 'lecturer', [2, 0, 1, 1, 0, 1, 2]),
  tool('dr-frost-maths', 'Dr Frost Maths', 'https://www.drfrost.org', 'Maths lessons and practice', 'Maths lessons, slides and practice questions for UK students.', 'lecturer', [1, 1, 1, 0, 0, 1, 2]),
  tool('corbettmaths', 'Corbettmaths', 'https://corbettmaths.com', 'Maths videos', 'Short maths videos with practice questions and answers.', 'lecturer', [2, 0, 1, 0, 0, 1, 2]),
  tool('save-my-exams', 'Save My Exams', 'https://www.savemyexams.com', 'Revision notes', 'Revision notes, practice questions and model answers for school exams.', 'lecturer', [1, 1, 0, 0, 0, 1, 2]),
  tool('up-learn', 'Up Learn', 'https://www.uplearn.co.uk', 'Online A level courses', 'Online A level courses with video lessons and practice.', 'lecturer', [1, 2, 1, 0, 1, 1, 2]),
  tool('examsolutions', 'ExamSolutions', 'https://www.examsolutions.net', 'Maths videos', 'Maths video lessons and walkthroughs of past exam papers.', 'lecturer', [1, 1, 1, 0, 0, 1, 2]),
  tool('cognito', 'Cognito', 'https://cognitoedu.org', 'Video lessons', 'Video lessons and quizzes for GCSE subjects.', 'lecturer', [2, 0, 1, 1, 0, 1, 2]),
  tool('isaac-computer-science', 'Isaac Computer Science', 'https://isaaccomputerscience.org', 'Computer science lessons', 'Computer science notes and questions for school and A level.', 'lecturer', [1, 2, 0, 0, 0, 1, 2]),
  tool('ck-12', 'CK-12', 'https://www.ck12.org', 'Textbooks and lessons', 'Online textbooks, videos and practice for maths and science.', 'lecturer', [1, 1, 0, 0, 0, 1, 2]),
  tool('crash-course', 'Crash Course', 'https://thecrashcourse.com', 'Video lessons', 'Fast video courses on school subjects, from history to chemistry.', 'lecturer', [1, 1, 1, 1, 0, 0, 2]),
  tool('ted-ed', 'TED-Ed', 'https://ed.ted.com', 'Short videos', 'Short animated video lessons on many topics.', 'lecturer', [2, 0, 2, 1, 0, 0, 2]),
  tool('3blue1brown', '3Blue1Brown', 'https://www.3blue1brown.com', 'Maths videos', 'Animated videos that explain maths ideas with pictures.', 'lecturer', [0, 2, 2, 0, 0, 0, 2]),
  tool('newsela', 'Newsela', 'https://newsela.com', 'Reading practice', 'News articles at different reading levels, with questions to check.', 'lecturer', [1, 1, 0, 2, 0, 1, 1]),
  tool('coursera', 'Coursera', 'https://www.coursera.org', 'Online courses', 'Online university courses with video lectures and quizzes.', 'lecturer', [0, 2, 0, 0, 0, 1, 2]),
  tool('edx', 'edX', 'https://www.edx.org', 'Online courses', 'University courses taught in video lectures, with readings and tests.', 'lecturer', [0, 2, 0, 0, 0, 1, 2]),
  tool('futurelearn', 'FutureLearn', 'https://www.futurelearn.com', 'Online courses', 'Short online courses from universities, with videos, articles and discussion.', 'lecturer', [1, 2, 0, 0, 0, 1, 2]),
  tool('udemy', 'Udemy', 'https://www.udemy.com', 'Online courses', 'Online video courses on many skills, taught by many different people.', 'lecturer', [1, 1, 1, 0, 0, 0, 2]),

  // Simple Steps: short, step by step practice
  tool('mathswatch', 'Mathswatch', 'https://www.mathswatch.com', 'Maths videos and practice', 'Maths videos with practice questions, often set by teachers.', 'simple_steps', [1, 1, 1, 0, 1, 1, 1]),
  tool('hegarty-maths', 'Hegarty Maths', 'https://hegartymaths.com', 'Maths homework (UK schools)', 'Video lessons and quizzes that check each maths topic step by step.', 'simple_steps', [1, 1, 1, 0, 1, 2, 1]),
  tool('mymaths', 'MyMaths', 'https://www.mymaths.co.uk', 'Maths homework (UK schools)', 'Online maths lessons and games, often set as homework.', 'simple_steps', [2, 0, 2, 0, 1, 1, 1]),
  tool('times-tables-rock-stars', 'Times Tables Rock Stars', 'https://ttrockstars.com', 'Times tables practice', 'Timed games that help you learn your times tables.', 'simple_steps', [2, 0, 2, 0, 2, 0, 1]),
  tool('integral-maths', 'Integral Maths', 'https://integralmaths.org', 'A level maths practice', 'A level maths lessons, notes and questions. Many schools set it.', 'simple_steps', [1, 1, 1, 0, 0, 1, 1]),
  tool('mathletics', 'Mathletics', 'https://www.mathletics.com', 'Maths practice', 'Maths activities, games and live challenges set by schools.', 'simple_steps', [2, 0, 2, 0, 2, 1, 1]),
  tool('ixl', 'IXL', 'https://www.ixl.com', 'Practice questions', 'Practice questions in maths and English that get harder as you improve.', 'simple_steps', [1, 1, 1, 0, 1, 1, 2]),
  tool('prodigy', 'Prodigy', 'https://www.prodigygame.com', 'Maths game', 'A fantasy game where you answer maths questions to play.', 'simple_steps', [2, 0, 2, 0, 2, 0, 2]),
  tool('educake', 'Educake', 'https://www.educake.co.uk', 'Science quizzes (UK schools)', 'Science quizzes set by teachers, with instant marking.', 'simple_steps', [1, 1, 1, 0, 0, 0, 0]),
  tool('tassomai', 'Tassomai', 'https://www.tassomai.com', 'Daily quizzes (UK)', 'Short daily quizzes that change as you get questions right or wrong.', 'simple_steps', [1, 1, 1, 0, 2, 1, 1]),
  tool('century', 'Century', 'https://www.century.tech', 'Adaptive lessons', 'Short lessons and questions that change as you answer.', 'simple_steps', [1, 1, 1, 0, 1, 1, 1]),
  tool('gcsepod', 'GCSEPod', 'https://www.gcsepod.com', 'Revision videos', 'Short revision videos for GCSE subjects.', 'simple_steps', [2, 0, 1, 1, 0, 0, 2]),
  tool('blooket', 'Blooket', 'https://www.blooket.com', 'Quiz games', 'Quiz games with different game modes for a class or one player.', 'simple_steps', [1, 0, 2, 1, 2, 0, 1]),
  tool('gimkit', 'Gimkit', 'https://www.gimkit.com', 'Quiz games', 'Quiz games where you earn in-game money for right answers.', 'simple_steps', [1, 0, 2, 1, 2, 0, 1]),
  tool('brainscape', 'Brainscape', 'https://www.brainscape.com', 'Flashcards', 'Flashcards that you rate, so hard cards come back more often.', 'simple_steps', [1, 1, 1, 1, 0, 0, 2]),
  tool('memrise', 'Memrise', 'https://www.memrise.com', 'Language practice', 'Language lessons using short phrases, flashcards and videos of speakers.', 'simple_steps', [2, 0, 2, 2, 1, 1, 2]),
  tool('babbel', 'Babbel', 'https://www.babbel.com', 'Language lessons', 'Short language lessons that teach words and everyday conversation.', 'simple_steps', [2, 0, 1, 2, 1, 1, 2]),
  tool('busuu', 'Busuu', 'https://www.busuu.com', 'Language lessons', 'Language courses with short lessons and feedback from other learners.', 'simple_steps', [2, 0, 1, 2, 1, 1, 2]),
  tool('lingodeer', 'LingoDeer', 'https://www.lingodeer.com', 'Language practice', 'Language lessons with grammar notes, short exercises and audio.', 'simple_steps', [2, 0, 1, 2, 1, 1, 2]),
  tool('rosetta-stone', 'Rosetta Stone', 'https://www.rosettastone.com', 'Language lessons', 'Language lessons that use pictures and sound instead of English.', 'simple_steps', [2, 0, 2, 2, 0, 1, 2]),
  tool('codecademy', 'Codecademy', 'https://www.codecademy.com', 'Coding lessons', 'Learn to code by typing in a lesson window and checking the result.', 'simple_steps', [2, 1, 1, 0, 1, 1, 2]),
  tool('code-org', 'Code.org', 'https://code.org', 'Coding lessons', 'Coding lessons and puzzles that start with drag and drop blocks.', 'simple_steps', [2, 0, 2, 1, 1, 1, 2]),
  tool('freecodecamp', 'freeCodeCamp', 'https://www.freecodecamp.org', 'Coding lessons', 'Coding lessons with exercises you type in your browser.', 'simple_steps', [1, 1, 0, 0, 0, 1, 2]),
  tool('noredink', 'NoRedInk', 'https://www.noredink.com', 'Writing practice', 'Short grammar and writing exercises that change as you answer.', 'simple_steps', [1, 0, 1, 1, 1, 1, 1]),
  tool('readtheory', 'ReadTheory', 'https://readtheory.org', 'Reading practice', 'Short reading passages with questions that match your level.', 'simple_steps', [1, 0, 1, 2, 0, 0, 2]),
  tool('bedrock-learning', 'Bedrock Learning', 'https://www.bedrocklearning.org', 'Reading and vocabulary', 'Short vocabulary and reading lessons set by schools.', 'simple_steps', [1, 0, 1, 2, 1, 1, 1]),

  // Socratic: questions, hints and interactive problem solving
  tool('nrich', 'NRICH', 'https://nrich.maths.org', 'Maths problems', 'Open maths problems and puzzles that make you think and explore.', 'socratic', [0, 2, 1, 0, 1, 1, 2]),
  tool('isaac-physics', 'Isaac Physics', 'https://isaacphysics.org', 'Physics problems', 'Physics and maths problems with hints and feedback as you go.', 'socratic', [0, 2, 0, 0, 0, 2, 2]),
  tool('underground-mathematics', 'Underground Mathematics', 'https://undergroundmathematics.org', 'Maths problems', 'Problems and resources that connect A level maths ideas.', 'socratic', [0, 2, 0, 0, 0, 1, 2]),
  tool('geogebra', 'GeoGebra', 'https://www.geogebra.org', 'Maths exploring', 'Draw and move shapes, graphs and equations to see how they work.', 'socratic', [1, 1, 2, 1, 1, 0, 2]),
  tool('phet', 'PhET Simulations', 'https://phet.colorado.edu', 'Science simulations', 'Interactive science and maths simulations that you can change and test.', 'socratic', [1, 1, 2, 2, 1, 0, 2]),
  tool('mathigon', 'Mathigon', 'https://mathigon.org', 'Interactive maths', 'Interactive maths lessons that you click and drag as you read.', 'socratic', [1, 1, 1, 1, 1, 1, 2]),
  tool('scratch', 'Scratch', 'https://scratch.mit.edu', 'Coding with blocks', 'Build games and stories by snapping code blocks together.', 'socratic', [2, 0, 2, 2, 2, 0, 2]),
  tool('language-transfer', 'Language Transfer', 'https://www.languagetransfer.org', 'Audio language courses', 'Audio language courses where you work out the grammar yourself.', 'socratic', [2, 0, 2, 0, 0, 2, 2]),

  // Answer Machine: the answer or a worked solution straight away
  tool('wolfram-alpha', 'Wolfram Alpha', 'https://www.wolframalpha.com', 'Answer engine', 'Type a maths or science question and get a worked answer.', 'answer_machine', [1, 1, 1, 0, 0, 1, 2]),
  tool('symbolab', 'Symbolab', 'https://www.symbolab.com', 'Maths solver', 'Type in a maths problem and see the steps to solve it.', 'answer_machine', [1, 1, 2, 0, 0, 2, 2]),
  tool('mathway', 'Mathway', 'https://www.mathway.com', 'Maths solver', 'Enter a maths problem and get the answer with steps.', 'answer_machine', [1, 0, 2, 0, 0, 1, 2]),
  tool('microsoft-math-solver', 'Microsoft Math Solver', 'https://mathsolver.microsoft.com', 'Maths solver', 'Type, write or scan a maths problem to get steps and graphs.', 'answer_machine', [1, 0, 2, 1, 0, 1, 2]),
  tool('maths-genie', 'Maths Genie', 'https://www.mathsgenie.co.uk', 'Maths past papers', 'Past exam papers with worked answers and video solutions.', 'answer_machine', [1, 1, 1, 0, 0, 1, 2]),
  tool('physics-and-maths-tutor', 'Physics & Maths Tutor', 'https://www.physicsandmathstutor.com', 'Notes and past papers', 'Revision notes, past papers and mark schemes for school exams.', 'answer_machine', [1, 1, 0, 0, 0, 0, 2]),
  tool('brainly', 'Brainly', 'https://brainly.com', 'Homework answers', 'A community where students ask homework questions and others answer.', 'answer_machine', [1, 0, 1, 1, 0, 0, 2]),
  tool('chegg', 'Chegg', 'https://www.chegg.com', 'Homework answers', 'Step by step textbook solutions and answers to homework questions.', 'answer_machine', [1, 1, 0, 0, 0, 1, 2]),
  tool('grammarly', 'Grammarly', 'https://www.grammarly.com', 'Writing helper', 'Checks your writing and suggests fixes for spelling and grammar.', 'answer_machine', [1, 0, 1, 2, 0, 1, 2]),
  tool('perplexity', 'Perplexity', 'https://www.perplexity.ai', 'AI search', 'A search tool that answers questions and shows its sources.', 'answer_machine', [1, 2, 0, 1, 0, 0, 2]),
  tool('claude', 'Claude', 'https://claude.ai', 'AI chatbot', 'A chatbot that answers questions and helps with writing and ideas.', 'answer_machine', [1, 2, 0, 2, 0, 1, 2]),
  tool('gemini', 'Gemini', 'https://gemini.google.com', 'AI chatbot', 'Google’s chatbot that answers questions and helps with writing.', 'answer_machine', [1, 2, 0, 2, 0, 1, 2]),
  tool('copilot', 'Microsoft Copilot', 'https://copilot.microsoft.com', 'AI chatbot', 'Microsoft’s chatbot that answers questions and helps with writing.', 'answer_machine', [1, 2, 0, 2, 0, 1, 2]),
  tool('notebooklm', 'NotebookLM', 'https://notebooklm.google.com', 'AI notes helper', 'Upload your notes and ask questions about them.', 'answer_machine', [1, 1, 0, 1, 0, 1, 2]),
]

// Five sliders, one per part of the learning profile. Each runs 1 to 10 and every step has its own
// sentence. 1 means "not sure": it is ignored. Each trait words that differently, always starting "Not sure". 2 is the low end (uses `low` weights), 10 the high
// end (`high` weights), and the steps between blend the two.
export const SCALE_MAX = 10
export const FILTERS = [
  {
    id: 'level', label: 'Starting level', icon: 'chart',
    low: { beginner: 2, guidance: 1 }, high: { stretch: 2 },
    levels: [
      "Not sure where I'm at",
      "I'm starting from zero",
      'I know a few basics',
      'I can do the easy questions',
      'I get some of it right',
      "I'm about average",
      "I'm fairly confident",
      'Most of it feels easy',
      "I'm ready for harder work",
      'I want the hardest questions',
    ],
  },
  {
    id: 'speed', label: 'Speed', icon: 'clock',
    low: { selfPaced: 2 }, high: { stretch: 1 },
    levels: [
      'Not sure how fast I learn',
      'I need it explained many times',
      'I need to go slowly',
      'I like to take my time',
      'A steady pace suits me',
      'I keep up without trouble',
      'I catch on fairly quickly',
      'I pick things up fast',
      'One explanation is enough',
      'I get it straight away',
    ],
  },
  {
    id: 'reading', label: 'Reading', icon: 'book',
    low: { lightReading: 2 }, high: { stretch: 1 },
    levels: [
      'Not sure how much I like to read',
      'I need pictures, not words',
      'A few words at a time',
      'Short, simple sentences suit me',
      'A short paragraph is fine',
      'I can read a full page',
      'Longer explanations are fine',
      "I'm happy with long text",
      'I read detailed text easily',
      "I'll read anything, however long",
    ],
  },
  {
    id: 'english', label: 'English', icon: 'chat',
    low: { languages: 2, lightReading: 1 }, high: {},
    levels: [
      'Not sure about my English',
      "I'm new to English",
      'I know some words and phrases',
      "I'm still learning English",
      'I manage with simple English',
      'I understand most things',
      "I'm comfortable in English",
      "I'm nearly fluent",
      "I'm fluent in English",
      'English is my strongest language',
    ],
  },
  {
    id: 'stuck', label: "When I'm stuck", icon: 'spark',
    low: { motivation: 2, guidance: 1 }, high: { stretch: 1 },
    levels: [
      'Not sure what I do',
      'I stop straight away',
      'I usually stop',
      'I try once, then stop',
      'I try a couple of times',
      'I look for a hint',
      'I try a different way',
      'I keep at it for a while',
      'I keep going until I get it',
      "I don't give up",
    ],
  },
]

export const REASONS = {
  beginner: 'Works from a low starting point',
  stretch: 'Pushes you with harder work',
  lightReading: 'Little reading needed',
  languages: 'Helps while you learn English',
  motivation: 'Streaks and games keep you going',
  guidance: 'Gives hints, not just answers',
  selfPaced: 'You set the speed',
}

const MAX_TRAIT = 2

// selection: { [groupId]: 1..10 }. Missing or 1 ("I don't know") means no preference.
// Pure: no state, no side effects. Returns [{ ...tool, fit, reasons }].
export function rankTools(selection = {}) {
  const weights = {}
  for (const group of FILTERS) {
    const v = Number(selection[group.id])
    if (!(v >= 2)) continue
    const t = (Math.min(v, SCALE_MAX) - 2) / (SCALE_MAX - 2) // 0 at the low end, 1 at the high end
    const add = (side, share) => {
      for (const [trait, w] of Object.entries(side)) weights[trait] = (weights[trait] || 0) + w * share
    }
    add(group.low, 1 - t)
    add(group.high, t)
  }
  for (const k of Object.keys(weights)) if (weights[k] < 0.05) delete weights[k]
  const max = Object.values(weights).reduce((sum, w) => sum + w * MAX_TRAIT, 0)

  if (max === 0) return TOOLS.map((t) => ({ ...t, fit: null, reasons: [] }))

  return TOOLS
    .map((t, order) => {
      const parts = Object.entries(weights)
        .map(([trait, w]) => ({ trait, gain: w * (t.traits[trait] || 0) }))
        .filter((p) => p.gain >= 0.5)
        .sort((a, b) => b.gain - a.gain)
      const score = Object.entries(weights).reduce((sum, [trait, w]) => sum + w * (t.traits[trait] || 0), 0)
      return {
        ...t,
        order,
        fit: Math.round((score / max) * 100),
        reasons: parts.slice(0, 3).map((p) => REASONS[p.trait]),
      }
    })
    .sort((a, b) => b.fit - a.fit || a.order - b.order)
    .map(({ order, ...t }) => t)
}

// Real tools that teach in a similar way to a simulated tool type: every tool in its group,
// first the tools students use most. This is our own estimate from public features.
// These tools have NOT been tested by Hivemind: a tool type's scores never apply to them.
export function toolsLike(tutorId) {
  return TOOLS.filter((t) => t.group === tutorId)
}

// Every word typed must start a word in the tool's name, kind or blurb (inside a word is fine from
// three letters). Name matches come first, then catalogue order. Optional { group } narrows by tool type.
const words = (s) => String(s).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
const hits = (fieldWords, q) => fieldWords.some((w) => w.startsWith(q) || (q.length >= 3 && w.includes(q)))
export function searchTools(query = '', { group } = {}) {
  const pool = group && group !== 'all' ? TOOLS.filter((t) => t.group === group) : TOOLS
  const qs = words(query)
  if (!qs.length) return pool
  const ranked = []
  pool.forEach((t, order) => {
    const nameW = words(t.name)
    const restW = [...nameW, ...words(t.kind), ...words(t.blurb)]
    if (!qs.every((q) => hits(restW, q))) return
    const nameHits = qs.filter((q) => hits(nameW, q)).length
    ranked.push({ t, order, rank: nameHits === qs.length ? 0 : nameHits > 0 ? 1 : 2 })
  })
  return ranked.sort((a, b) => a.rank - b.rank || a.order - b.order).map((r) => r.t)
}
