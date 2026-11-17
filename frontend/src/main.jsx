import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { MotionConfig } from 'motion/react'
import '@fontsource-variable/newsreader/opsz.css'              // headings: a reading serif (bundled: no outside font requests)
import '@fontsource-variable/newsreader/opsz-italic.css'       // italic accents and the floating equations
import '@fontsource-variable/figtree/wght.css'                 // body: friendly and plain to read
import '@fontsource-variable/figtree/wght-italic.css'
import './styles/tokens.css'
import './styles/app.css'
import App from './App.jsx'
import './styles/i18n.css' // last: Russian and Hindi fonts and spacing, scoped to :root[lang]
import { MatchProvider } from './store.jsx'
import './at/ground.js' // sets <html data-ground> before the first paint
import './at/at.css' // the dark ground and stage, loaded last
import './at/spacing.css' // spacing pass: very last, so its fixes win
import './at/glass.css' // frosted glass panels
import './at/calm.css' // calmer look: reading typefaces, three-colour palette, less ornament (very last)
import './at/fd.css' // front-end design pass: remove this line to switch it off
// One stylesheet per section of the site. Global first, then the pages.
import './sections/global.css'
import './sections/home.css'
import './sections/about.css'
import './sections/tools.css'
import './sections/lab.css'
import './sections/advisor.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <MatchProvider>
          <App />
        </MatchProvider>
      </BrowserRouter>
    </MotionConfig>
  </React.StrictMode>,
)
