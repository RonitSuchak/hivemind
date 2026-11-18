"""Serve a built single-page website for public-link.sh: real files as they are, every other path gets index.html.

Usage: python spa_server.py <site folder> <port>   (listens on 127.0.0.1 only; the tunnel reaches it there)
"""
import http.server
import os
import sys

ROOT = sys.argv[1]
PORT = int(sys.argv[2])


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def send_head(self):
        path = self.translate_path(self.path)
        if not os.path.exists(path) or (os.path.isdir(path) and not os.path.exists(os.path.join(path, "index.html"))):
            self.path = "/index.html"  # a page like /lab/ratings: let the website's router handle it
        return super().send_head()

    def log_message(self, *a):  # no access log (it would print visitors' addresses)
        pass


http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
