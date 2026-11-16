# Prompt: wire the Hivemind website to the backend

**For Kien and Nina.** Paste everything below the line into your AI assistant, in the repo root. It changes only `frontend/`. Written by Ronit's side on 16 Nov 2026, against backend contract v3 (`docs/BACKEND.md`).

---

You are helping Kien and Nina connect the Hivemind website (`frontend/`, Vite + React) to Ronit's backend. Read `docs/BACKEND.md` (the contract: every endpoint, field and error, with real examples), then `frontend/README.md`.

## Rules
- Only create or change files inside `frontend/`. Never edit `backend/`, `docs/` or `README.md`. If you need a new endpoint or field, stop and write down the request for Ronit; don't work around it.
- The backend computes every score, match and ranking. The site only shows them. Don't recalculate outcomes, gains or rankings.
- All demo tool, student, maker and AI text is untrusted plain text. Never insert it as HTML (no `dangerouslySetInnerHTML`).
- Don't add `nearest` back. The match response uses `matches[]`.
- Plain, kind words. Never label a real person ("slow", "weak", "struggling").

## Words
- **Demo tool:** one of our 5 built-in AI tutors (Socratic, Simple Steps, Lecturer, Answer Machine, Cheerleader). Each is a stand-in for a type of real EdTech tool, built on one AI model and actually tested on the simulated class. Say "demo tool" (or "tool type" where you mean the kind of tool). Don't say "tutor" on screen. API field names keep the word `tutor` (`tutor_id`, `tutor_name`, `/api/tutors`): don't rename them in code.
- **Real tool:** a real EdTech product (ChatGPT, Duolingo, Khan Academy and so on) from `GET /api/real-tools`. **Hivemind has not tested real tools.** Never show stars, Safety, Usability or Learning scores, or a predicted gain next to a real tool. Always show its `note`.
- **8-minute check**, not "5 minute check" (for example `src/pages/Tools.jsx`). Use `minutes` from `GET /api/check` instead of typing the number.

## 1. Connect
1. Ronit runs the backend on his laptop (`HOST=0.0.0.0 .venv/bin/python -m app.serve`, port 8000) and gives you his laptop's address on the shared Wi-Fi.
2. In `frontend/.env` set `VITE_API_URL=http://<Ronit's address>:8000`, or `http://localhost:8000` if the backend runs on your own machine. Leave `VITE_DEMO` empty.
3. Run the site with `npm run dev`. It must be on **http://localhost:5173**: that's the origin the backend allows (CORS: the browser blocks calls from any address the backend hasn't allowed). `vite preview` (port 4173) or a deployed address is blocked until Ronit adds it to `CORS_ORIGINS`, so send him the exact address.
4. Check `GET /api/health` answers `{"ok": true, ...}`. The site's "Lab not connected" state should switch to live.

## 2. Use the real saved data, not the made-up files
`frontend/public/demo/` holds made-up placeholder data with the **old** shapes, which is why the mismatches below weren't visible. Replace it with the real export:
- Copy every file from `backend/data/export/` into `frontend/public/demo/`, keeping the folders (`runs/`, `report/`). The names already match what `src/api.js` loads (`tutors.json`, `students.json`, `ratings.json`, `check.json`, `runs/{id}.json`, `match-example.json`). There are new ones too: `real-tools.json`, `report/{id}.json`, `test.json`, `validation.json`, `submissions.json`, `match-not-enough-example.json`, `test-score-example.json`.
- Delete the old made-up files and update `public/demo/README.txt` to say they are the real export.
- Ronit re-exports after the AI lab finishes (about Tue 17 Nov). Copy them again then.

