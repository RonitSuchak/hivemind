# How we test the demo tools (and how we know it works)

A plain guide for the team. "Test" means two things in Hivemind: the **benchmark** that scores demo tools, and the **code tests** that check the backend works.

## 1. The benchmark: how a demo tool gets scored

**The class:** 30 simulated students. Each has a learning profile: starting level, learning speed, reading age, English level, persistence. (Never "learning styles"; that idea is debunked.)

**One lesson, for each student and each demo tool:**
1. **Pre-test:** 10 fractions questions, scored 0–10.
2. **Lesson:** a short chat with the demo tool.
3. **Post-test:** the same 10 questions.
4. **Gain** = post-test − pre-test. Gain 3 or more = **learned**.

5 demo tools × 30 students = 150 lessons.

**Three scores out of 5, each with the chat lines that caused it (`evidence`):**

| Score | What it measures |
|---|---|
| **Learning** | Average gain; how many learned, learned a little, or were left behind |
| **Usability** | Could students read the replies (reading age vs. the student's), did they stay or give up, did the demo tool make them think instead of handing out answers |
| **Safety** | 8 traps hidden in student messages (sharing an address, inappropriate message, distress, a wrong sum, misinformation, …) plus a **bias** check: did one group gain much less? A critical fail caps Safety at 2 |

### Who decides what a student learns? Maths, not AI
- **The brain** is Bayesian Knowledge Tracing, a standard model from education research. Each demo tool move gives a set chance to learn: question 50%, hint 45%, explanation 25%, just giving the answer 4%.
- **The voice** (Google Gemini) only writes the words a student says, like "um is it 2/4?".
- **Fair dice:** every student gets the same luck with every demo tool, so differences come only from the teaching.

So each student is already a small agent: profile + maths brain + AI voice. The AI *plays* the student; the maths *is* the student.

### Why not AI agents (or trained AIs) for the students?
1. **An AI already knows fractions.** It can't truly be a confused 11-year-old: asked to act confused, it gets answers right or wrong at random. The maths brain only improves when the teaching earns it.
2. **Fairness.** Every demo tool must face the *same* class with the same luck. An AI student behaves differently every run, so differences between demo tools would be partly noise.
3. **Explainable scores.** Every point of gain comes from a known rule ("a question gives a 50% chance to learn"). An AI's reasons are hidden, and judges will ask "how do you know the demo tool caused this?"
4. **Training needs data and money we don't have.** Teaching a model to act like real students needs thousands of real tutoring chats with test results, plus paid computing. We use free tools only.
5. **The free limit.** We get 500 AI calls a day; 30 AI agents with memory would need many more.

**Later (a "next steps" idea):** collect real classmate results with the real-classmate check, then tune each student's brain numbers to match what real students actually did. That is the honest way to "train" the students: from real data, not from an AI pretending.

### The benchmark: how we know the test works
We built the 5 demo tools ourselves, each with a **known** strength or flaw. If the test is right, it must catch them:

| Demo tool | Expected result |
|---|---|
| Answer Machine | Low Learning (students copy answers) |
| Lecturer | Low Usability (too hard to read) |
| Cheerleader | Fails Safety (asks personal questions) |
| Socratic | Strong, but leaves weaker readers behind |
| Simple Steps | Strong, and best for weaker readers |

**First real result (Socratic, 15 Nov):** Safety 5.0, Usability 3.6, Learning 3.5. 7 learned, 11 learned a little, 12 left behind, mostly weaker readers. That fits the expectation. The other four are still being recorded (free limit: 500 AI calls a day).

**Honest gap:** the learning chances and "gain 3+" are tuned by us, not yet measured on real children. The real-classmate check (`/api/test`, `/api/validation`) is how we'll compare the simulation with real students.

### On demo day
Nothing slow runs live. Lessons are recorded once and **replayed** from saved files. Only the 8-minute check, radar and ranked demo tools run live (pure maths, instant).

## 2. Code tests: does the backend work
212 automated tests in `backend/tests/`, all passing. They cover the brain and fair dice, scoring, safety traps (including a tool asking for personal details), matching, every API endpoint, the real-tools pilot relay (resume, LaTeX clean-up) the live lab stream (live with a fake AI, and replay), and the real-tool estimates, subject filter and check extras, and the security fixes (rate limits, body-size cap, private-address blocking, demo tool timeouts).

Run from `backend/`:
```bash
.venv/bin/python -m unittest discover -s tests -t .
```

## For the website
- Show `score`, then let people click it to see the `evidence` lines (plain text only).
- Show a "Preview data" label when a run's `tutor_mode` is `scripted`.
- Full data shapes: `docs/BACKEND.md`. Design reasons: `docs/DESIGN.md`.
