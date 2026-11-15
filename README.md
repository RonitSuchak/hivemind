# Hivemind

> We test AI tutors on a **simulated class of 30 students**, then match real students to the tools that worked for students like them.

EduX Hackathon UK 2026 (Cambridge EdTech Society × InCubed) · Challenge 2: *Setting the Standard: What Should We Expect from EdTech?*
Team: Ronit, Mike, Kien, Nina (AI club) · "Hivemind" is a working name.

**Status:** design approved; backend being built (real AI lessons working). Latest state: [`HANDOFF.md`](HANDOFF.md). Folder rules for people and AI assistants: [`AGENTS.md`](AGENTS.md). Designed pitch: [`docs/pitch.html`](docs/pitch.html).

**Repo sections:** `backend/` (Ronit) · `frontend/` (Kien and Nina) · `docs/` (design and the API contract `docs/BACKEND.md`).

---

## The idea in 30 seconds

Schools are picking AI tutors with no way to check them. A star rating gives one average score, which hides the students a product fails.

| Part 1 · The lab | Part 2 · The match |
|---|---|
| **Rate the tools.** 30 simulated students, all different, take a lesson with each AI tutor. We see which tutor works for which kind of student. | **Find the right tool.** A real student does an 8-minute check. We find the simulated students most like them and rank the tools from best to worst for them. |

Part 1 answers Challenge 2: it rates EdTech products. Part 2 turns those ratings into advice a teacher can act on.

---

## Part 1: the lab

The same class of 30, taught by two different tutors:

| | Learned | Learned a little | Left behind |
|---|:---:|:---:|:---:|
| **Tutor A:** gives answers fast | 🟢 16 | 🟡 4 | 🔴 10 |
| **Tutor B:** asks questions, simple words | 🟢 13 | 🟡 15 | 🔴 2 |

*A made-up example to show the idea. These are not real results.*

On an average score these two tutors look close. The class view shows that Tutor A leaves a third of the class behind, and which students they are.

### How a lesson runs
1. **Build the class.** Each simulated student differs in what they already know, reading level, English level, learning speed and how easily they give up.
2. **Test before.** Every student sits the same 10-question test.
3. **Lesson.** Each student chats with the AI tutor. An AI writes their messages in character, but open maths decides what they actually learn.
4. **Test after.** The same test again. The answers come from what the student learned, not from the AI.
5. **Rating table.** Every tutor gets a score for every type of student.

### Three scores for every tutor
Each tutor gets a **Safety**, a **Usability** and a **Learning** score, the challenge's three areas, each with its own reasons.

- **Safety:** some simulated students set traps. One shares their address, one states a wrong sum, one asks something off-limits. A serious fail is never averaged away: the tutor drops to the bottom with a "Safety concern" warning, like a failed car crash test.
- **Usability:** how often students got stuck, and whether the tutor's words fit their reading and English level.
- **Learning:** how much the after-test improved, and whether the tutor made students think or just gave the answer.

Every score links to the exact chat lines behind it. Click a number, read the evidence. Full rules: [`docs/DESIGN.md`](docs/DESIGN.md).

### What the tool maker sees
A report on **which students their tutor fails, and why**, for example: "works for confident readers, leaves students new to English behind; see these 3 chats." That is something they can fix.

---

## Part 2: the match

### The 8-minute check
- **Starting level:** a quick fractions quiz.
- **Learning speed:** a 2-minute mini-lesson, then a second quiz. The improvement is the speed.
- **Reading level:** a short passage with two questions.
- **English confidence:** one question.
- **Persistence:** do they skip hard questions or keep trying?

No names. Each student gets an anonymous code.

### What the teacher sees

**Profile:** `Starting level: low` `Learns fast` `Reading age 10` `New to English`
Matched to 4 simulated students with a similar profile.

| Rank | Tutor | Why | Predicted improvement |
|:---:|---|---|:---:|
| 1 | Tutor B | Short steps, simple words, asks questions | 🟢 +42% |
| 2 | Tutor D | Good hints, but long replies | 🟢 +31% |
| 3 | Tutor C | Too hard to read for this profile | 🟡 +12% |
| 4 | Tutor A | Gives the answer, little is learned | 🔴 +4% |

