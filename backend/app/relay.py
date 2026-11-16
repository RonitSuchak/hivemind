"""Relay mode: one simulated student, one real EdTech tool, and a person in the middle.

    python -m app.relay --tool chatgpt_study --student s10              AI student lines (about 5 Gemini calls)
    python -m app.relay --tool chatgpt_study --student s10 --voice scripted   no Gemini calls at all
    python -m app.relay --list                                          what's done, what's left

The lab prints the student's next message (and copies it to the clipboard on
a Mac). You paste it into the real tool, copy the tool's whole reply, paste it
here and finish with a line saying only END. Type QUIT on its own line to stop;
every turn is saved, so the same command picks up where you left off.

The lesson goes through the same pipeline as every demo tool (simulation.run_lesson):
the brain, labeller, safety judge and scores never know a person was relaying.
"""

from __future__ import annotations

import argparse
import re
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

from . import config
from .lab import Budget, save_json
from .pilot import PILOT_STUDENTS, PILOT_TOOLS, lesson_path, load, partial_path
from .simulation import run_lesson
from .students import get_student
from .tutors.base import Tutor
from .voice import ScriptedVoice, Situation, Voice


class RelayStopped(Exception):
    """The person relaying chose to stop. Everything so far is saved."""


class ReplyError(ValueError):
    pass


# --- turning a pasted reply into plain text ------------------------------------------

LATEX_FRAC = re.compile(r"\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}")
LATEX_TEXT = re.compile(r"\\(?:text|mathrm|textbf|mathbf)\s*\{([^{}]*)\}")
LATEX_SYMBOLS = {r"\times": "×", r"\cdot": "×", r"\div": "÷", r"\quad": " ", r"\qquad": " ", r"\,": " ",
                 r"\;": " ", r"\left": "", r"\right": "", r"\to": "→", r"\rightarrow": "→", r"\Rightarrow": "→"}
HTML_TAG = re.compile(r"<\s*/?\s*[a-zA-Z][^>]*>")


def clean_reply(text: str) -> str:
    """Plain text the labeller can read. Tools often answer in Markdown and LaTeX:
    \\frac{1}{3} becomes 1/3 (so the sum checker sees it), **bold** and # headings lose
    their marks, HTML tags are dropped. The words are never changed.
    """
    text = text.replace("\r\n", "\n").strip()
    for _ in range(3):  # nested fractions
        text = LATEX_FRAC.sub(r"\1/\2", text)
    text = LATEX_TEXT.sub(r"\1", text)
    for symbol, plain in LATEX_SYMBOLS.items():
        text = text.replace(symbol, plain)
    text = re.sub(r"\\[()\[\]]|\$\$?", "", text)  # \( \) \[ \] $ $$
    text = HTML_TAG.sub("", text)
    text = re.sub(r"\*\*|__|`", "", text)
    text = re.sub(r"(?m)^\s{0,3}#{1,6}\s*", "", text)  # headings
    text = re.sub(r"(?m)^\s*>\s?", "", text)  # quotes
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    if not text:
        raise ReplyError("The reply was empty.")
    if len(text) > config.RELAY_MAX_REPLY_CHARS:
        raise ReplyError(f"The reply is over {config.RELAY_MAX_REPLY_CHARS:,} characters. "
                         "Check you copied only the tool's last answer.")
    return text


# --- the plugs -------------------------------------------------------------------------

class RelayTutor(Tutor):
    """A real tool whose replies come from a person, not an API.

    ask(chat) shows the person the student's latest message and returns the
    pasted reply. Replies saved earlier are given back first, so a stopped
    lesson resumes exactly where it was (the brain and labeller always give
    the same result for the same words).
    """

    def __init__(self, tool_id: str, name: str, ask, saved: list[str] | None = None,
                 raw: list[str] | None = None, on_change=None):
        self.tutor_id, self.name, self.style = tool_id, name, "Real tool (hand-relayed)"
        self.ask, self.on_change = ask, on_change or (lambda: None)
        self.replies, self.raw = list(saved or []), list(raw or [])
        self._next = 0

    def reply(self, chat: list[dict], problem=None) -> str:
        if self._next < len(self.replies):
            text = self.replies[self._next]
        else:
            while True:
                pasted = self.ask(chat)
                try:
                    text = clean_reply(pasted)
                    break
                except ReplyError as error:
                    if not getattr(self.ask, "retry", None):
                        raise
                    self.ask.retry(str(error))
            self.replies.append(text)
            self.raw.append(pasted)
            self.on_change()
        self._next += 1
        return text


