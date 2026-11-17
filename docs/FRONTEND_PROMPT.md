# Prompt: wire the Hivemind website to the backend

**For Kien and Nina.** Paste everything below the line into your AI assistant, in the repo root. It changes only `frontend/`. Written by Ronit's side on 16 Nov 2026 and updated 17 Nov, against backend contract v3 (`docs/BACKEND.md`), and checked against `frontend/` at commit f12bdec (the latest frontend commit on 17 Nov).

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
1. Ronit runs the backend on his laptop (`HOST=0.0.0.0 .venv/bin/python -m app.serve`, port 8000) and gives you his laptop's address on the shared Wi-Fi (`ipconfig getifaddr en0` on his Mac). You must be on the **same network** as him. If he's on his phone hotspot (the school or venue Wi-Fi can block the database), join the hotspot too.
2. In `frontend/.env` set `VITE_API_URL=http://<Ronit's address>:8000`, or `http://localhost:8000` if the backend runs on your own machine. Leave `VITE_DEMO` empty.
3. Run the site with `npm run dev`. It must be on **http://localhost:5173**: that's the origin the backend allows (CORS: the browser blocks calls from any address the backend hasn't allowed). `vite preview` (port 4173) or a deployed address is blocked until Ronit adds it to `CORS_ORIGINS`, so send him the exact address.
4. Check `GET /api/health` answers `{"ok": true, "version": "3.0.0", "store": "database", "tutors": 5}` (if the database is out of reach, health still answers, but saving or reading check results and submissions returns `store_unavailable` (503); everything else keeps working). The site's "Lab not connected" state should switch to live.
5. Can't connect? Check the address and port, that both machines are on the same network, that the site runs on `http://localhost:5173`, and that the Mac firewall allows incoming connections for Python.

## 2. Saved data (demo mode)
**The final export is ready (17 Nov):** the AI lab is finished (all 5 demo tools are real AI runs, no preview data) and all 18 real-tools pilot lessons are done. Copy all of `backend/data/export/` over `frontend/public/demo/`, keeping your own `topics/` folder. That brings in the new `pilot.json`, the `live-lab/` folder and `real-tools/students/`, and replaces every run with the real AI one.

## 3. Still to fix (checked against `frontend/` at commit f12bdec)
Fixed by Kien's 16 Nov updates (a170943, f12bdec), leave as is: Ratings reading `groups`, the 8-minute wording, "Try a student" labelled as a rough explorer, real tools from the backend in its order with no scores, "demo tool" wording, the "Preview data" label, and the Try a demo tool page with every chat error handled.
1. **Try link for submitted products** (`src/pages/Lab.jsx`, the "Try this demo tool" link): it shows for any run without a critical fail, so an approved submitted product (`kind: "submitted"`, `tutor_id` like `sub_001`) links to `/try/sub_001`, where the page says it "did not pass a safety check". That's wrong: submitted products are tried on their own website. Use the tool's `try_url` (an `https://` address for submitted products) and only link to `/try/...` when `kind` is `"built_in"` and `live_chat` is true.

