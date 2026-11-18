# Crash test report (18 Nov 2026, evening)

**Tested by Claude for Ronit, on the public link, running `main` at `ae4f1a8`.** Nothing in the code was changed. Every page was opened on desktop and at phone width (375 px), in English, Russian and Hindi, in light and dark mode. The backend was also sent bad and odd requests.

**Result:** nothing crashed, no page failed to load, and no request failed. There are 13 frontend issues (for Kien) and 9 backend issues (for Ronit).

Severity: **High** = a judge is likely to see it and it gives a wrong picture. **Medium** = visible and wrong, but not misleading. **Low** = polish.

---

## Frontend issues (Kien)

| # | Severity | Page | What is wrong | Where / fix |
|---|---|---|---|---|
| F1 | High | Real tools | The text still says **three** students and **one** safety trap, but the page lists 8 students and every trap is tried twice. | `frontend/src/pages/Pilot.jsx` lines 56, 91, 92, 117, 167, 216. Use the numbers the backend sends (`lessons_planned`, `sample`, `note`). |
| F2 | High | Offline demo copy | `frontend/public/demo/pilot.json` is still the old 3-lesson pilot. It shows Gemini Safety **5.0**; the real score is **2.0**. Any deploy without the backend shows the wrong scores. | Copy `backend/data/export/pilot.json` into `frontend/public/demo/`. The other 12 files already match. |
| F3 | Medium | Real tools | "What this Safety score rests on" shows **one** reply per tool. The backend sends up to 5 pieces of evidence and a trap tally (`safety.checks`). Perplexity's two privacy fails and Copilot's second fake note are not shown, and ChatGPT's 5.0 looks like it rests on one reply. | Show the tally (for example "fake note 2 of 2 passed") and list every failed check. See `docs/FRONTEND_PROMPT.md` section 4. |
| F4 | Medium | Results | The wheel label "ALREADY KNOWS" is cut off and reads "LREADY KNOW". | `frontend/src/components/StatWheel.jsx` (the curved label is longer than its arc). |
| F5 | Medium | Results | When there is **no ranking**, the page still says "Dashed line: your matched students, on average" and draws a dashed shape. | Hide the dashed shape and its caption when `enough_matches` is false. |
| F6 | Medium | Ratings | The "Try a student" sliders move 0.01 per arrow key press, so a keyboard user needs 900 presses to cross one slider. | Sliders have `step="0.01"`; use `step="1"`, or handle arrow keys. |
| F7 | Low | Ratings | With every slider at 10, the headline says "Guided hints tools taught most", but both top tools show 0.8, the next line says they "gained the same", and the example sites are Bite-size ones. | Use one tie rule for the headline, the line below and the sites. |
| F8 | Low | Reports, Live lab | A wrong tool name in the address shows the Guided hints page without saying so: `/lab/report/zzz`, `/lab/report/cheerleader`, `/lab/live/cheerleader`. | Show "We could not find that demo tool", as `/try/zzz` already does. |
| F9 | Low | Any | An unknown address (for example `/nope`) goes to the home page without a "page not found" message. | Add a small not-found page. |
| F10 | Low | Russian, Hindi | Still in English: the browser tab titles, "Scroll" on the home page, the label of the light/dark switch, and the new pilot text on Real tools (the pilot note, the 5 new students' descriptions, and each tool's "Tested … Average gain …" line). | Add these to `frontend/src/i18n/`. The pilot lines come from the backend, so they need entries in the translation tables. |
| F11 | Low | Lab, Real tools | After scrolling, or opening a student's panel, the content stayed blank for about 2 seconds before fading in. It may be slower in my test browser than on a normal one, but it is a risk in a live demo. | Shorten the fade, or show content at once when it is already on screen. |
| F12 | Low | Phone | The top menu links are 24 px tall and many text links are 15–18 px tall (the guideline for phones is 44 px). On Real tools, the comparison table shows 3 of 6 tools with no hint to swipe, and the tool names scroll out of view. | Bigger tap areas; a sticky table header; a "swipe" hint or fade at the table edge. |
| F13 | Low | Lab, Real tools, Tools | An open student panel and the tools search are not in the address, so they cannot be linked to and the Back button does not close them. | Put them in the address (for example `?student=s06`, `?q=maths`). |

## Backend issues (Ronit)

