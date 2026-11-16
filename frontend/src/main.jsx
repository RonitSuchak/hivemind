import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { MotionConfig } from 'motion/react'
import '@fontsource-variable/bricolage-grotesque/opsz.css' // headings (bundled: no outside font requests)
import '@fontsource-variable/dm-sans'                      // body
import '@fontsource/instrument-serif/400-italic.css'       // italic accents, equations
import './styles/tokens.css'
import './styles/app.css'
import App from './App.jsx'
import { MatchProvider } from './store.jsx'

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
