import { TYPE } from '../labels.js'

// The name shown for a tool: its type ("Guided hints"). The lab's own demo tool name is never shown.
// `row` is anything with tutor_id and tutor_name (a tutor, a ratings row, a ranked item).
// A product that is not one of our types keeps its own name.
export default function TypeName({ row }) {
  return TYPE[row.tutor_id]?.name || row.tutor_name
}
