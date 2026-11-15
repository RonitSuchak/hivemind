"""Start the API the safe way: python -m app.serve (laptop) or the same command on Render.

uvicorn trusts X-Forwarded-For from 127.0.0.1 by default and rewrites the
visitor's address from it. We switch that off (proxy_headers=False), so only
app/middleware.client_ip() decides who a request is from, using PROXY_HOPS.
Also: no access log (it would print IP addresses). Render sets PORT; set HOST=0.0.0.0 there.
"""

from __future__ import annotations

import os

import uvicorn


def main() -> None:
    uvicorn.run("app.api:app", host=os.environ.get("HOST", "127.0.0.1"), port=int(os.environ.get("PORT", "8000")),
                proxy_headers=False, access_log=False, reload=os.environ.get("RELOAD") == "1")


if __name__ == "__main__":
    main()