## 3. Fix these mismatches (found by comparing `frontend/` with the real API)
1. **Check page (`src/pages/Check.jsx`): `reading` is a list of passages,** each `{id, passage, questions}`, not one object. Today `c.reading.questions` is undefined, so the page crashes at the reading step. Loop over the passages: show each `passage`, then its `questions`.
2. **Check page: `english_question` is an object** `{id, text, min, max, min_label, max_label}`, not a string. Rendering the object crashes React. Show `.text`, with a 1–5 scale from `min` to `max`, labelled with `min_label` and `max_label`.
3. **Check page: the request.** `POST /api/match` reads `quiz_1`, `quiz_2` and `reading` (each `{question_id: chosen option or null}`), `english_confidence` (1 to 5, or null) and optional `seconds_taken`. It ignores `skipped`, `persistence` and `english_check`: remove them. The backend counts skipped questions itself.
4. **Topic packs** (`public/demo/topics/`, which swap the quiz for another subject) can't be scored by the backend, whose check is fractions only. Their answers would produce a wrong profile. Either remove them or never send their answers to `/api/match`.
5. **"Try a student" (`src/components/ProfilePredictor.jsx`)** does its own matching: unweighted nearest 5, no "not enough matches" rule. Its numbers can disagree with the Advisor's, which uses `POST /api/match` (weighted, with a closeness limit). Label it clearly as a rough explorer, or ask Ronit for a backend endpoint that matches a typed-in profile. Don't present both as "the" prediction.
6. **Real tools:** the backend now owns the real-tools list (`GET /api/real-tools`, copied from `src/data/tools.js` with your types unchanged). For a person, use `real_tools[]` from the match response, already in order: by how its demo tool type ranked for them, safety concerns last. Replace the local ordering (`toolsLike`, `rankTools`) on the Results and Tools pages with it. If you keep the slider "fit %" on the Tools page, label it "matches your filters", never as a test result.

## 4. Backend features the site doesn't use yet
Already used, keep: `matches[]`, `radar`, `ranked`, `follow_ups`, the `enough_matches` / `message` state. Add what fits your pages:
- **Preview label:** runs carry `tutor_mode`. When it is `"scripted"`, show a small "Preview data" label: that demo tool's real AI run isn't finished. After about Tue 17 Nov every run is `"ai"`.
- **Evidence:** every score in a run has `evidence.safety`, `evidence.usability` and `evidence.learning` (up to 5 chat lines each). Make each score clickable. An item's `turn` opens that student's chat at that line.
- **Tool maker report:** `GET /api/report/{tutor_id}`: which groups learned less, `reason_text`, example chats.
- **Try a demo tool:** a page at `/try/{tutor_id}` (that's each tool's `try_url`) using `POST /api/chat`. Include a 500-character counter, turns left (12 per chat), the replaced-reply `notice`, and "don't type personal details". Hide it when `live_chat` is false.
- **Ask about your results:** `POST /api/ask` with the `match_id`. Up to 5 questions of 300 characters; show `questions_left`.
- **Real-classmate check:** `GET /api/test` → `POST /api/test/score` (before) → try a demo tool → test again → `POST /api/validation` with `{match_id, tutor_id, before, after}`. `GET /api/validation` shows real gain next to predicted gain, plus the summary. This is our proof against real students: please build it.
- **Submit a product:** the form → `POST /api/submissions` → show the checks and the `ownership_code` → `POST /api/submissions/{id}/verify` → status page (`GET /api/submissions/{id}`).
- **Real tools:** `GET /api/real-tools` for a browse page, and `real_tools[]` in the match.
- **Errors:** every error is `{"error": {"code", "message"}}`. Show `message`. Handle `rate_limited` (wait `Retry-After` seconds), `ai_unavailable` and `store_unavailable` (both 503: "try again in a minute"; everything else keeps working), `safety_concern` and `session_expired`.

## 5. Done when
- With `VITE_API_URL` set, every page loads from the live backend, and with the backend off, the "not connected" state shows. With `VITE_DEMO=1`, every page loads from the real export files.
- The check runs start to finish, and the results page shows the radar, ranked demo tools, follow-ups, and real tools with their note and no scores.
- No screen says "tutor" or "5 minute check". API field names are unchanged.
- `npm run build` passes, and nothing outside `frontend/` changed (`git status`).
