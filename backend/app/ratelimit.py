"""Tiny in-memory sliding-window limiter. shortcut: per-process memory, resets on restart; use Redis if you ever run several servers."""

import time
from collections import defaultdict, deque

from fastapi import HTTPException


class Limiter:
    def __init__(self, limit: int, window: int):
        self.limit, self.window = limit, window
        self.hits: dict[str, deque[float]] = defaultdict(deque)

    def _recent(self, key: str) -> deque[float]:
        q, now = self.hits[key], time.monotonic()
        while q and now - q[0] > self.window:
            q.popleft()
        if not q:
            self.hits.pop(key, None)
        return q

    def check(self, key: str) -> None:
        """Raise 429 if `key` is already at its limit."""
        q = self._recent(key)
        if len(q) >= self.limit:
            wait = int(self.window - (time.monotonic() - q[0])) + 1
            raise HTTPException(429, f"too many attempts, try again in {wait} seconds", headers={"Retry-After": str(wait)})

    def hit(self, key: str) -> None:
        self._recent(key)
        self.hits[key].append(time.monotonic())

    def reset(self, key: str | None = None) -> None:
        self.hits.pop(key, None) if key else self.hits.clear()


login_failures = Limiter(limit=5, window=300)
registrations = Limiter(limit=10, window=3600)
