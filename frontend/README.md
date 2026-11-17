# Hivemind frontend

Owned by **Kien and Nina**. All website code goes in this folder, and nothing outside it.

## Start here
1. Read `../AGENTS.md` (folder rules) and `../HANDOFF.md` (latest state).
2. Build against `../docs/BACKEND.md`: every page, endpoint and data shape is there, with example data you can use as mock files today.
3. Read the backend address from `VITE_API_URL` (or your framework's equivalent). Never hard-code it.
4. Keep demo-mode files (saved backend responses) in this folder, e.g. `public/demo/`.

## Run the backend locally (optional, read-only)
The backend API isn't built yet (planned Tue 17 Nov). Until then, use the examples in `docs/BACKEND.md`.

## Notes
Vite + React (plain JavaScript) + react-router. Plain CSS; every colour, size and spacing value lives in `src/styles/tokens.css`, so you can restyle the whole site from that one file. Charts are hand-made SVG; there is no UI or chart library.

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173 (this port is required by the backend CORS)
npm run build    # production build into dist/
```

**Backend address:** copy `.env.example` to `.env` and set `VITE_API_URL=http://localhost:8000`. If it is empty, or `GET /api/health` fails, the site falls back to the saved exports in `public/demo/` (real backend exports, except `public/demo/topics/`, which are made-up question packs used only with `VITE_DEMO=1`) and shows "The lab is not connected, so these are saved results, not live." with a Retry button. The check itself is not offered then: the check page shows a "needs the live lab" card with a link to the saved example result. If the backend dies mid-session, the site re-checks it (at most every 10 s) and drops to the same fallback. Retry checks the backend again; if it answers, the pages reload with live data.

**Demo data:** set `VITE_DEMO=1` (e.g. `VITE_DEMO=1 npm run dev`) to always load the backend's saved exports from `public/demo/` and show a "Saved results" notice. These same files (except `public/demo/topics/`, made-up question packs that only `VITE_DEMO=1` uses) are the automatic fallback when the backend cannot be reached. To refresh them, copy `backend/data/export/` into `public/demo/` (keep `public/demo/topics/`). Some tutors are scripted previews (`tutor_mode`) until their full AI run is done.

**Motion:** every duration, easing, stagger, distance and spring is a token in `src/styles/tokens.css`. UI motion uses springs from `motion` (Motion for React) via `src/motion.js` (`spring('ui')`); scroll reveals use `components/Reveal.jsx`. `prefers-reduced-motion` makes everything instant and replaces the replay with step-by-step buttons.

**Look:** one dark theme. A quiet ambient background (`components/Ambient.jsx`) sits behind frosted glass (`.glass`, `.glass-strong`, `.glass-bar` in `app.css`), used only for the nav, notices, tooltips, the drawer and main cards. `prefers-reduced-transparency` makes glass solid.

**Layout:** `src/api.js` (the only file that talks to the backend), `src/pages/`, `src/components/`, `public/demo/` (the backend's saved exports).

**Pages:** Home, Check, Results, Tools (teaching tools and study helpers), About, Try (live chat with a demo tool), and the Simulation Lab: Class view (`/lab`), Ratings, Reports (`/lab/report/:id`, the tool maker report), Real tools (`/lab/real-tools`, the hand-relayed pilot), Proof (`/lab/proof`, real classmates: real gain next to predicted gain) and the live lesson replay (`/lab/live/:id`, opened from Class view).

**What the site is held to:** `STANDARD.md` in this folder (the vision, and pass or fail rules taken from the challenge brief).
