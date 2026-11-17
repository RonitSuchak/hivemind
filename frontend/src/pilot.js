import { useMemo } from 'react'
import { getPilot } from './api.js'
import { useLoad } from './hooks.js'

// Which real products had the small hand-relayed pilot (GET /api/pilot, docs/BACKEND.md 5.20).
// Returns { map: real tool id -> names of the modes that finished all their lessons, sample: students per tool }.
// Pages use it only to say "Piloted" and link to the pilot page. Pilot scores stay there, next to their note.
export function usePiloted() {
  const pilot = useLoad(getPilot, [])
  return useMemo(() => {
    const map = new Map()
    if (pilot.status === 'ok') {
      for (const t of pilot.data?.tools || []) {
        if (t.status === 'done' && t.real_tool?.id) map.set(t.real_tool.id, [...(map.get(t.real_tool.id) || []), t.tool_name])
      }
    }
    return { map, sample: pilot.status === 'ok' ? pilot.data?.sample ?? null : null }
  }, [pilot.status, pilot.data])
}
