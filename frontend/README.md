# Hivemind website

The website for Hivemind, a crash test for EdTech tools that teach. A simulated class of students has a lesson with each tool, and the site shows whether the tool is safe, whether every kind of learner can use it, and whether anyone actually learned. Built by Kien and Nina for EduX Hackathon UK 2026, Challenge 2.

## Run it

```bash
cd frontend
npm install
VITE_DEMO=1 npm run dev     # saved lab results, no backend needed
```

Open http://localhost:5173. To use the live backend instead, copy `.env.example` to `.env` and set `VITE_API_URL` to the backend address (see `../backend/README.md`). If the backend cannot be reached, the site falls back to the saved results and says so.

## What is on the site

| Page | Address | What it shows |
|---|---|---|
| Home | `/` | What Hivemind does, in one scroll |
| AI Advisor | `/check`, `/results` | An 8-minute check, then the tool types that worked best for students like you |
| EdTech tools | `/tools` | 78 real tools, sorted into four tool types |
| Simulation Lab | `/lab` | The simulated class, ratings, tool maker reports, a pilot on real tools, and results from 40 real students (`/lab/proof`) |
| Try | `/try/:id` | A live chat lesson with a demo tool |
| About, Privacy | `/about`, `/privacy` | How it works and what data is kept |

The site is also available in Russian and Hindi (language picker in the top bar).

## How the code is laid out

- `src/api.js` is the only file that talks to the backend.
- `src/pages/` has one file per page, and `src/components/` has the shared pieces.
- `src/styles/tokens.css` holds every colour, size, spacing and motion value.
- `src/i18n/` holds the translations, and `node scripts/check-i18n.mjs` checks them.
- `src/data/real-class.json` holds the results from the 40 real students.
- `public/demo/` holds saved backend results, used when the backend is off.

Built with React and Vite, using plain CSS and hand-made SVG charts. There is no UI or chart library.

`STANDARD.md` sets out the rules the site is held to, taken from the challenge brief.
