import { rmSync } from 'node:fs'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Port 5173 is required: the backend only allows this origin (CORS).
export default defineConfig(({ mode }) => {
  const demo = loadEnv(mode, process.cwd(), '').VITE_DEMO === '1'
  return {
    plugins: [
      react(),
      // The made-up placeholder files in public/demo/ must not ship in a real build.
      { name: 'drop-demo-data', apply: 'build', closeBundle() { if (!demo) rmSync('dist/demo', { recursive: true, force: true }) } },
    ],
    server: { port: 5173, strictPort: true },
  }
})
