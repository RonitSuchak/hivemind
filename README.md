# Hivemind

*EduX Hackathon UK 2026 (Cambridge EdTech Society × InCubed), Challenge 2: Setting the Standard: What Should We Expect from EdTech? Team: Ronit Suchak (backend), Nguyen Canh Kien and Yun Ning (Nina) Kao (frontend), Mike (coach, demo and pitch).*

**Ratings tell you whether an AI tutor is good on average. Hivemind tells you who it is good for, who it fails, and whether it is safe.**

## Try it

- **Live site:** the current address is at the top of [`HANDOFF.md`](HANDOFF.md) (it runs from a laptop through a free tunnel, so the address changes when it restarts).
- **Without the live backend:** the website runs on saved results from the real backend.
  ```bash
  cd frontend && npm install && VITE_DEMO=1 npm run dev   # http://localhost:5173
  ```
- **The full backend:** see [`backend/README.md`](backend/README.md) (Python + FastAPI; the tests run offline and need no keys).

## Results so far (19 Nov)

| What we tested | What we found |
|---|---|
| **5 demo tools × 30 simulated students** (150 lessons with real AI) | Safety / Usability / Learning out of 5. Simple Steps 5.0 / 4.8 / 4.2. Socratic 5.0 / 3.6 / 3.5. Cheerleader 2.0 / 4.1 / 3.8 (asks children personal questions). Answer Machine 5.0 / 1.7 / 1.9. Lecturer 2.0 / 1.3 / 2.5 (failed a critical safety trap). |
| **6 real tools, 48 hand-copied lessons** (pilot, up to 8 simulated students each) | Safety / Usability / Learning: ChatGPT 5.0 / 3.8 / 1.7, ChatGPT study mode 2.0 / 3.9 / 2.9, Gemini 2.0 / 2.3 / 1.8, Gemini Guided Learning 5.0 / 2.5 / 2.9, Copilot 2.0 / 3.7 / 1.6, Perplexity 2.0 / 1.9 / 1.3. Copilot wrote a fake parent's note both times it was asked; Perplexity failed both privacy traps. A small pilot, not comparable with the class of 30. |
| **40 real classmates** (before test, one real tool, same test after) | 32 counted. Tools of the Simple Steps type ("bite-size practice") came top both in the simulation (average gain 2.2 of 10) and with real students (2.25). Socratic-type tools ("guided hints") were second in the simulation but last with real students (0.56, 9 students). Only 11 classmates were close enough to simulated students to get a prediction; 4 of the 11 were within 1 mark (average error 1.61 marks). A first check with a small sample, shown on the site's Proof page as it is. |
| **The 8-minute check itself** (40 made-up students with known traits) | English and reading level measured well (88% and 80% close to the truth). Two weak measures found and fixed; a "didn't try" flag catches rushed checks. Made-up students, never mixed with the classmate results. |

**Repo:** `backend/` (Ronit) · `frontend/` (Kien and Nina) · `docs/` (design in [`docs/DESIGN.md`](docs/DESIGN.md), API contract in [`docs/BACKEND.md`](docs/BACKEND.md), how we test in [`docs/HOW-WE-TEST.md`](docs/HOW-WE-TEST.md)). Latest state: [`HANDOFF.md`](HANDOFF.md). Folder rules: [`AGENTS.md`](AGENTS.md).

---

## The problem

EdTech products are usually judged by how engaging they are, how many people finish them, or how much users say they like them. None of these tell you whether a product is safe, whether it is easy to use, or whether anyone actually learns from it. Proper evaluations, with real classes and controlled trials, answer those questions, but they are slow and expensive, so most products never get one. There is also a second, quieter problem: even when a product is rated, the rating describes an average student, and no real student is average. A tutor that is excellent for a confident reader can be useless for a student who is new to English, and an average score hides that completely.

## What Hivemind is

Hivemind is an evaluation system that tells you who an AI tutor works for, who it fails, and whether it is safe at all. Instead of asking real children to trial every product, it teaches a simulated class of 30 students with each tutor and measures what happens to them. Real students, teachers and tool makers then use those results to make decisions.

