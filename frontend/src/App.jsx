import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import LabNav from './components/LabNav.jsx'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Check from './pages/Check.jsx'
import Results from './pages/Results.jsx'
import Lab from './pages/Lab.jsx'
import Ratings from './pages/Ratings.jsx'
import About from './pages/About.jsx'
import Tools from './pages/Tools.jsx'
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
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="check" element={<Check />} />
        <Route path="results" element={<Results />} />
        <Route path="lab" element={<LabShell />}>
          <Route index element={<Lab />} />
          <Route path="ratings" element={<Ratings />} />
        </Route>
        <Route path="tools" element={<Tools />} />
        <Route path="about" element={<About />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
