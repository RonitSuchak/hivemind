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
- `DATABASE_URL`: online only (Neon Postgres); empty means JSON files in `data/store/`.

## Run
| What | Command |
|---|---|
| All tests (free, offline) | `.venv/bin/python -m unittest discover -s tests -t .` |
| The API | `RELOAD=1 .venv/bin/python -m app.serve`, then open `http://localhost:8000/docs` |
| One lesson, printed | `python3 -m app.run_lesson --student s07 --tutor socratic --offline` |
| How much each demo tool teaches each group (tuning) | `python3 -m app.tune` |
| The lab, offline (pre-written demo tools) | `python3 -m app.lab --offline` |
| The lab, real AI (resumes if stopped) | `python3 -m app.lab` |
| Demo-mode files | `.venv/bin/python -m app.export` (`--with-ai` adds ask and chat examples) |
| Demo maker product (PieChart Pal) | `.venv/bin/uvicorn app.demo_maker:app --port 8100` |

## Files
| File | What it does |
|---|---|
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
1. **Backend web service:** root directory `backend`, build `pip install -r requirements.txt`, start `python -m app.serve`, environment `PYTHON_VERSION=3.15.2`, `HOST=0.0.0.0`, `PROXY_HOPS=1`, plus the `.env` keys (`GEMINI_API_KEY`, `SAFE_BROWSING_API_KEY`, `ADMIN_PASSWORD`, `DATABASE_URL`, `CORS_ORIGINS`). Never start it with `--forwarded-allow-ips '*'`: that lets anyone dodge the rate limits (see `SECURITY-AUDIT-2026-11-15.md`). After deploy, confirm `PROXY_HOPS=1` is right for Render with the rate-limit test in that report.
2. **Demo maker web service:** same repo and root, start `uvicorn app.demo_maker:app --host 0.0.0.0 --port $PORT --no-access-log`, environment `DEMO_MAKER_CODE` (set after submitting it).
3. Check `https://<backend>/api/health`. Free services sleep after 15 minutes idle: wake it 2 minutes before the pitch.
