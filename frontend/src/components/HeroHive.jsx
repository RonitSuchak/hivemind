import Icon from './Icon.jsx'

// Landing page picture: a honeycomb. Each cell is something Hivemind looks at (safety, ease of use,
// learning, reading, language, the class). The orange cell in the middle is "the one that fits you".
// Decorative: hidden from assistive tech. Cells drift a little; reduced motion keeps them still.
const R = 46
const W = Math.sqrt(3) * R
const at = (q, r) => ({ x: 200 + W * (q + r / 2), y: 190 + 1.5 * R * r })
const hexPath = (r) => 'M' + [0, 1, 2, 3, 4, 5].map((k) => {
  const a = ((-90 + k * 60) * Math.PI) / 180
  return `${(r * Math.cos(a)).toFixed(1)} ${(r * Math.sin(a)).toFixed(1)}`
}).join('L') + 'Z'

const CELLS = [
  { q: 0, r: 0, kind: 'pop', icon: 'target' },
  { q: 1, r: -1, kind: 'ink', icon: 'shield' },
  { q: 1, r: 0, kind: 'line', icon: 'cap' },
  { q: 0, r: 1, kind: 'ink', icon: 'pointer' },
  { q: -1, r: 1, kind: 'soft', icon: 'book' },
  { q: -1, r: 0, kind: 'line', icon: 'chat' },
  { q: 0, r: -1, kind: 'soft', icon: 'users' },
  { q: 2, r: -1, kind: 'ghost' },
  { q: -2, r: 1, kind: 'ghost' },
  { q: 1, r: 1, kind: 'ghost' },
  { q: -1, r: -1, kind: 'ghost' },
]

export default function HeroHive() {
  return (
    <svg className="hive" viewBox="-8 62 416 256" aria-hidden="true" focusable="false">
      {CELLS.map((c, i) => {
        const p = at(c.q, c.r)
        return (
          <g key={i} transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`}>
            <g className={`hive-cell hive-${c.kind}`} style={{ '--i': i }}>
              <path d={hexPath(R - 4)} strokeLinejoin="round" />
              {c.icon && <g transform="translate(-14 -14)"><Icon name={c.icon} size={28} strokeWidth={2} /></g>}
            </g>
          </g>
        )
      })}
    </svg>
  )
}