## How it works

Everything starts with a learner profile. An 8-minute check measures five things: starting level (a quick fractions quiz), learning speed (a two-minute mini-lesson followed by a second quiz, where the improvement is the speed), reading level, English confidence, and persistence (whether a student skips hard questions or keeps trying). Every learner in Hivemind, real or simulated, is described in exactly this format, and the profile is shown as a radar chart so you can see a learner's shape at a glance. We deliberately do not use "learning styles", which research has debunked.

Hivemind then builds a class of 30 simulated students, each with its own profile. Each one sits a 10-question test, has a lesson with an AI tutor, and sits the same test again. An AI writes each student's messages in character, but open maths (Bayesian Knowledge Tracing) decides what the student actually learns: a good hint or question raises their knowledge, being handed the answer does not. This answers the obvious objection that an AI already knows fractions. The same class is taught by every tutor being evaluated.

From these lessons, each tutor receives three separate scores. The safety score comes from traps built into the class: one student shares their address, one states a wrong sum, one asks something off-limits. Any serious safety failure caps the score and moves the tutor to the bottom with a "Safety concern" warning, so it can never be averaged away, like a failed car crash test. The usability score measures how often students got stuck and whether the tutor's words fit their reading and English level. The learning score measures how much the after-test improved, and whether the tutor made students think rather than simply giving the answer. Every score is linked to the exact chat lines that produced it, so anyone can click a number and read the evidence behind it.

When a real student takes the 8-minute check, Hivemind finds the simulated students with the most similar profiles and blends their results, giving more weight to the closest matches. The student sees a ranked list of tutors for learners like them, each with its three scores, a short reason, and a link to the product. If no simulated students are close enough to give a trustworthy answer, Hivemind says so instead of guessing. No names are stored; each student gets an anonymous code, and no child ever sees a label like "slow learner".

## Who it is for

Teachers use Hivemind to choose tutors that suit the actual mix of students in their class. Tool makers use it to see exactly which kinds of learners their product fails and why, with the evidence attached, so they can fix it. Students use it to find tutors that fit the way they learn.

## The two modes

The website has two views. The AI Advisor is the simple one: take the 8-minute check, see your profile as a radar chart, and get ranked recommendations with reasons and links, plus a few follow-up questions you can ask. The Simulation Lab is the detailed one, built for teachers, tool makers and judges: it shows the class of 30, how a real student was matched to them and how much each match counts, a heatmap of how well each group learned with each tutor, tutors side by side, and the full evidence behind every score.

## Why you can trust it

The obvious question is whether simulated students really learn like real ones. Hivemind answers it openly. 40 real classmates sat the 10-question test, used one real EdTech tool, and sat the same test again, and the Proof page puts their real gains next to what Hivemind predicted for students like them, including where the predictions are wrong (see "Results so far" above). We also tested the 8-minute check itself as a measuring tool, on made-up students whose true traits we knew. It is a first check with a small sample, not a final verdict, and it brings genuine student results into the evaluation, as the challenge asks.

## What we show at the expo

Judging is expo style, with a 4-minute pitch and a 2 to 3 minute video of the working prototype. Nothing slow runs live: the lab was run in advance and its saved lessons are replayed. A judge takes the check on their phone, sees their profile appear, is matched to similar simulated students and gets their own ranked list. We then show the class taught by two demo tools, a safety trap being caught, the chat behind a score, the real-tool findings, and the simulation's predictions next to our classmates' real results.

## How it fits the judging criteria

On people and theory, it tackles a real problem for teachers choosing AI tutors and is built on research about how students learn. On tech, it combines simulated students driven by an open knowledge-tracing model, a standard test, a matching step and a demo that works. On responsible AI, it shows which groups a product fails, stores no names or real data, never labels children, and is honest about its limits. On creativity, it replaces one average score with a whole class, and gives every real student their own match.

## In one sentence

Ratings tell you whether a tool is good on average; Hivemind tells you who it is good for.
