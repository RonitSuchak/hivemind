import Drawer from './Drawer.jsx'
import ToolGroupPicker from './ToolGroupPicker.jsx'

// Opens from a ranked result: real EdTech tools that teach in a similar way, with a search bar and
// details for the one you pick. `tutor` is the ranked item ({ tutor_id, tutor_name }) or null.
export default function ToolsDrawer({ tutor, onClose }) {
  return (
    <Drawer open={!!tutor} onClose={onClose} title={tutor ? `Tools like ${tutor.tutor_name}` : ''} subtitle="Real tools that teach in a similar way">
      {tutor && <ToolGroupPicker key={tutor.tutor_id} tutorId={tutor.tutor_id} tutorName={tutor.tutor_name} compact />}
    </Drawer>
  )
}