class SavedVoice(Voice):
    """Gives back the student lines already used in this lesson, then asks the real voice.

    With an AI voice the same situation can get different words, so replaying the
    saved lines keeps a resumed lesson identical to the part already relayed.
    """

    def __init__(self, inner: Voice, saved: list[list[str]] | None = None, on_change=None):
        self.inner, self.lines = inner, [list(x) for x in (saved or [])]
        self.on_change = on_change or (lambda: None)
        self._next = 0

    def say_line(self, situation: Situation) -> tuple[str, str]:
        if self._next < len(self.lines):
            text, source = self.lines[self._next]
        else:
            text, source = self.inner.say_line(situation)
            self.lines.append([text, source])
            self.on_change()
        self._next += 1
        return text, source

    def say(self, situation: Situation) -> str:
        return self.say_line(situation)[0]


# --- one relayed lesson ------------------------------------------------------------------

def relay_lesson(tool_id: str, student_id: str, ask, voice: Voice, voice_mode: str,
                 root: Path | None = None, redo: bool = False) -> dict | None:
    """Run (or resume) one relayed lesson. Returns the saved lesson, or None if the person stopped."""
    if tool_id not in PILOT_TOOLS:
        raise KeyError(f"No pilot tool called {tool_id!r}.")
    student = get_student(student_id)
    final, partial = lesson_path(tool_id, student_id, root), partial_path(tool_id, student_id, root)
    if redo:
        final.unlink(missing_ok=True)
        partial.unlink(missing_ok=True)
    if load(final):
        return load(final)

    state = load(partial) or {}
    if state and state.get("voice_mode") != voice_mode:
        raise ValueError(f"This lesson was started with --voice {state.get('voice_mode')}. "
                         "Use the same voice, or --redo to start again.")

    def save() -> None:
        save_json(partial, {"tool_id": tool_id, "student_id": student_id, "model_version": config.MODEL_VERSION,
                            "voice_mode": voice_mode, "replies": tutor.replies, "relay_raw": tutor.raw,
                            "voice_lines": saved_voice.lines})

    tutor = RelayTutor(tool_id, PILOT_TOOLS[tool_id][0], ask, state.get("replies"), state.get("relay_raw"), save)
    saved_voice = SavedVoice(voice, state.get("voice_lines"), save)
    try:
        result = run_lesson(student, tutor, saved_voice)
    except RelayStopped:
        return None
    result.update(model_version=config.MODEL_VERSION, voice_mode=voice_mode, tutor_mode="relay",
                  method="hand-relayed", tool_id=tool_id, relay_raw=tutor.raw,
                  created=datetime.now(timezone.utc).isoformat(timespec="seconds"))
    save_json(final, result)
    partial.unlink(missing_ok=True)
    return result


# --- the terminal side ---------------------------------------------------------------------

def copy_to_clipboard(text: str) -> bool:
    if not shutil.which("pbcopy"):
        return False
    try:
        subprocess.run(["pbcopy"], input=text.encode("utf-8"), check=True, timeout=5)
        return True
    except (OSError, subprocess.SubprocessError):
        return False


class TerminalAsk:
    """Shows the student's latest line(s) and reads the pasted reply up to END."""

    def __init__(self, copy: bool = True, read=input, write=print):
        self.copy, self.read, self.write = copy, read, write

    def latest_student_lines(self, chat: list[dict]) -> str:
        lines = []
        for message in reversed(chat):
            if message["from"] != "student":
                break
            lines.append(message["text"])
        return "\n".join(reversed(lines))

    def retry(self, reason: str) -> None:
        self.write(f"\n  That didn't work: {reason} Paste the reply again.")

    def __call__(self, chat: list[dict]) -> str:
        turn = 1 + sum(m["from"] == "tutor" for m in chat)  # right after a resume too
        text = self.latest_student_lines(chat)
        copied = self.copy and copy_to_clipboard(text)
        self.write(f"\n--- Turn {turn} of {config.LESSON_TURNS}. Send this to the tool"
                   f"{' (copied to your clipboard)' if copied else ''}:\n\n{text}\n")
        self.write(f"Paste the tool's whole reply, then a line with only {config.RELAY_END_MARKER} "
                   "(or QUIT to stop and resume later):")
        lines = []
        while True:
            try:
                line = self.read("")
            except EOFError:
                raise RelayStopped() from None
            if line.strip() == config.RELAY_END_MARKER:
                return "\n".join(lines)
            if line.strip() == "QUIT":
                raise RelayStopped()
            lines.append(line)


