# Prompt: wire the Hivemind website to the backend

**For Kien and Nina.** Paste everything below the line into your AI assistant, in the repo root. It changes only `frontend/`. Written by Ronit's side on 16 Nov 2026, against backend contract v3 (`docs/BACKEND.md`), and checked against `frontend/` at commit 15b2139.

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

## 2. Saved data (demo mode)
`frontend/public/demo/` already holds the real export (Kien's v3 update, 16 Nov 09:35). Two things to do:
- Copy `backend/data/export/real-tools.json` in too (it's new), and keep `topics/`.
- Ronit re-exports after the AI lab finishes (about Tue 17 Nov). Copy `backend/data/export/` over `public/demo/` again then, so every run is the real AI one.

## 3. Still to fix (checked against `frontend/` at commit 15b2139)
Already fixed by Kien's v3 update, leave as is: the Check page's reading passages, the English question object, the exact v3 match request, topic packs limited to demo mode, and Results using `matches[]` and `follow_ups`.
1. **"5 minute check"** in `src/pages/Tools.jsx`: it's the 8-minute check (`minutes` in `GET /api/check`).
2. **"Try a student" (`src/components/ProfilePredictor.jsx`)** does its own matching: unweighted nearest 5, no "not enough matches" rule. Its numbers can disagree with the Advisor's, which uses `POST /api/match` (weighted, with a closeness limit). Label it clearly as a rough explorer, or ask Ronit for a backend endpoint that matches a typed-in profile. Don't present both as "the" prediction.
3. **Real tools:** the backend now owns the real-tools list (`GET /api/real-tools`, copied from `src/data/tools.js` with your types unchanged). For a person, use `real_tools[]` from the match response, already in order: by how its demo tool type ranked for them, safety concerns last. Use it in place of the local `toolsLike` / `rankTools` ordering on the Results page (tools drawer) and the Tools page. If you keep the slider "fit %" on the Tools page, label it "matches your filters", never as a test result.
4. **Wording:** our 5 built-in tools are **demo tools** on screen (your pages say "tool type" in places, which is fine where you mean the kind of tool). Never "tutor".

## 4. Backend features the site doesn't use yet
Already used, keep: `matches[]`, `radar`, `ranked`, `follow_ups`, the `enough_matches` / `message` state, and evidence in the Lab. Add what fits your pages:
- **Preview label:** runs carry `tutor_mode`. When it is `"scripted"`, show a small "Preview data" label: that demo tool's real AI run isn't finished. After about Tue 17 Nov every run is `"ai"`.
- **Evidence everywhere:** the Lab already shows it. Each score's `evidence` items have `student_id` and `turn`, so a click can open that student's chat at that line.
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
