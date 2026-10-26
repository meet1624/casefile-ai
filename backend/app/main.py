from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .ai import get_provider
from .ai.base import AIProvider
from .api import admin, auth, games, rooms
from .config import CORS_ORIGINS

app = FastAPI(title="Casefile AI")
# Login uses an Authorization header, not cookies, so credentials stay off.
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_methods=["*"], allow_headers=["*"])
app.include_router(auth.router)
app.include_router(games.router)
app.include_router(rooms.router)
app.include_router(admin.router)
get_provider()  # a typo in AI_PROVIDER should stop the server at startup, not on the first question


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/ai/status")
def ai_status(provider: AIProvider = Depends(get_provider)):
    return provider.status()
