// The Hivemind mark: three honeycomb cells. Two are midnight (the hive: many tools, many students),
// the top one is orange (the one that fits you). Simple enough to read at 16px.
const hex = (cx, cy, r) => 'M' + [0, 1, 2, 3, 4, 5].map((k) => {
  const a = ((-90 + k * 60) * Math.PI) / 180
  return `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`
}).join('L') + 'Z'

export const MARK_CELLS = [
  { d: hex(16, 8.4, 6.3), pop: true },
  { d: hex(9.7, 19.3, 6.3) },
  { d: hex(22.3, 19.3, 6.3) },
]

export default function Mark({ size = 24, className = '' }) {
  return (
    <svg className={`mark ${className}`} width={size} height={size * (28 / 32)} viewBox="0 0 32 28" aria-hidden="true" focusable="false">
      {MARK_CELLS.map((c, i) => (
        <path key={i} d={c.d} className={c.pop ? 'mark-pop' : 'mark-ink'} strokeWidth="1.6" strokeLinejoin="round" />
      ))}
    </svg>
  )
}
