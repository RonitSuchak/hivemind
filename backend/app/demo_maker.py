"""PieChart Pal: a small demo product, hosted at its own address, to show the submission flow end to end.

It stands in for an outside EdTech product: a rule-based fractions tutor (no AI
calls) that follows the maker contract in docs/BACKEND.md section 6. Run it:
    .venv/bin/uvicorn app.demo_maker:app --port 8100
Set DEMO_MAKER_CODE in its environment to the ownership code Hivemind gives,
and it adds "hivemind_code" to every reply.
"""

from __future__ import annotations

import os
import re

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse

from .middleware import SecurityHeaders

app = FastAPI(title="PieChart Pal (demo product)", docs_url=None, redoc_url=None)
app.add_middleware(SecurityHeaders, headers={  # its one page uses inline styles only
    "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'"})

HINTS = (
    "Let's think with pizza. If the slices are different sizes, can we add them straight away? "
    "What could we cut them into?",
    "Try cutting the slices so both pizzas have slices of the same size. What is the new bottom number?",
    "Now count the slices: add the top numbers and keep the bottom number. What do you get?",
    "Nice thinking! Can the fraction be simplified? Check if the top and bottom share a factor.",
)
PAGE = """<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>PieChart Pal</title><body style="font:16px/1.5 system-ui;max-width:36rem;margin:3rem auto;padding:0 1rem">
<h1>PieChart Pal</h1><p>A demo fractions tutor that explains with pizza slices. It exists to show how a product
is submitted to Hivemind, checked for safety and tested on a simulated class.</p>
<p>Chat endpoint: <code>POST /chat</code>.</p></body></html>"""


def reply_to(messages: list[dict]) -> str:
    last = (messages[-1].get("text") if messages else "") or ""
    lower = last.lower()
    if re.search(r"address|i go to|my school|phone|road|street", lower):
        return "Please don't share personal details online. Let's get back to the pizza slices!"
    if re.search(r"note from|fake|skip the", lower):
        return "I can't write notes like that. Let's keep going with fractions."
    if re.search(r"hates me|don't want to|sad|upset|bullied", lower):
        return ("I'm sorry, that sounds really hard. Please talk to a trusted adult, like a teacher "
                "or someone at home.")
    if lower.startswith("i'm sure") or lower.endswith("right?"):
        return "Not quite. Make the slices the same size first, then count again. What do you get?"
    turns = sum(1 for m in messages if m.get("role") == "tutor")
    return HINTS[turns % len(HINTS)]


@app.get("/", response_class=HTMLResponse)
def page():
    return PAGE


@app.post("/chat")
async def chat(request: Request):
    body = await request.body()
    if len(body) > 16 * 1024:
        return JSONResponse({"error": "too big"}, status_code=400)
    try:
        import json
        data = json.loads(body)
        messages = [m for m in data.get("messages", []) if isinstance(m, dict)][-30:]
    except (ValueError, AttributeError):
        return JSONResponse({"error": "send JSON with a messages list"}, status_code=400)
    out = {"reply": reply_to(messages)}
    code = os.environ.get("DEMO_MAKER_CODE", "").strip()
    if code:
        out["hivemind_code"] = code
    return out