*A made-up example, not real results.*

---

## Why ours is different

**Other ratings give an average. We show who a product fails, and which one fits each student.**

One tutor can be five stars for confident students and one star for students new to English. A school needs to know that before it buys. Testing on simulated students first means no real child is the experiment.

The real students who take the check also try one tutor. Their real results show whether the simulation predicted correctly. That is our evidence.

## The moments judges will remember
- 30 students learn in fast-forward on the big screen. We swap the tutor and different students fall behind.
- A judge takes the 8-minute check on their phone and sees their own ranked list appear.
- We show the simulation's predictions next to real results from our classmates.

## The website (frontend)
Two modes:

| AI Advisor (for students and teachers) | Simulation Lab (for teachers, makers and judges) |
|---|---|
| Take the 8-minute check, see your profile as a **radar chart**, get the ranked tutors with reasons, links and a few follow-up questions. | The class of 30, how a student was matched (and how much each match counts), the class heatmap, tutor side by side, and the evidence behind every score. |

The radar chart shows a student's profile on top of the simulated students they were matched to, so you can see why they matched. Tutor scores are shown as three separate bars, not a radar.

## The 8-minute presentation
Nothing slow runs live. The lab is run in advance, and we **replay the real saved lessons** in fast-forward. The only live parts are the phone check and the match, which are instant.

| Time | What we show |
|---|---|
| 0:00–1:00 | The problem: one average score hides the students a product fails |
| 1:00–2:00 | Hivemind in one picture: the lab, then the match |
| 2:00–4:00 | **Demo, AI Advisor:** a judge takes a short check, their radar appears, they're matched, their ranked list appears |
| 4:00–5:30 | **Demo, Simulation Lab:** replay the class on two tutors; a safety trap gets caught; click a score to show its evidence |
| 5:30–6:30 | Predictions next to real results from our classmates |
| 6:30–7:30 | Who uses it (schools, tool makers) and how it grows |
| 7:30–8:00 | Close: *"Ratings tell you if a tool is good on average. Hivemind tells you who it's good for."* |

---

## Questions judges will ask

**"AI already knows fractions. How can it learn?"**
Each student has a knowledge score that open maths controls. A hint or a good question raises it. Being handed the answer does not. The method is called Bayesian Knowledge Tracing.

**"Is this learning styles?"**
No. Visual and auditory learning styles have been debunked. We use differences with evidence: what students already know, reading level, English level, learning speed and persistence.

**"How do you know the simulation is right?"**
Real students who take the check also try one tutor, and we compare their results with what the simulation predicted. It is a first check, not a final verdict.

**"Aren't you labelling children?"**
The check gives a match, not a level. A child never sees a score like "slow learner". A teacher or parent sees the list as advice and makes the choice.

**"How many tools have you tested?"**
About 4 or 5 this week, and we say so. We show early results, not "the best tool for you". We test chat-based AI tutors only.

---

## How it scores on the judging criteria
Four parts, 10 points each.

| Criterion | Our answer |
|---|---|
| **People and theory** | A real problem for teachers choosing AI tutors. Built on research about how students learn. |
| **Tech** | Simulated students with an open maths model, a standard test, a matching step and a live demo that works. |
| **Responsible AI** | Shows which groups a product fails. No names or real data stored. No labels on children. Honest about its limits. |
| **Creativity** | A whole class instead of one score, and a match for each real student. |

---

## What we need to decide
- **The name.** "Hivemind" is a working name.
- **The AI model.** The simulated students need a live AI model to write their messages. A free service would do, and Ronit needs to approve it.
- **Who does what.** Backend: Ronit (the simulation, the scoring, the matching and the submission checks). Frontend: Kien and Nina (the website: class view, 8-minute check, teacher's results and submit page). Coach: Mike. Still to share out: writing the students and tests, running them with real classmates, and the pitch and video.
- **What to cut if time runs out.** The lab is the core. The match is the last step and can be simpler.

## Dates
| | |
|---|---|
| **Submit by** | Thu 19 Nov 2026, 11:59pm |
| **Expo and showcase** | Fri 20 Nov 2026 |
