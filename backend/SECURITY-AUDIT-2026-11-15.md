# Security audit: Hivemind backend (15 Nov 2026)

Checklist: `vibe-secure`, run on `backend/app` (the FastAPI API, live chat, submissions, store, limits, advisor), on Ronit's own laptop only. Stack: Python FastAPI API, JSON files locally and Neon Postgres online (server-side only), no user logins (one admin password header), no payments, no uploads, no frontend in this folder. Not deployed yet, so the online checks wait for the deploy.

## Results
| # | Item | Result | Proof |
|---|---|---|---|
| A1 | No secret keys in shipped code | ✅ Pass | grep for key patterns in `backend/app`, tests, docs: 0 matches. Routes return no key (test `test_no_route_returns_an_email_or_a_key`) |
| A2 | Git history has no leaked secrets | ✅ Pass | `git log -p --all` key patterns: 0 matches; `.env` never committed (0 commits); `backend/.env` is git-ignored |
| A3 | Browser uses only a public database key | ➖ N/A | The browser never talks to the database; only the server holds `DATABASE_URL` |
| A4 | Issued API keys stored safely | ➖ N/A | The app issues no API keys (ownership codes are proof-of-control, not secrets) |
| A5 | Exposed files blocked | ✅ Pass | `/.env`, `/.git/HEAD`, `/.git/config`, `/README.md`, `/.DS_Store`, `/app/config.py`, `/data/store/`: all 404 |
| B1–B2 | Row Level Security, read/write rules | ➖ N/A | No public database access: one server-side table, reached only with the secret connection string |
| B3 | User A can't reach user B's data | ✅ Pass | No accounts. Match ids and chat session ids are random tokens; submissions and classmate entries are public by design and never include the contact email (test `test_contact_email_is_never_public`) |
| B4 | Permission checks on the server | ✅ Pass | Approve, reject and delete need the admin password, checked on the server in constant time: wrong or missing password gives 401 (tests) |
| B5 | Field tampering blocked | ✅ Pass | Sent `status: approved`, `ownership_code`, `id`, `tutor_id`, `run` with a submission: all ignored (`id: sub_001`, `status: failed`, code `null`) |
| C1–C2 | Proper sign-in, hashed passwords | ➖ N/A | No user logins. The admin password lives only in `.env` / the host's secret store |
| C3 | Rate limits on forms and logins | ✅ **Fixed** (was 🔴 High) | Limits exist (chat, ask, match, submissions, verify, validation, admin), but see finding 1: they can be bypassed with the planned deploy command |
| C4 | Secure cookies | ➖ N/A | No cookies |
| C5 | Bot protection | ⚠️ Info | Rate limits only, no CAPTCHA. Fine for the hackathon; add Cloudflare Turnstile if spam appears |
| D1 | Sensitive data protected | ⚠️ Info | Only sensitive field: makers' contact emails, stored for Ronit, never returned. Neon encrypts disks; HTTPS comes with Render (check after deploy) |
| D2 | Trimmed responses | ✅ Pass | Submissions go through `public()` (no email); match records keep only the 5 profile numbers and a question count |
| E1 | Safe database queries | ✅ Pass | Every query in `store.py` uses `%s` parameters; no string-built SQL |
| E2 | Input validated on the server | ✅ Pass | Pydantic types plus length limits (500-character chat, 300-character question, form field limits, 16 KB body); tests for each |
| E3 | User content escaped | ✅ Pass (backend part) | The API returns JSON only; maker replies containing HTML are rejected; the frontend rule "plain text only, never `dangerouslySetInnerHTML`" is in `docs/BACKEND.md` |
| E4 | File uploads | ➖ N/A | Links only, never files |
| F1 | Payment webhooks | ➖ N/A | No payments |
| G1 | Security headers | ✅ **Fixed** (was 🔴 Low) | No `X-Content-Type-Options`, `X-Frame-Options`/CSP or `Referrer-Policy` on responses |
| G2 | Force HTTPS | ⚠️ Owner action | Check after deploy: `curl -sI http://<render address>/api/health` must redirect to https |
| G3 | Dependency scan | ⚠️ Owner action | `pip-audit` isn't installed; needs Ronit's OK to install it in `.venv`. Dependencies are pinned in `requirements.txt` |
| G4 | Safe deploys | ⚠️ Owner action | Plan: Render deploys from GitHub; keys only in Render's environment settings |
| G5 | Debug off | ✅ Pass | Errors carry no traceback (`{"error": …}` only); uvicorn's access log is off; `/docs` is public on purpose, for Kien and Nina |
| Extra | SSRF (server tricked into calling private addresses) | ✅ Pass | Private, loopback, link-local and metadata addresses refused; every redirect re-checked; connection pinned to the checked IP (tests in `test_submissions.py`) |

