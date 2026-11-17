# Hivemind: vision and standard

Written 17 Nov 2026 against the EduX 2026 UK brief, Track 2: "Setting the Standard: What Should We Expect from EdTech?" (challenge setter: BNU Centre for Connective Intelligence in Education). This file covers the website (`frontend/`). The backend's own design is in `docs/DESIGN.md`.

## The brief in one line

> How might we develop technology-enabled evaluation systems that assess the **safety, usability, and learning impact** of EdTech products?

Target users named by the brief: **EdTech products** (their makers), **EduX participants and judges**, **schools and educators**. Learners are not on that list. They stay on the site as a fourth audience, but the three named users come first.

## Vision

Hivemind is a crash test for EdTech tools that teach. A class of simulated students, each with a different learning profile, has a lesson with the tool. Hivemind then reports three separate things: is it safe, can every kind of learner use it, and did anyone actually learn. Every score links to the exact words that produced it.

- A **tool maker** gets a fix list: which learners their tool leaves behind, and why.
- A **school** sees which tool works for which kind of student, not one average.
- A **judge** can click any number and read the evidence, then read the limits.

One sentence for the pitch: ratings tell you whether a tool is good on average; Hivemind tells you who it is good for, who it fails, and whether it is safe at all.

## The standard

Each line is pass or fail, and names the screen that must show it.

### A. The brief's scope
| # | The site must | Where |
|---|---|---|
| A1 | Show three separate scores (Safety, Usability, Learning) for every tested tool, never blended into one | Lab, Ratings, Real tools |
| A2 | Show a tested tool's results on misinformation, bias, privacy and inappropriate content, with the tool's exact words on a fail | Lab safety panel, Report |
| A3 | Split results by kind of learner (reading age, new to English, starting level, staying power) | Ratings, Report |
| A4 | Show the gain from a before and after test, and whether the tool made students think or just gave answers | Lab, Report |
| A5 | Combine the numbers with feedback from real students: a real person can sit the test before and after a lesson, and the site shows real gain next to predicted gain | Proof |
| A6 | Give a tool maker one page for their tool: which groups learned less, the reason, example chats | Report |
| A7 | Show the same test applied to real products, and say how it scales | Real tools, About |
| A8 | Say in plain words what is AI and what is maths in the simulation | About |

### B. The brief's users
| # | The site must | Where |
|---|---|---|
| B1 | Take a tool maker from the home page to a report in 2 clicks | Home, Report |
| B2 | Take a teacher from the home page to "which tool for which students" in 2 clicks | Home, Ratings |
| B3 | Take a judge from the home page to the method, the evidence and the limits in 2 clicks | Home, About, Lab |

### C. Honesty
| # | Rule |
|---|---|
| C1 | Every score, gain, rank and outcome on screen comes from the backend. The site works none out. The one exception is "Try a student", which is labelled a rough explorer. |
| C2 | Every score shows its sample: 30 simulated students, 3 in the pilot, or "preview data" for a scripted run. |
| C3 | No page contradicts another: what is tested, what is not, how many checks, how many tools. |
| C4 | Simulated students are called simulated, and "not real children", wherever they appear. |
| C5 | A real tool that was not tested never shows a score. Pilot scores always sit next to the pilot note. Pilot tools never appear in the ratings, the heatmap or the match. |
| C6 | Empty is shown as empty. No made-up or seeded results anywhere. |
| C7 | No label on a real person, and no "learning styles". |

### D. A working prototype
| # | Rule |
|---|---|
| D1 | With saved data (`VITE_DEMO=1`), every page loads with no console error. |
| D2 | `npm run build` passes. |
| D3 | No sideways scrolling at phone width (375 px) or laptop width (1024 px) on any page. |
| D4 | The saved data in `public/demo/` equals the backend's latest export (the made-up question packs in `topics/` aside). |
| D5 | A feature that needs the live backend says so clearly when it is off. It never shows an error or a blank. |
| D6 | New controls work from the keyboard and have a name. Reduced motion is respected. |

### E. Words
| # | Rule |
|---|---|
| E1 | "Demo tool", never "tutor", on screen. The check's length comes from the backend. |
| E2 | Short, plain sentences. Text from a tool, a student or an AI is never inserted as HTML. |
| E3 | Home page and menu text exists in English, Russian and Hindi. |

## What the website cannot close

These are real gaps, and they sit outside `frontend/`:

- The brief asks for a **2 to 3 minute video and a pitch deck**. Neither exists in this folder.
- **Real classmates:** the proof page can collect results, but the count is 0 until people take it against the live backend.
- **Two demo tools** (Answer Machine, Lecturer) are scripted previews until Ronit's AI runs finish.
- **Hosting:** the backend runs on a laptop, so judges see saved data unless they are on the same Wi-Fi.
- **Real tools:** 3 of 6 pilot tools are done, with 3 students each. That is a pilot, not a rating.

## Self-check, 17 Nov 2026

The site was graded against this standard twice by a reviewer that did not build it, with fixes after each pass. The grades below are the second pass, updated for the fixes made after it. Those last fixes were checked by the builder only, not re-graded independently.

| Lines | Grade | Why |
|---|---|---|
| A1, A2, A3, A4, A6, A8 | Pass | Three separate scores, safety checks with exact words, results by group, before and after gains, a maker report, AI versus maths explained. |
| A5 | Partial | The proof page works end to end against a live backend (tested on a throwaway copy). No real student has taken part, so there is no real-versus-predicted result yet. |
| A7 | Partial | 3 real tools piloted with 3 students each, replies copied by hand. There is no "submit your tool" page on the site. |
| B1, B2, B3 | Pass | Each named user reaches their page in one click from the home page. |
| C1 | Partial | The site invents no score. It does sort the ratings list, pick "worked best for" from the lab's group averages, and mark ties. The backend sends no rank for these. |
| C2 | Fixed, not re-graded | Pass 2 marked it partial. Samples now shown: 30 simulated students, 3 in the pilot, "Preview data" on scripted runs, group sizes on the heat table. |
| C3 | Fixed, not re-graded | Pass 2 found three contradictions (an unconfirmed safety fail shown as fact on some pages, 78 versus 65 tools, "left behind" with gained marks). All three were fixed afterwards. |
| C4, C5, C7 | Pass | |
| C6 | Partial | The About match drawing uses made-up tools and numbers, labelled as made up. The demo question packs for subjects other than fractions are made up and labelled. |
| D1 to D6, E1 to E3 | Pass | 15 routes, no console error, no sideways scroll at 375 px or 1024 px, saved data identical to the backend export, three languages complete. |

### Still open, and who can close it

- **Ronit:** a person must review the two safety fails marked "Needs review" (Cheerleader and Copilot). Both replies partly refuse the fake note, and each one caps a Safety score. Until then every page shows "needs review" beside them.
- **Ronit:** send a rank and a "best for" group with the ratings, so the site stops sorting them itself (C1). Add a "teaches or study helper" field to the real tools list, so the split is not only on the site.
- **Team:** get real classmates through the proof page on the live backend (A5). Finish the Answer Machine and Lecturer AI runs, then re-copy the export.
- **Team:** the brief's video and pitch deck.
- **Not tested:** the live lesson page's "Run live with real AI" button has never completed a real run (only a refused start and the saved replay were tested). Ronit should try it once before anyone presses it on stage. A handler that failed to close would re-run and spend the shared AI budget.
- **Not built:** a "submit your tool" page (the backend supports it), and "ask about your results".
