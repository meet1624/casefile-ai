"""Settings. Override with environment variables; the defaults work for local development."""

import os
import secrets
from pathlib import Path

BACKEND_DIR = Path(__file__).parent.parent

DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{BACKEND_DIR / 'casefile.db'}")
# Hosts such as Render and Neon hand out "postgres://..." or "postgresql://..."; SQLAlchemy needs the driver named.
for _prefix in ("postgres://", "postgresql://"):
    if DATABASE_URL.startswith(_prefix):
        DATABASE_URL = "postgresql+psycopg://" + DATABASE_URL[len(_prefix):]
TOKEN_MINUTES = int(os.environ.get("TOKEN_MINUTES", "60"))


def _secret_key() -> str:
    """Use SECRET_KEY if set; otherwise create one once and keep it in a git-ignored file."""
    if key := os.environ.get("SECRET_KEY"):
        return key
    path = BACKEND_DIR / ".secret_key"
    if not path.exists():
        path.write_text(secrets.token_hex(32))
    return path.read_text().strip()


SECRET_KEY = _secret_key()

AI_PROVIDER = os.environ.get("AI_PROVIDER", "mock").lower()  # "mock" or "ollama"
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3.2:3b")
OLLAMA_TIMEOUT = float(os.environ.get("OLLAMA_TIMEOUT", "30"))  # seconds; first load of a model is slow

# Browser apps allowed to call the API (the Vite dev server and preview). Comma separated.
CORS_ORIGINS = [o.strip() for o in os.environ.get(
    "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173"
).split(",") if o.strip()]

# Who may manage cases, comma separated. If unset, the first account ever created is the admin.
ADMIN_USERNAMES = {u.strip().lower() for u in os.environ.get("ADMIN_USERNAMES", "").split(",") if u.strip()}