## Failures

**1. Rate limits can be bypassed (High).** Anyone can skip every rate limit by sending a made-up `X-Forwarded-For` header, because the planned start command (`--proxy-headers --forwarded-allow-ips '*'`, in `backend/README.md`) makes uvicorn trust the first address in that header, and the sender writes it. Proof on a local server: 31 requests from one device were blocked at the 31st (429), but 31 requests each with a different fake header all went through, even though the device was already over its limit. What happens: someone could guess the admin password without limit, or burn the free Gemini quota through chat and ask. **Smallest fix:** drop those two flags, and work out the client address in `client_key()` from the **last** `X-Forwarded-For` entry (the one Render's own proxy adds), controlled by a `PROXY_HOPS` setting (0 on a laptop, 1 on Render). Then repeat this test on the live address to confirm the hop count.

**2. Big bodies are read into memory before the size check (Medium).** Anyone can make the server hold a very large request in memory, because when a request has no length header the body limit calls `await request.body()` (reads everything) and only then compares it with 16 KB. **Smallest fix:** read the body in pieces and stop at 16 KB.

**3. No security headers (Low).** Browsers get no instructions to refuse framing or content-type guessing. **Smallest fix:** a small middleware adding `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, and `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'` on API responses (not on `/docs`, which needs its scripts), plus `Strict-Transport-Security` once on https.

## Fixes applied (approved by Ronit, 15 Nov)
All three fixed in `app/middleware.py` and `app/serve.py`; 152 tests pass (7 new).

| # | Before | After (real local server) |
|---|---|---|
| 1 | 31 requests, each with a fake `X-Forwarded-For`: all went through (`403` ×31), even though the device was already over its limit | Laptop mode: the same device, over its limit, faking the header: `429 429 429 429 429`. Render mode (`PROXY_HOPS=1`), fake first entry changing each time: `403` ×30 then `429` |
| 2 | A body with no length header was read in full before the 16 KB check | A 20 KB body sent in chunks: `{"error": {"code": "too_long", ...}}`, read stopped at 16 KB |
| 3 | No security headers | `curl -sI /api/health` shows `x-content-type-options: nosniff`, `x-frame-options: DENY`, `referrer-policy: no-referrer`, `strict-transport-security`, `content-security-policy: default-src 'none'; frame-ancestors 'none'` (not on `/docs`, which needs its scripts) |

Found while re-testing fix 1: uvicorn trusts `X-Forwarded-For` from `127.0.0.1` **by default**, so it was rewriting the visitor's address before our code saw it. The start command `python -m app.serve` switches that off (`proxy_headers=False`), so only `client_ip()` decides. Still to confirm on Render (UNVERIFIED): that Render's proxy adds exactly one entry, so `PROXY_HOPS=1` is right. Run the Render-mode test above against the live address.

## Owner to-do list
1. Done: fixes 1–3 approved and applied.
2. Approve installing `pip-audit` in `backend/.venv` for the dependency scan, or skip it.
3. After deploy: confirm the https redirect (G2), and that keys are only in Render's environment settings (G4).
