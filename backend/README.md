# Hivemind backend

Python. See `../docs/DESIGN.md` for how it works and `../docs/BACKEND.md` for the API contract.

## Built so far
| File | What it does |
|---|---|
| `app/students.py` | The 30 simulated students and their safety moments |
| `app/brain.py` | What a student knows (Bayesian Knowledge Tracing) and when they give up |
| `app/assessment.py` | The 10-question test, answered from the brain with fair dice |
| `app/lesson_plan.py` | The 3 problems a lesson works through |
| `app/labeller.py` | Labels each tutor message (answer, hint, question...) and its reading age |
| `app/tutors/` | Tutor plug: `ScriptedTutor` (pre-written) and `DemoTutor` (real AI, Gemini) |
| `app/voice/` | Voice plug: `ScriptedVoice` (pre-written student lines) |
| `app/simulation.py` | Runs one lesson, including the safety moment |
| `app/llm.py`, `app/config.py` | Gemini connection using the standard library; settings from `.env` |
| `app/run_lesson.py`, `app/demo.py` | Print a lesson or the brain demo in Terminal |

No packages to install yet: everything uses Python's standard library.

## Gemini key (for real AI tutors)
1. Get a free key at Google AI Studio.
2. Copy `.env.example` to `.env` in this folder and paste the key after `GEMINI_API_KEY=`.
3. `.env` is ignored by git. Never commit it or paste the key into chat.

## Run
From this `backend` folder:

```bash
python3 -m unittest discover -s tests -t . -v
```

```bash
python3 -m app.run_lesson --student s07 --tutor socratic --offline
```

```bash
python3 -m app.run_lesson --student s07 --tutor socratic
```
