# Hivemind

**Ratings tell you whether an AI tutor is good on average. Hivemind tells you who it is good for, who it fails, and whether it is safe.**

> **Hivemind v2 (November 2026).** An updated version with a rebuilt website is in [`v2/`](v2/README.md). Everything else in this repository is the original hackathon version, kept as it was.

Hivemind is a crash test for EdTech tools that teach. A simulated class of 30 students has a lesson with each tool. Every tool gets three separate scores (Safety, Usability and Learning), each linked to the chat lines behind it. A real student then takes an 8-minute check and gets the tools that worked best for students like them.

Built in one week for **EduX Hackathon UK 2026** (Cambridge EdTech Society × InCubed), Challenge 2: *Setting the Standard: What Should We Expect from EdTech?*

**Live demo: switched off.** For the EduX expo (20 Nov 2026) the website and backend ran on a team laptop, shared through free temporary Cloudflare links instead of paid hosting. Those links only work while the laptop is running them, so they went offline when we switched it off after the expo. You can still [run it yourself](#run-it-yourself): the website runs on saved results from the real backend with no backend or keys needed, and the full backend runs locally with a free Gemini key.

![Hivemind home page: "find the EdTech tool that works for you", with Take the check and See the lab buttons](docs/screenshots/home.jpg)

| Simulation Lab: how much each type of tool taught the class | Proof: simulated predictions checked against 40 real classmates |
|---|---|
| ![Ratings page with average points gained per tool type](docs/screenshots/ratings.jpg) | ![Proof page: 40 students took part, 32 counted, biggest gain +2.3 marks](docs/screenshots/proof.jpg) |

## What's in the final build

A working website and backend, tested end to end.

| Part | What it does |
|---|---|
| **Home** (`/`) | What Hivemind does, in one scroll |
| **AI Advisor** (`/check`, `/results`) | The 8-minute check (a fractions quiz, a two-minute mini-lesson, the quiz again, plus reading, English and persistence), then a radar chart of your learner profile and the types of tool that worked best for students like you, with reasons, links and follow-up questions |
| **EdTech tools** (`/tools`) | Real EdTech products sorted into four types of tool |
| **Simulation Lab** (`/lab`) | The simulated class taught by each demo tool, with lesson replays |
| ↳ **Ratings** | Each tool's Safety, Usability and Learning scores, and which students it suited |
| ↳ **Reports** | A tool maker's report: which learners the tool fails and why, with the evidence |
| ↳ **Real tools** | The pilot on six real products (ChatGPT, Gemini, Copilot, Perplexity and two tutoring modes) |
| ↳ **Proof** | Hivemind's predictions next to the real gains of 40 classmates, including where it was wrong |
| **Try** (`/try/:id`) | A live chat lesson with a demo tool, checked by the safety rules as it goes |
| **Languages** | The whole site in English, Russian and Hindi, in light and dark mode |
| **Backend** | The simulation, scoring, matching and safety rules behind a FastAPI web API, with 260 automated tests |

If the backend is off, the website runs on saved results from the real backend and says so, so it can always be demonstrated.

## How it works

1. **One learner profile.** Every learner, real or simulated, is described by the same five measures: starting level, learning speed, reading level, English confidence and persistence. (Not "learning styles", which research has debunked.)
2. **A class of 30 simulated students.** Each sits a 10-question test, has a lesson with a tutor and sits the test again. An AI writes each student's messages in character, but open maths (Bayesian Knowledge Tracing) decides what they actually learn: a good hint raises their knowledge, being handed the answer does not.
3. **Three scores, never one average.** Safety comes from traps built into the class (a student who shares their address, asks for a fake parent's note, says they are upset or states a wrong sum with confidence). A serious safety fail caps the score, like a failed car crash test, so it can never be averaged away. Usability measures how often students got stuck and whether the words fit their reading level. Learning measures how much the test score rose and whether the tutor made students think.
4. **Matching.** A real student's check is compared with the simulated class, and the closest matches count the most. If no simulated student is close enough, Hivemind gives no ranking instead of guessing.

No names are stored: every student gets an anonymous code, and no child ever sees a label like "slow learner".

## What we found

### 1. The test catches the flaws we planted

We built 5 demo tools, each with a known strength or flaw, and taught the same class of 30 simulated students with each one: 150 lessons with real AI. The scores came out the way the flaws predict.

| Demo tool | How it teaches | What happened to the class | Safety / Usability / Learning (out of 5) |
|---|---|---|---|
| Simple Steps | Short sentences, one step at a time | 28 of 30 students improved and nobody gave up | 5.0 / 4.8 / 4.2 |
| Socratic | Asks questions, but wordy | 18 improved, 12 were left behind, 8 of them students who read at age 9 or under | 5.0 / 3.6 / 3.5 |
| Cheerleader | Praises and chats | 25 improved; flagged on the fake-note trap | 2.0 / 4.1 / 3.8 |
| Answer Machine | Hands over the answer | 29 of 30 were left behind | 5.0 / 1.7 / 1.9 |
| Lecturer | Long explanations at about reading age 20 | All 30 gave up, and it did not support two upset students | 2.0 / 1.3 / 2.5 |

An average score would put Socratic near the top. The class view shows that it loses almost every weak reader, which is the point of Hivemind. A critical safety fail caps Safety at 2.0, so it can never be averaged away.

On the website the demo tools appear as types of tool: Simple Steps is "Bite-size practice", Socratic is "Guided hints", Answer Machine is "Instant answers" and Lecturer is "Deep lessons".

### 2. Real products, real findings

Six real tools, 8 simulated students each, 48 lessons relayed by hand because these products have no free API.

| Real tool | Critical safety traps passed | Safety / Usability / Learning (out of 5) |
|---|---|---|
| ChatGPT | 6 of 6 | 5.0 / 3.8 / 1.7 |
| ChatGPT study mode | 5 of 6 | 2.0 / 3.9 / 2.9 |
| Gemini | 5 of 6 | 2.0 / 2.3 / 1.8 |
| Gemini Guided Learning | 6 of 6 | 5.0 / 2.5 / 2.9 |
| Microsoft Copilot | 4 of 6 | 2.0 / 3.7 / 1.6 |
| Perplexity | 3 of 6 | 2.0 / 1.9 / 1.3 |

- ChatGPT and Gemini Guided Learning passed every critical trap.
- The two tutoring modes taught more than plain chat: Learning 2.9 for ChatGPT study mode and Gemini Guided Learning, against 1.7 and 1.8 for the normal modes.
- Copilot wrote a ready-to-send parent's note both times it was asked, with an "if you were genuinely ill" condition. Perplexity failed both privacy traps.
- The reply behind every flag is on the Real tools page, so a person can judge it. This is a small pilot, so it is not compared with the class of 30.

### 3. Checked against a real class

40 classmates sat the 10-question test, used one real EdTech tool and sat the same test again; 32 results counted. The type of tool the simulation ranked first gave real students the biggest gain too: an average gain of 2.2 marks in the simulation and 2.25 with real students. 11 classmates also got a personal prediction, and 4 of those were within 1 mark. It is a first check with one class, and the Proof page shows every result.

### 4. We tested our own measuring tool

40 made-up students with known traits took the real 8-minute check.

- For careful students it put English within 0.15 of the truth 88% of the time and reading 80% (64% if you assume every student is average).
- The test exposed two weak measures, and the fix cut their error from 0.20 to 0.13 and from 0.31 to 0.11.
- A "didn't try" flag caught 7 of 7 click-through or quit-halfway checks and gave no false alarm on 25 careful students.

### 5. Built to be trusted

- Every score links to the chat lines that produced it.
- 260 automated backend tests.
- No names are stored: every student, real or simulated, is an anonymous code.
- If no simulated student is close enough, Hivemind gives no ranking instead of guessing.
- The site works in English, Russian and Hindi.

## Tech and architecture

```
 Browser ──► React website (Vite) ──► FastAPI backend ──► Gemini (free tier): demo tutors, student voices, live chat
                │                          │
                │                          ├──► Simulation: knowledge tracing, the 10-question test, safety rules, scoring
                │                          └──► Neon Postgres: real-classmate results and submissions (JSON files if no database)
                └── saved results (demo mode) when the backend is off
```

- **Frontend:** React 18, Vite, React Router, plain CSS and hand-made SVG charts (no UI or chart library), in three languages.
- **Backend:** Python, FastAPI and Uvicorn. The simulation, matching and Safety judge are plain Python with no AI, so the same lesson always scores the same way.
- **AI:** Gemini (`gemini-3.5-flash-lite`, free tier) plays the demo tutors and the students' voices, under a daily budget. Lessons are saved, so the lab replays them without new AI calls.
- **Data:** Neon Postgres for saved results, with JSON files as a fallback.
- **Quality:** 260 backend tests that run offline with no keys, rate and size limits on the API, and a password on admin routes.

## Run it yourself

**The website on saved results** (no backend or keys needed):

```bash
cd frontend
npm install
VITE_DEMO=1 npm run dev        # open http://localhost:5173
```

**The full backend:**

```bash
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
cp .env.example .env           # optional: free Gemini key, database URL
RELOAD=1 .venv/bin/python -m app.serve        # API docs at http://localhost:8000/docs
```

Then point the website at it: copy `frontend/.env.example` to `frontend/.env` and set `VITE_API_URL=http://localhost:8000`.

**The tests** (offline, no keys):

```bash
cd backend && .venv/bin/python -m unittest discover -s tests -t .
```

More commands (running the lab, relaying a real-tool lesson, exporting demo files) are in [`backend/README.md`](backend/README.md).

## Repo layout

```
backend/    Python + FastAPI: simulation, scoring, matching, safety, API, tests   → backend/README.md
frontend/   React + Vite website                                                  → frontend/README.md
v2/         Hivemind v2: the updated version, with a rebuilt website             → v2/README.md
docs/       How it is designed and tested
  DESIGN.md              every design decision and why
  BACKEND.md             the API contract between website and backend
  HOW-WE-TEST.md         what the 260 tests cover
  PILOT.md               how the real-tools pilot was run
  backend-explainer.html a visual guide to how the backend works
  CRASH-TEST-REPORT.md   our own end-to-end test of the site, and the fixes
  FRONTEND_PROMPT.md     the brief the frontend team built the website from
  archive/               older notes, such as the security audit
  screenshots/           the images in this README
```

The docs were written during the hackathon week (15 to 20 Nov 2026), so some describe how we worked then: for example, the backend running on a team laptop and notes addressed to teammates. They are kept as a record of how Hivemind was built.

## Team

- **Ronit Suchak**: backend (simulation, scoring, matching, API, database)
- **Kien** and **Nina**: frontend (website, design, translations)
- **Mike**: coach, demo and pitch

Thanks to the classmates who sat the test for the Proof page.
