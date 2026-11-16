import Drawer from './Drawer.jsx'
import ToolGroupPicker from './ToolGroupPicker.jsx'

// Opens from a ranked result: the real EdTech tools of the type that demo tool stands in for, with a search
// bar and details for the one you pick. `tutor` is the ranked item ({ tutor_id, tutor_name }) or null.
// `tools` is the match's real_tools[] (the backend's order for this person), in the shape of data/tools.js.
export default function ToolsDrawer({ tutor, tools, onClose }) {
  return (
    <Drawer open={!!tutor} onClose={onClose} title={tutor ? `Real tools like ${tutor.tutor_name}` : ''} subtitle="Not tested by Hivemind. No scores apply to them.">
      {tutor && <ToolGroupPicker key={tutor.tutor_id} tutorId={tutor.tutor_id} tutorName={tutor.tutor_name} tools={tools?.length ? tools : undefined} compact />}
    </Drawer>
  )
}
