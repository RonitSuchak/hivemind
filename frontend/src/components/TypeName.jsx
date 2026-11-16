import { TYPE } from '../labels.js'

// "Guided hints · via Socratic": the type of EdTech tool first, then the demo tool that was tested for it.
// `row` is anything with tutor_id and tutor_name (a tutor, a ratings row, a ranked item).
export default function TypeName({ row, via = true }) {
  const type = TYPE[row.tutor_id]?.name
  if (!type) return row.tutor_name
  return <>{type}{via && <span className="type-via"> via {row.tutor_name}</span>}</>
}
