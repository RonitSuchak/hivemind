import { state } from './state.js'

// The ground the whole site sits on: HiveMind's white, or midnight. Remembered on this device only.
const KEY = 'at-ground'
export function setGround(g) {
  state.ground = g === 'midnight' ? 'midnight' : 'white'
  document.documentElement.dataset.ground = state.ground
  try { localStorage.setItem(KEY, state.ground) } catch { /* private window: just not remembered */ }
}
export function toggleGround() { setGround(state.ground === 'white' ? 'midnight' : 'white') }
let saved = null
try { saved = localStorage.getItem(KEY) } catch { /* ignore */ }
setGround(saved || 'white')
