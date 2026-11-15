# Hivemind

*EduX Hackathon UK 2026 (Cambridge EdTech Society × InCubed), Challenge 2: Setting the Standard: What Should We Expect from EdTech? Team: Ronit, Mike, Kien, Nina. Submit by Thu 19 Nov 2026, 11:59pm; expo Fri 20 Nov.*

**Repo:** `backend/` (Ronit) · `frontend/` (Kien and Nina) · `docs/` (design in [`docs/DESIGN.md`](docs/DESIGN.md), API contract in [`docs/BACKEND.md`](docs/BACKEND.md)). Latest state: [`HANDOFF.md`](HANDOFF.md). Folder rules: [`AGENTS.md`](AGENTS.md).

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

The obvious question is whether simulated students really learn like real ones. Hivemind answers it directly. A group of real classmates take the 8-minute check, try one tutor, and sit the same tests, and we compare their real results with what Hivemind predicted for students like them. That comparison is shown openly, including where the predictions are wrong. It is a first check, not a final verdict, and it brings genuine student feedback into the evaluation, as the challenge asks.

## What we will show on demo day

The presentation is eight minutes, so nothing slow runs live. The lab is run in advance and the real saved lessons are replayed in fast-forward; only the phone check and the match, which are instant, run live. A judge takes a short check on their phone, sees their profile appear, is matched to similar simulated students, and gets their own ranked list. We then replay the class being taught by two tutors, watch different students fall behind, see a safety trap get caught, and click a score to show its evidence. We finish with the simulation's predictions next to real results from our classmates. We will have tested four or five chat-based AI tutors this week, and we say so.

| Time | What we show |
|---|---|
| 0:00–1:00 | The problem: one average score hides the students a product fails |
| 1:00–2:00 | Hivemind in one picture: the lab, then the match |
| 2:00–4:00 | Demo, AI Advisor: a judge's check, radar, match and ranked list |
| 4:00–5:30 | Demo, Simulation Lab: class replay on two tutors, a safety trap caught, evidence behind a score |
| 5:30–6:30 | Predictions next to real results from our classmates |
| 6:30–7:30 | Who uses it (schools, tool makers) and how it grows |
| 7:30–8:00 | Close |

## How it fits the judging criteria

On people and theory, it tackles a real problem for teachers choosing AI tutors and is built on research about how students learn. On tech, it combines simulated students driven by an open knowledge-tracing model, a standard test, a matching step and a demo that works. On responsible AI, it shows which groups a product fails, stores no names or real data, never labels children, and is honest about its limits. On creativity, it replaces one average score with a whole class, and gives every real student their own match.

## In one sentence

Ratings tell you whether a tool is good on average; Hivemind tells you who it is good for.
