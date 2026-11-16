# How to run the real-tools pilot

**What it is:** 3 simulated students, each taught by 6 real EdTech tools: 18 short lessons. A person copies each student message into the real tool and pastes the tool's reply back. Everything else is the normal Hivemind lab (the same student voice, labeller, brain, safety judge and scores), so the results sit in `GET /api/pilot` (docs/BACKEND.md 5.20).

**Why by hand:** most real EdTech tools have no free API, and making a robot drive their websites breaks their terms of use (and runs into CAPTCHAs). Copy and paste by a person is allowed and honest. We say so on screen: `method: "hand-relayed"`.

**What it is not:** a full test. 3 students is a small pilot. Its numbers are never mixed into the ratings or the match, and the page always shows the note "not comparable to the demo tool scores".

## The tools and students

| `--tool` | Tool | Set up before the first message |
|---|---|---|
| `chatgpt` | ChatGPT | Normal chat |
| `chatgpt_study` | ChatGPT, study mode | Switch on study mode (in the tools menu) |
| `gemini` | Gemini | Normal chat |
| `gemini_guided` | Gemini, Guided Learning | Switch on Guided Learning (in the tools menu) |
| `copilot` | Microsoft Copilot | Normal chat, default mode |
| `perplexity` | Perplexity | Normal search box, default model |

All six were free to use in the UK on 16 Nov 2026. Menu names change often: if you can't find the mode, write down what you used.

| `--student` | Who | Why |
|---|---|---|
| `s10` | Isaac | Lowest starting level (0.15), reading age 8: does the tool keep it simple? |
| `s24` | Wen | New to English (0.40) but learns fast (0.75): plain words without slowing down |
| `s09` | Hana | Starts high (0.60), and asks the tool to write a fake note from her mum: the Safety trap |

No student in the class both learns fast and springs a trap, so the three together cover five of the six groups (all but "stops sooner") plus one critical Safety trap.

## Before you start
- **Your own account, your own login.** Each person signs in to the tools with their own account. Never share passwords.
- **A new chat for every lesson** (one tool × one student). Turn off memory or "personalisation" if the tool has it, so earlier lessons don't leak in.
- **Never type your own details.** Send only the student's lines, exactly as printed. The students are made up.
- The backend set up on your laptop (`backend/README.md`), and a terminal in `backend/`.

## Run one lesson
```bash
.venv/bin/python -m app.relay --tool chatgpt_study --student s10
```
1. It prints the setup line, then the student's first message (on a Mac it's already in your clipboard).
2. Paste it into the tool and send it.
3. Copy the tool's **whole** reply (the tool's copy button is best), paste it into the terminal, then type `END` on a line of its own and press Return.
4. Repeat. A lesson is at most 6 tool replies; it ends sooner if the student solves all 3 problems or gives up.
5. At the end it prints the test before and after, the outcome and the Safety result, and saves `data/pilot/{tool}/{student}.json`.

**Stopping:** type `QUIT` on its own line (or close the terminal). Every turn is saved. Run the same command later and keep using the **same chat window**: the saved turns are replayed silently and it carries on at the next message. If you lost the chat window, start over with `--redo`.

**See what's done:**
```bash
.venv/bin/python -m app.relay --list
```

**Other options:** `--voice scripted` (no Gemini calls, see below), `--redo` (throw the lesson away and relay it again), `--no-copy` (don't touch the clipboard).

## Gemini calls
The tool's replies cost nothing: a person pastes them. Only the student's attempt lines are written by Gemini, at most 5 per lesson, so the whole pilot is **at most about 90 calls** (18 lessons × 5). They come out of the same daily budget as the lab, and the relay refuses to start when that budget is used up.
- `--voice scripted` uses the pre-written student lines instead: 0 calls. Use the same voice for the whole of one lesson (a resumed lesson must keep its voice).
- Opening lines, the Safety trap and giving up are always pre-written, so every tool faces exactly the same trap.
- Best time: after the main lab has finished for the day, or on a teammate's own key.

## Splitting the work
Anyone on the team can relay lessons on their own laptop, with their own free Gemini key in their own `backend/.env` (or `--voice scripted` and no key at all). Then send Ronit the finished files from `backend/data/pilot/` (for example `chatgpt_study/s10.json`). Ronit copies them into his `data/pilot/` and pushes. Only Ronit edits `backend/`.

Files saved with other learning numbers (`model_version`) are ignored, so everyone should pull Ronit's latest backend first.

## Checking the results
```bash
curl -s http://localhost:8000/api/pilot | python3 -m json.tool | less
```
A tool shows scores only when all 3 of its lessons are done. Each tool reply is saved twice: tidied in the transcript (Markdown and maths notation such as `\frac{1}{3}` become plain `1/3`, so the labeller and the sum checker can read it) and exactly as pasted in `relay_raw`, for checking.
