// One icon set: 24px grid, 1.75 stroke, round caps. Decorative by default.
const PATHS = {
  check: 'M5 12.5l4.5 4.5L19 7.5',
  minus: 'M6 12h12',
  down: 'M12 5v14M6.5 13.5L12 19l5.5-5.5',
  cross: 'M6.5 6.5l11 11M17.5 6.5l-11 11',
  warn: 'M12 4.5l8.5 15h-17zM12 10.5v4M12 17.2v.1',
  info: 'M12 11v6M12 7.4v.1M12 3.5a8.5 8.5 0 100 17 8.5 8.5 0 000-17z',
  close: 'M6 6l12 12M18 6L6 18',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  back: 'M19 12H5M11 6l-6 6 6 6',
  play: 'M8 5.5v13l10-6.5z',
  flag: 'M6 20V4.5M6 5h11l-2 3.5 2 3.5H6',
  chevron: 'M6.5 9.5L12 15l5.5-5.5',
  skip: 'M5 5.5l9 6.5-9 6.5zM18 5.5v13',
  // Meaning icons (same grid and stroke). One per idea, used the same way everywhere:
  shield: 'M12 3.5l7 2.5v5.5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6zM9 12l2.2 2.2 4-4.2',          // safety
  pointer: 'M6 4.5l12 6-5 1.8-1.8 5zM13.6 13.6l4.4 4.4',                                         // usability
  cap: 'M3 9.5L12 5l9 4.5-9 4.5zM7 11.8v4c1.4 1.3 3.1 2 5 2s3.6-.7 5-2v-4M21 9.5v5',            // learning
  users: 'M9 11a3 3 0 100-6 3 3 0 000 6zM3.5 19c.5-3 2.7-4.8 5.5-4.8s5 1.8 5.5 4.8M16 11a2.6 2.6 0 000-5.2M17.5 14.5c1.7.6 2.8 2.2 3.1 4.5', // the class / students like you
  target: 'M12 20.5a8.5 8.5 0 100-17 8.5 8.5 0 000 17zM12 16a4 4 0 100-8 4 4 0 000 8zM12 12v.1', // match
  list: 'M9 6.5h11M9 12h11M9 17.5h11M4.5 6.5v.1M4.5 12v.1M4.5 17.5v.1',                         // ranked list
  lock: 'M6.5 11h11v8.5h-11zM9 11V8a3 3 0 016 0v3',                                              // nothing stored
  book: 'M4.5 5.5c2.5-.8 5-.5 7.5 1 2.5-1.5 5-1.8 7.5-1V18c-2.5-.8-5-.5-7.5 1-2.5-1.5-5-1.8-7.5-1zM12 6.5V19', // reading / lesson
  chat: 'M4.5 5.5h15V16h-8L7 19.5V16H4.5z',                                                    // tutor conversation
  chart: 'M5 19.5v-6M10 19.5v-11M15 19.5v-8M20 19.5V5',                                          // scores / ratings
  pencil: 'M5 19l1-4L16.5 4.5l3 3L9 18zM14.5 6.5l3 3',                                           // the check / questions
  spark: 'M12 4v4M12 16v4M4 12h4M16 12h4M6.5 6.5L9 9M15 15l2.5 2.5M17.5 6.5L15 9M9 15l-2.5 2.5', // a key moment
  clock: 'M12 20.5a8.5 8.5 0 100-17 8.5 8.5 0 000 17zM12 7.5V12l3 2',                            // time / short
  skipfwd: 'M5 5.5l9 6.5-9 6.5zM18 5.5v13',
  calculator: 'M7 3.5h10a1.5 1.5 0 011.5 1.5v14a1.5 1.5 0 01-1.5 1.5H7A1.5 1.5 0 015.5 19V5A1.5 1.5 0 017 3.5zM8.5 7.5h7v2.5h-7zM9 14v.1M12 14v.1M15 14v.1M9 17.5v.1M12 17.5v.1M15 17.5v.1', // calculator
  paper: 'M7 3.5h7l4 4V19a1.5 1.5 0 01-1.5 1.5H7A1.5 1.5 0 015.5 19V5A1.5 1.5 0 017 3.5zM14 3.5V8h4M8.5 12h7M8.5 15.5h5', // a sheet of paper
}
export default function Icon({ name, size = 20, className = '', strokeWidth = 1.75 }) {
  return (
    <svg className={`icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={PATHS[name]} />
    </svg>
  )
}
