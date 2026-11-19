import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import LabNav from './components/LabNav.jsx'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Check from './pages/Check.jsx'
import Results from './pages/Results.jsx'
import Lab from './pages/Lab.jsx'
import Ratings from './pages/Ratings.jsx'
import Pilot from './pages/Pilot.jsx'
import Report from './pages/Report.jsx'
import Proof from './pages/Proof.jsx'
import Privacy from './pages/Privacy.jsx'
import About from './pages/About.jsx'
import Tools from './pages/Tools.jsx'
import Try from './pages/Try.jsx'
import { useScrollingFlag } from './scroll.js'
import { useEngine } from './at/state.js'
import ScrollStory from './at/ScrollStory.jsx'
import './styles/theme.css' // theme layer: last, so it wins over page styles

// The Lab heading and sub-nav stay mounted when switching between Class view and Ratings,
// so the nav underline can slide instead of re-appearing.
function LabShell() {
  return (
    <div className="lab">
      <h1>Simulation Lab</h1>
      <LabNav />
      <Outlet />
    </div>
  )
}

export default function App() {
  useEngine(0.8) // one shared state + render loop: smooth scroll, pointer, scroll speed (at/state.js)
  useScrollingFlag() // drives the soft blur at the top and bottom edge while scrolling
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<ScrollStory gem={false}><Home /></ScrollStory>} />
        <Route path="check" element={<Check />} />
        <Route path="results" element={<Results />} />
        <Route path="lab" element={<LabShell />}>
          <Route index element={<Lab />} />
          <Route path="ratings" element={<Ratings />} />
          <Route path="report/:tutorId?" element={<Report />} />
          <Route path="real-tools" element={<Pilot />} />
          <Route path="proof" element={<Proof />} />
          <Route path="live/*" element={<Navigate to="/lab" replace />} /> {/* the lesson replay page was removed */}
        </Route>
        <Route path="try/:tutorId" element={<Try />} />
        <Route path="tools" element={<ScrollStory gem={false}><Tools /></ScrollStory>} />
        <Route path="about" element={<ScrollStory gem={false}><About /></ScrollStory>} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
