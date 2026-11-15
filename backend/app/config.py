"""Settings, read from environment variables or the backend/.env file.

The .env file holds the Gemini key. It is listed in .gitignore, so it is
never committed, and nothing in this code ever prints the key.
"""

from __future__ import annotations

import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BACKEND_DIR / ".env"


class MissingKeyError(RuntimeError):
    pass


def load_env(path: Path = ENV_FILE) -> None:
    """Copy KEY=VALUE lines from the .env file into the environment (real env vars win)."""
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        name, value = line.split("=", 1)
        os.environ.setdefault(name.strip(), value.strip().strip('"').strip("'"))


def setting(name: str, default: str | None = None, env_file: Path = ENV_FILE) -> str | None:
    load_env(env_file)
    return os.environ.get(name, default)


def gemini_key(env_file: Path = ENV_FILE) -> str:
    key = (setting("GEMINI_API_KEY", "", env_file) or "").strip()
    if not key:
        raise MissingKeyError(
            "No Gemini key found. Copy backend/.env.example to backend/.env "
            "and paste your key after GEMINI_API_KEY="
        )
    return key