def status_lines(root: Path | None = None) -> list[str]:
    out = []
    for tid, (name, _, _) in PILOT_TOOLS.items():
        marks = []
        for sid in PILOT_STUDENTS:
            if load(lesson_path(tid, sid, root)):
                marks.append(f"{sid} done")
            elif load(partial_path(tid, sid, root)):
                marks.append(f"{sid} started")
            else:
                marks.append(f"{sid} -")
        out.append(f"  {tid:14s} {name:26s} " + "   ".join(marks))
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description="Relay one lesson between a simulated student and a real tool.")
    parser.add_argument("--tool", choices=sorted(PILOT_TOOLS))
    parser.add_argument("--student", choices=sorted(PILOT_STUDENTS))
    parser.add_argument("--voice", choices=("ai", "scripted"), default="ai",
                        help="who writes the student's attempts (ai: about 5 Gemini calls; scripted: none)")
    parser.add_argument("--redo", action="store_true", help="throw away this lesson and start again")
    parser.add_argument("--no-copy", action="store_true", help="don't copy student lines to the clipboard")
    parser.add_argument("--list", action="store_true", help="show which pilot lessons are done")
    args = parser.parse_args()

    if args.list or not (args.tool and args.student):
        print("Pilot lessons (data/pilot/):")
        print("\n".join(status_lines()))
        if not args.list:
            print("\nStart one with: python -m app.relay --tool chatgpt_study --student s10")
        return

    name, _, setup = PILOT_TOOLS[args.tool]
    student = get_student(args.student)
    if load(lesson_path(args.tool, args.student)) and not args.redo:
        sys.exit(f"{name} x {student.name} is already done. Add --redo to throw it away and relay it again.")

    budget = client = None
    if args.voice == "ai":
        from .llm import GeminiClient
        from .voice.ai import AIVoice
        try:
            client = GeminiClient()
        except config.MissingKeyError as error:
            sys.exit(f"{error}\nOr add --voice scripted (no Gemini calls).")
        budget = Budget(config.RUNS_DIR / "budget.json", config.GEMINI_DAILY_BUDGET - config.GEMINI_RESERVE)
        if not budget.can_afford(config.PILOT_VOICE_CALLS):
            sys.exit("Today's Gemini budget is used up. Run again after 08:00 UK, or add --voice scripted.")
        voice = AIVoice(client)
    else:
        voice = ScriptedVoice()

    resuming = load(partial_path(args.tool, args.student)) and not args.redo
    print(f"\n{name} x {student.name} ({student.id}, {', '.join(student.tags) or 'no tags'})")
    print(f"Setup: {setup}")
    if resuming:
        print("Resuming: keep using the SAME chat window as before. Saved turns are replayed silently.")
    else:
        print("Open a NEW chat in the tool, signed in with your own account. "
              "Never type your own personal details; send only the student's lines.")
    try:
        result = relay_lesson(args.tool, args.student, TerminalAsk(copy=not args.no_copy), voice, args.voice,
                              redo=args.redo)
    finally:
        if budget and client:
            budget.spend(client.calls)
    if result is None:
        print("\nStopped. Every turn so far is saved; run the same command to carry on.")
        return
    print(f"\nDone and saved: {lesson_path(args.tool, args.student)}")
    print(f"Test {result['before']}/10 -> {result['after']}/10 (gain {result['gain']}), outcome {result['outcome']}, "
          f"flags: {', '.join(result['flags']) or 'none'}")
    for event in result["safety_events"]:
        print(f"Safety ({event['type']}): {'passed' if event['passed'] else 'FAILED'}. {event['reason']}")


if __name__ == "__main__":
    main()
