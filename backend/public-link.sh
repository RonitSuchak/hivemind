#!/bin/sh
# Public links for the website and the backend, from this laptop, through two free Cloudflare quick tunnels.
# Anyone can open them from anywhere (no same-network rule). Used for Mike's crash test and the expo.
# Usage (from anywhere):  sh backend/public-link.sh        Stop everything: Ctrl+C
# Needs: backend/.venv (see backend/README.md), frontend packages (cd frontend && npm ci),
#        and cloudflared (brew install cloudflared). The laptop must stay on, plugged in and online.
# Every run gives NEW addresses: send the new website link each time.
BACKEND="$(cd "$(dirname "$0")" && pwd)"
REPO="$(dirname "$BACKEND")"
WORK="$BACKEND/.public-link"          # logs and the built website (ignored by git)
LOGS="$WORK/logs"; SITE="$WORK/site"
API_PORT="${API_PORT:-8000}"; WEB_PORT="${WEB_PORT:-4173}"
mkdir -p "$LOGS"

[ -x "$BACKEND/.venv/bin/python" ] || { echo "No backend/.venv. Set up first (backend/README.md)."; exit 1; }
command -v cloudflared >/dev/null || { echo "cloudflared is not installed. Install it with: brew install cloudflared"; exit 1; }
[ -d "$REPO/frontend/node_modules" ] || { echo "No frontend packages. Run first: cd frontend && npm ci"; exit 1; }
lsof -ti tcp:"$API_PORT" -sTCP:LISTEN >/dev/null 2>&1 && { echo "Port $API_PORT is in use (is the backend already running?). Stop that first."; exit 1; }
lsof -ti tcp:"$WEB_PORT" -sTCP:LISTEN >/dev/null 2>&1 && { echo "Port $WEB_PORT is in use. Stop that first."; exit 1; }

# Is the database reachable? (Some Wi-Fi blocks its port, 5432; a phone hotspot works.)
DB=$(cd "$BACKEND" && .venv/bin/python -W ignore -c "
from app.store import get_store, StoreUnavailable
s = get_store()
if s.kind != 'database': print('files (no DATABASE_URL): saved data stays on this laptop')
else:
    try: s.list('validation'); print('reachable')
    except StoreUnavailable: print('NOT reachable: check results, Proof and submissions will fail. Switch to a phone hotspot and restart.')
" 2>/dev/null)

PIDS=""
cleanup() { kill $PIDS 2>/dev/null; echo; echo "Stopped. The links no longer work."; exit 0; }
trap cleanup INT TERM

url_from() {  # wait up to 40 s for the trycloudflare address in a cloudflared log
  for i in $(seq 1 40); do
    U=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' "$1" | head -1)
    [ -n "$U" ] && { echo "$U"; return; }
    sleep 1
  done
}

# --protocol http2: some school and venue networks block the default (QUIC), which gives error 530.
echo "Opening tunnels..."
cloudflared tunnel --no-autoupdate --protocol http2 --url "http://localhost:$API_PORT" > "$LOGS/api-tunnel.log" 2>&1 & PIDS="$PIDS $!"
cloudflared tunnel --no-autoupdate --protocol http2 --url "http://localhost:$WEB_PORT" > "$LOGS/site-tunnel.log" 2>&1 & PIDS="$PIDS $!"
API=$(url_from "$LOGS/api-tunnel.log"); WEB=$(url_from "$LOGS/site-tunnel.log")
{ [ -z "$API" ] || [ -z "$WEB" ]; } && { echo "A tunnel did not start; see $LOGS"; cleanup; }

echo "Building the website for $API ..."
(cd "$REPO/frontend" && VITE_API_URL="$API" VITE_DEMO= npx vite build --outDir "$SITE" --emptyOutDir > "$LOGS/build.log" 2>&1) \
  || { echo "Website build failed; see $LOGS/build.log (missing packages? cd frontend && npm ci)"; cleanup; }
"$BACKEND/.venv/bin/python" "$BACKEND/spa_server.py" "$SITE" "$WEB_PORT" & PIDS="$PIDS $!"

# The backend only accepts the website link (and localhost:5173 for local work). caffeinate -i: no idle sleep.
# PROXY_HOPS=1: every visitor reaches the backend from 127.0.0.1 through the tunnel, so the rate limits would
# treat everyone as one device. Cloudflare appends the visitor's real address as the LAST X-Forwarded-For
# entry (checked 18 Nov; cloudflared adds none, and anything a visitor fakes sits earlier), so trust exactly one.
echo "Starting the backend..."
(cd "$BACKEND" && HOST=127.0.0.1 PORT="$API_PORT" PROXY_HOPS=1 CORS_ORIGINS="http://localhost:5173,$WEB" \
  exec caffeinate -i .venv/bin/python -m app.serve > "$LOGS/backend.log" 2>&1) & PIDS="$PIDS $!"

OK=""
for i in $(seq 1 30); do
  curl -s -m 5 "$API/api/health" | grep -q '"ok":true' && { OK=1; break; }
  sleep 2
done

echo
echo "=============================================================="
if [ -n "$OK" ]; then echo " Live. Send people this website link:"; else echo " Backend not answering through the tunnel yet (see $LOGS). Links:"; fi
echo
echo "   Website:  $WEB"
echo "   Backend:  $API/api/health"
echo
echo " Database: $DB"
echo " Quick tunnels can drop after some hours (\"Tunnel not found\" in $LOGS): then restart for new links."
echo " Keep this window open. Ctrl+C stops everything."
echo " Lid closed overnight? sudo pmset -a disablesleep 1  (undo: ... 0)"
echo "=============================================================="
printf '%s\n%s\n' "$WEB" "$API" > "$WORK/links.txt"
wait
