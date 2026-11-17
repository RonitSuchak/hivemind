// "Have these ready": what a student needs for each question pack. Decided by reading each pack's real
// questions (public/demo/topics/*.json and the lab's own check). Nothing is listed that no question needs.
//   Pen and paper   always (rough working).
//   Calculator      only where the questions need real arithmetic (percentages, g = 9.81, square roots, angles).
//   No calculator   where the sums are small and the point is to do them yourself.
//   Ruler, eraser   no pack asks anyone to draw or measure: every answer is picked on screen. Not listed.
const PEN = { id: 'paper', icon: 'paper', label: 'Pen and paper' }
const CALC = { id: 'calc', icon: 'calculator', label: 'Calculator' }
const NO_CALC = { id: 'nocalc', icon: 'calculator', label: 'No calculator for this one', off: true }

export const KIT_BY_PACK = {
  default: [PEN, NO_CALC],                     // fractions: small sums that measure what you already know
  'computing-binary': [PEN, NO_CALC],          // 4-bit numbers: adding the place values 8, 4, 2, 1 is the skill
  'science-forces': [PEN, NO_CALC],            // adding and taking away small forces; 100 m in 20 s
  'economics-elasticity': [PEN, CALC],         // percentage changes, PED divisions, the revenue question (800 x 25 x 1.08...)
  'physics-projectiles': [PEN, CALC],          // g = 9.81, square roots, 20 cos 30, Pythagoras
  'further-maths-complex': [PEN],              // small whole-number algebra by hand; no pack question needs a calculator
  'english-apostrophes': [PEN],                // words only
  'languages-spanish-basics': [PEN],           // words only
}
export const kitFor = (pack) => KIT_BY_PACK[pack] ?? [PEN]