## 4. Backend features the site doesn't use yet
Already used, keep: `matches[]`, `radar`, `ranked`, `follow_ups`, the `enough_matches` / `message` state, evidence in the Lab, `tutor_mode`, `real_tools[]` and `/api/real-tools`, and `POST /api/chat`. Add what fits your pages:
- **Real-classmate check:** `GET /api/test` → `POST /api/test/score` (before) → try a demo tool → test again → `POST /api/validation` with `{match_id, tutor_id, before, after}`. `GET /api/validation` shows real gain next to predicted gain, plus the summary. This is our proof against real students: please build it first.
- **Ask about your results:** `POST /api/ask` with the `match_id`. Up to 5 questions of 300 characters; show `questions_left`.
- **Tool maker report:** `GET /api/report/{tutor_id}`: which groups learned less, `reason_text`, example chats.
- **Submit a product:** the form → `POST /api/submissions` → show the checks and the `ownership_code` → `POST /api/submissions/{id}/verify` → status page (`GET /api/submissions/{id}`).
- **Live lab (stage demo):** `GET /api/live-lab` (contract 5.21), streamed with `EventSource`. Up to 3 students learn from one demo tool while you watch: show each chat line as it arrives with its label (`move`, `reading_age`, `too_hard`), animate a knowledge bar from `knowledge.before` to `knowledge.after`, show the Safety results and each lesson's end, and finish with the sample `scores` next to `official_scores` and the `note`. Add a **Replay** button (`mode=replay`, 0 AI calls) and switch to it on `busy`, `budget_reached`, `ai_unavailable`, `safety_concern` or a Wi-Fi failure. Close the `EventSource` on `done` and `error`, or the browser reconnects and starts a new run. In demo mode, play `live-lab/{tutor_id}.json` (the same events as a list) with a short gap.
- **Real-tools pilot:** `GET /api/pilot` (contract 5.20). 6 real tools (ChatGPT, ChatGPT study mode, Gemini, Gemini Guided Learning, Copilot, Perplexity), each taught the same 3 simulated students, with the replies copied by hand from the real product. Show each tool's `status`; scores appear only when it's `"done"`, and **always sit next to its `note`** (a small sample, not comparable to the demo tool scores). Clicking evidence can open that student's chat (`students[].transcript`). Never put pilot tools in the heatmap, ratings or match. On the Tools page, a real tool whose `id` matches a pilot tool's `real_tool.id` can say "piloted"; every other real tool stays "not tested".
- **Real-tool data now lives in the backend** (contract 5.8 and 5.19). Swap these local pieces of `src/data/tools.js` for backend fields, so the site shows the same tools as now with one source:
  - `traits` → each tool's `estimates` (same numbers, snake_case: `light_reading`, `self_paced`). Show `estimates_note` ("Not a lab result") near them; never call them scores. `ToolPanel`'s "who it may suit" and the Tools page sliders (`rankTools`) can read them as they are.
  - `fitsSubject` on the Results page → send the chosen topic in `POST /api/match` as `topic: {subject, advanced}`; `real_tools[]` comes back already filtered (general tools kept, order unchanged). Each tool's `subjects` (`[]` = general) and `for_advanced` are there too if you need them.
  - `fitsMaths`, `bestToolsFor`, `mostEffective` and `toolsLike` in the Lab drawer (`StudentChat`) and `Lab.jsx` → `GET /api/real-tools?student={id}`: `tools` already ordered for that simulated student and filtered to the lab's fractions lesson (`fits_lab_lesson`), `best` gives the top type(s) with the tie and "no type helped" (`none`) cases, and `types` has each demo tool's gain for that student. In demo mode read `real-tools/students/{id}.json`. One small difference: equal gains keep the lab order instead of being dealt out across the tied types; `best.tutor_ids` names every tied type.
  - `ProfilePredictor`'s `mostEffective` is about a typed-in profile, which has no backend endpoint yet: leave it, labelled as a rough explorer.
- **Check extras:** the topic packs' language questions and hard question can now be sent with the check, as `extras: {pack, language: [{id, answer}], hard: {id, answer, hints_opened}}` in `POST /api/match` (at most 10 language answers, 200 characters each). The backend saves them with the match but **doesn't score them yet**, so keep the "trial, not scored" label on screen.
- **Match rows:** each `ranked` row now has `tutor_mode` and `preview`; show "Preview data" on a row when `preview` is true. Don't re-sort `ranked`: near-equal gains are ordered by the backend on purpose (by Learning score), so a gain can be 0.1 or 0.2 higher further down. Show any new follow-up the same way (`ceiling` may come first).
- **New safety check `asks_personal_info`** (contract 5.4): it can appear in a run's `safety.checks`, `safety_events` and safety evidence. Give it a plain label such as "Didn't ask for personal details" in the Safety panel, next to the trap checks. Its events list what was asked in `asked`.
- **Evidence links:** each score's `evidence` items have `student_id` and `turn`, so a click can open that student's chat at that line.
- **Errors:** every error is `{"error": {"code", "message"}}`. Show `message`. Handle `rate_limited` (wait `Retry-After` seconds), `ai_unavailable` and `store_unavailable` (both 503: "try again in a minute"; everything else keeps working), and for the live lab `busy` (409) and `budget_reached` (503): offer the replay.

## 5. Done when
- With `VITE_API_URL` set, every page loads from the live backend, and with the backend off, the "not connected" state shows. With `VITE_DEMO=1`, every page loads from the real export files.
- The check runs start to finish, and the results page shows the radar, ranked demo tools, follow-ups, and real tools with their note and no scores.
- No screen says "tutor" or "5 minute check". API field names are unchanged.
- `npm run build` passes, and nothing outside `frontend/` changed (`git status`).
