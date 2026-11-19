# Hivemind backend

Python + FastAPI. How it works: `../docs/DESIGN.md`. The API contract: `../docs/BACKEND.md`.

## Set up
```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
```
Copy `.env.example` to `.env` and fill in what you need (every key is free; never commit `.env`):
- `GEMINI_API_KEY`: real demo tools, student voice, live chat and ask.
- `SAFE_BROWSING_API_KEY`: the link check for product submissions.
- `ADMIN_PASSWORD`: approve or reject submissions.
- `DATABASE_URL`: the Neon Postgres database for saved data (real-classmate checks, submissions); empty means JSON files in `data/store/`. It needs port 5432, which some Wi-Fi (school, venues) blocks: use a phone hotspot. If it's out of reach, only saved-data routes fail (`store_unavailable`, 503) and `python -m app.export` stops, so export on a network that allows it.

## Run
| What | Command |
|---|---|
| All tests (free, offline) | `.venv/bin/python -m unittest discover -s tests -t .` |
| The API | `RELOAD=1 .venv/bin/python -m app.serve`, then open `http://localhost:8000/docs` |
| The API for teammates on the same network (demo, crash test) | `sh share.sh` (prints the address to give them) |
| Public links for the website and the API, from anywhere (crash test, expo) | `sh public-link.sh` (needs `cloudflared` and `frontend/` packages; prints two new links each run) |
| The same, for a class testing together on one Wi-Fi (the real-classmate test) | `sh public-link.sh --class`: raises the per-device limits for the day, and if the Wi-Fi blocks the database, saves results in files on this laptop instead of failing |
| Copy results saved on the laptop into the database afterwards (on a hotspot, VPN or at home) | `.venv/bin/python -m app.sync` (`--dry-run` to only count); never overwrites, and each file is copied once (it then moves to `data/store/synced/`), so a record deleted from the database is never brought back. Run it after the class session is over |
| One lesson, printed | `python3 -m app.run_lesson --student s07 --tutor socratic --offline` |
| How much each demo tool teaches each group (tuning) | `python3 -m app.tune` |
| The lab, offline (pre-written demo tools) | `python3 -m app.lab --offline` |
| The lab, real AI (resumes if stopped) | `python3 -m app.lab` |
| Check accuracy test (40 made-up students with known answers take the real check) | `.venv/bin/python -m app.check_test`; writes `data/export/check-test.json`. Tests the check as a measuring tool, never adds to the classmate results |
| Demo-mode files | `.venv/bin/python -m app.export` (`--with-ai` adds ask and chat examples) |
| Relay one real-tools pilot lesson (`docs/PILOT.md`) | `.venv/bin/python -m app.relay --tool chatgpt_study --student s10` (`--voice scripted`: no AI calls; `--list`: what's done) |
| Live lab stream (try it) | `curl -N "http://localhost:8000/api/live-lab?tutor_id=simple_steps&mode=replay"` (`mode=live` uses real AI) |
| Demo maker product (PieChart Pal) | `.venv/bin/uvicorn app.demo_maker:app --port 8100` |

## Before a demo or crash test
1. Be on a network that allows port 5432 (a phone hotspot works), so saved data works.
2. Start it for the team: `sh share.sh` (from `backend/`). It checks the database, keeps the Mac awake while it runs, starts the API for the network and prints the `VITE_API_URL=http://<address>:8000` line to send teammates. The first time a teammate connects, macOS may ask to allow incoming connections for Python: click Allow.
3. Check `curl http://localhost:8000/api/health` answers `{"ok": true, ..., "store": "database", "tutors": 5}`.
4. Run the tests: `.venv/bin/python -m unittest discover -s tests -t .` (217 pass on 18 Nov).
5. **Or, for people not on your network** (Mike, judges, a phone on mobile data): `sh public-link.sh` (from `backend/`). It opens two free Cloudflare quick tunnels, builds the website for the backend link, starts the backend allowing only that website, and prints the website link to send. Ctrl+C stops it all. The links change every run, and a quick tunnel can drop after some hours (the log says "Tunnel not found"): just run it again and send the new link. Lid closed overnight: `sudo pmset -a disablesleep 1` (undo with `0`).
6. The live lab on stage: `mode=live` uses Gemini calls; `mode=replay` uses none, so keep replay ready if the Wi-Fi or the daily limit fails.

## Files
| File | What it does |
|---|---|
| `public-link.sh`, `spa_server.py` | Public links through Cloudflare quick tunnels; `spa_server.py` serves the built website so pages like `/lab/ratings` work |
| `app/check_test.py` | The check accuracy test: made-up students with known traits, an answer model, and how close the check gets |
| `app/sync.py` | Copies classmates' results, suggestions and submissions saved on the laptop (`--class` on a Wi-Fi that blocked the database) into the database |
| `app/config.py` | Every setting, threshold, limit and weight |
| `app/students.py` | The 30 simulated students, their groups and traps |
| `app/brain.py` | What a student knows (Bayesian Knowledge Tracing) and when they give up |
| `app/assessment.py` | The 10-question test, answered from the brain with fair dice |
| `app/lesson_plan.py`, `app/labeller.py` | The 3 problems; labels each demo tool message and its reading age |
| `app/tutors/` | Demo tool plug: pre-written, Gemini (`demo.py`), 5 styles |
| `app/voice/` | Voice plug: pre-written, and AI (`ai.py`) with checks |
| `app/simulation.py` | One lesson: move on only when right, traps, Safety judge |
| `app/safety.py` | The Safety judge (rules, no AI) for lessons and live replies |
| `app/scores.py` | Three scores, evidence, safety panel, bias |
| `app/lab.py` | Resumable lab runs with a daily AI budget |
| `app/pilot.py`, `app/relay.py` | Real-tools mini pilot: 6 real tools × 3 students; a person relays each message (`RelayTutor`), saved turn by turn in `data/pilot/` |
| `app/live_lab.py` | `GET /api/live-lab`: a lab run streamed as Server-Sent Events, live or replayed |
| `app/catalog.py`, `app/ratings.py`, `app/report.py` | Demo tools and runs; heatmap table; tool maker report |
| `app/real_tools.py`, `data/real_tools.json` | Real EdTech tools (Kien's list), each linked to its demo tool type; never given scores |
| `app/check.py`, `app/matching.py`, `app/advisor.py` | 8-minute check → profile; weighted match; follow-ups and ask |
| `app/live.py` | Live chat and the real-classmate check |
| `app/submissions/` | Form, link checks, Safe Browsing, maker client, review queue, class runs |
| `app/demo_maker.py` | PieChart Pal, the demo product (its own service) |
| `app/store.py`, `app/limits.py` | JSON files or Postgres; per-device rate limits |
| `app/api.py`, `app/export.py` | The routes; demo-mode export |
| `app/middleware.py`, `app/serve.py` | Client address for rate limits, 16 KB body cap, security headers; the safe start command |

## Deploy (Render, free)
1. **Backend web service:** root directory `backend`, build `pip install -r requirements.txt`, start `python -m app.serve`, environment `PYTHON_VERSION=3.15.2`, `HOST=0.0.0.0`, `PROXY_HOPS=1`, plus the `.env` keys (`GEMINI_API_KEY`, `SAFE_BROWSING_API_KEY`, `ADMIN_PASSWORD`, `DATABASE_URL`, `CORS_ORIGINS`). Never start it with `--forwarded-allow-ips '*'`: that lets anyone dodge the rate limits (see `docs/archive/SECURITY-AUDIT-2026-11-15.md`). After deploy, confirm `PROXY_HOPS=1` is right for Render with the rate-limit test in that report.
2. **Demo maker web service:** same repo and root, start `uvicorn app.demo_maker:app --host 0.0.0.0 --port $PORT --no-access-log`, environment `DEMO_MAKER_CODE` (set after submitting it).
3. Check `https://<backend>/api/health`. Free services sleep after 15 minutes idle: wake it 2 minutes before the pitch.
