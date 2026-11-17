#!/bin/sh
# Start the backend on this laptop so teammates can run the website on THEIR laptops.
# Usage (from anywhere):  sh backend/share.sh        Stop: Ctrl+C
# Teammates must be on the same network (Wi-Fi or this laptop's phone hotspot).
cd "$(dirname "$0")" || exit 1

if [ ! -x .venv/bin/python ]; then
  echo "No .venv here. Set up first: python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt"
  exit 1
fi
if lsof -ti tcp:8000 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Port 8000 is already in use (is the backend already running?). Stop that first."
  exit 1
fi

ADDR=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
[ -z "$ADDR" ] && ADDR="<this laptop's address>"

# Is the database reachable? (Some Wi-Fi blocks port 5432; a phone hotspot works.)
DB=$(.venv/bin/python -W ignore -c "
from app.store import get_store, StoreUnavailable
s = get_store()
if s.kind != 'database': print('files (no DATABASE_URL): saved data stays on this laptop')
else:
    try: s.list('validation'); print('reachable')
    except StoreUnavailable: print('NOT reachable: saving check results and submissions will fail. Switch to a phone hotspot and restart.')
" 2>/dev/null)

# caffeinate -i: the Mac won't idle-sleep while the backend runs (keep it plugged in, lid open).
HOST=0.0.0.0 caffeinate -i .venv/bin/python -m app.serve &
PID=$!
trap 'kill $PID 2>/dev/null; exit 0' INT TERM

OK=""
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -s "http://localhost:8000/api/health" | grep -q '"ok":true'; then OK=1; break; fi
  sleep 1
done

echo
echo "=============================================================="
if [ -n "$OK" ]; then echo " Hivemind backend is running."; else echo " Backend did not answer yet: look for errors above."; fi
echo " Database: $DB"
echo
echo " On the teammate's laptop (same network), in frontend/.env:"
echo "   VITE_API_URL=http://$ADDR:8000"
echo " then: cd frontend && npm install && npm run dev"
echo " and open http://localhost:5173  (it must be this exact address)"
echo
echo " Check from their laptop: http://$ADDR:8000/api/health"
echo " Can't connect? Same network? Mac firewall allowing Python?"
echo " Stop: Ctrl+C"
echo "=============================================================="
wait $PID
