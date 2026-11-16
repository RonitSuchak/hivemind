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
`frontend/public/demo/` already holds the real export, including `real-tools.json` (Kien's update, 16 Nov 11:10). Keep `topics/`.
- Ronit re-exports after the AI lab finishes (about Wed 18 Nov). Copy `backend/data/export/` over `public/demo/` again then, so every run is the real AI one.

## 3. Still to fix (checked against `frontend/` at commit f12bdec)
Fixed by Kien's 16 Nov updates (a170943, f12bdec), leave as is: Ratings reading `groups`, the 8-minute wording, "Try a student" labelled as a rough explorer, real tools from the backend in its order with no scores, "demo tool" wording, the "Preview data" label, and the Try a demo tool page with every chat error handled.
1. **Try link for submitted products** (`src/pages/Lab.jsx`, the "Try this demo tool" link): it shows for any run without a critical fail, so an approved submitted product (`kind: "submitted"`, `tutor_id` like `sub_001`) links to `/try/sub_001`, where the page says it "did not pass a safety check". That's wrong: submitted products are tried on their own website. Use the tool's `try_url` (an `https://` address for submitted products) and only link to `/try/...` when `kind` is `"built_in"` and `live_chat` is true.

## 4. Backend features the site doesn't use yet
Already used, keep: `matches[]`, `radar`, `ranked`, `follow_ups`, the `enough_matches` / `message` state, evidence in the Lab, `tutor_mode`, `real_tools[]` and `/api/real-tools`, and `POST /api/chat`. Add what fits your pages:
- **Real-classmate check:** `GET /api/test` → `POST /api/test/score` (before) → try a demo tool → test again → `POST /api/validation` with `{match_id, tutor_id, before, after}`. `GET /api/validation` shows real gain next to predicted gain, plus the summary. This is our proof against real students: please build it first.
- **Ask about your results:** `POST /api/ask` with the `match_id`. Up to 5 questions of 300 characters; show `questions_left`.
- **Tool maker report:** `GET /api/report/{tutor_id}`: which groups learned less, `reason_text`, example chats.
- **Submit a product:** the form → `POST /api/submissions` → show the checks and the `ownership_code` → `POST /api/submissions/{id}/verify` → status page (`GET /api/submissions/{id}`).
- **Evidence links:** each score's `evidence` items have `student_id` and `turn`, so a click can open that student's chat at that line.
- **Errors:** every error is `{"error": {"code", "message"}}`. Show `message`. Handle `rate_limited` (wait `Retry-After` seconds), `ai_unavailable` and `store_unavailable` (both 503: "try again in a minute"; everything else keeps working).

## 5. Done when
- With `VITE_API_URL` set, every page loads from the live backend, and with the backend off, the "not connected" state shows. With `VITE_DEMO=1`, every page loads from the real export files.
- The check runs start to finish, and the results page shows the radar, ranked demo tools, follow-ups, and real tools with their note and no scores.
- No screen says "tutor" or "5 minute check". API field names are unchanged.
- `npm run build` passes, and nothing outside `frontend/` changed (`git status`).