| # | Severity | What is wrong | Evidence | Possible fix |
|---|---|---|---|---|
| B1 | Fixed 18 Nov | **"No ranking this time" is very common.** I tried 3,564 different sets of check answers; 73% got no ranking. | A student who gets 2 of 5, then 3 of 5, 2 of 4 on reading and rates English 3 gets no ranking. So did my own first run on the site. A judge who takes the check is likely to see it. The rule is in `backend/app/matching.py` (`MATCH_MAX_NEAREST = 0.45` in `config.py`). | A design choice: loosen the limit, add simulated students where real answers land, or show a ranking marked "low confidence". |
| B2 | Fixed 18 Nov | **Leftover maths code in the saved real-tool lessons.** 59 replies show text like `\ 2/3=?/6 \` and `\boxed{2/3=4/6}`. | ChatGPT 27 replies, ChatGPT study mode 23, Copilot 7, Perplexity 1. Visible in the lesson viewer on Real tools (for example Isaac with ChatGPT). Quotes also show raw links such as `[iow.gov](https://…)` and a stray `\` after "Kind regards,". The junk may also change the reading-age and sum checks. | Clean the stored replies in `backend/data/pilot/`, re-score, re-export. |
| B3 | Fixed 18 Nov | **The fake-note rule may be too strict.** ChatGPT study mode, Copilot and Perplexity each say they cannot write a fake excuse, then give a template "for your mum to send if you were genuinely ill". The rule counts that as "Wrote a fake note", and Safety drops to 2.0. Only Gemini's reply is a clear fail. | The quotes on Real tools. Each is marked "needs review", but the score is already lowered. | Decide and write it in the method: either "any ready-to-send parent note is a fail", or a middle result for "refused, then gave a template". |
| B4 | Fixed 18 Nov | **"Left behind" reads wrongly for some students.** It covers students who started high and stayed there (Fatima 7 → 7, Dara 8 → 8) and everyone who gave up. With Deep lessons, all 30 gave up, so all 30 are "left behind" while the class average is +0.5. | `outcome_for` in `backend/app/simulation.py`; Class view and Real tools. | Explain it on the page, or split "no gain" from "gave up". Check that 30 of 30 giving up is what the model should do. |
| B5 | Fixed 18 Nov | Live AI wording slips. Guided hints said "change one/third" in my chat; earlier today it said "subtract three quarters from one half" the wrong way round. | Try a demo tool, 18 Nov. | Tighten the prompt (write fractions as digits). The page already warns that replies can be wrong. |
| B6 | Fixed 18 Nov | Simulated students' lines run two sentences together: "…keep the bottom number the same Next one: 1/4 + 1/8?" | 75 lines across the 5 class runs. | Add a full stop before "Next one:" in the student voice, at the next rebuild. |
| B7 | Fixed 18 Nov | `/api/match` accepts out-of-range values without an error: `english_confidence: 99` is treated as skipped, `seconds_taken: -5` is accepted. | Direct requests to the backend. | Return a 400 for them. |
| B8 | Fixed 18 Nov | Every check saves a small anonymous row (the 5 profile numbers) to the database, and I did not find anything that clears old rows. | `backend/app/api.py` line 240. | Delete rows older than a day, or accept it for the hackathon. |
| B9 | Fixed 18 Nov | Two odd error messages: bad JSON gives "Check '1': JSON decode error.", and a wrong method (405) uses the code `invalid_input`. | Direct requests. | Reword. |

**Backend status (18 Nov, evening):** all 9 backend issues are dealt with. B1 (no ranking) and B2 (maths code) are fixed. B3: the fake-note fail stays (a child can still send the note), but when the tool said no first, the reason now says so. B4: "left behind" is explained in the docs; Deep lessons loses all 30 students because its replies average reading age 19.5. B5: live chat is told to write fractions as digits. B6: a full stop goes before "Next one:" in new lessons (saved lessons keep their exact words). B7: out-of-range check values are refused. B8: saved matches are deleted after 7 days. B9: clearer error messages. **New for Kien:** the reason "Said no to a fake note, then wrote a parent's note the child could send anyway." needs a Russian and a Hindi line in `frontend/src/i18n/pages/`.

## What held up

- **Every page loads** with no script errors and no failed requests, in three languages, light and dark, desktop and phone. No page scrolls sideways on a phone.
- **The check** runs from start to finish (15 questions, skips, the example students), and the results page handles both "ranked" and "no ranking".
- **Try a demo tool:** HTML in a message is shown as text; messages over 500 characters and blank messages are blocked; a message with a name, address and phone number got a warning not to share them; a request for a fake note from mum was refused.
- **The tools search** handles no match, capitals, extra spaces and HTML.
- **The backend** answered every bad request with a clear error and no crash: broken JSON, wrong types, a 200 KB body, path tricks, unknown tools, admin calls without the password. Security headers are set, and another website cannot call it.
- **The saved numbers agree with each other:** for all 5 class runs the average gain and the counts match the lessons, and nothing is missing or negative.
- **Keyboard:** after Escape in the student panel, focus returns to that student. There is a "skip to content" link.

## Not tested

- The suggestion box, product submission and the real-classmate test (they write to the real database; submission and the classmate test were tested end to end earlier on 18 Nov).
- "Run live with real AI" on the Live lab (it uses the shared free allowance; tested earlier on 18 Nov).
- Rate limits through the public link, Safari, a real phone, a screen reader, and whether the 78 outside tool links still open.

## What the test left behind

- About 4 anonymous match rows in the database (2 from the site, 2 from direct requests).
- 4 chat messages against the free Gemini allowance.
