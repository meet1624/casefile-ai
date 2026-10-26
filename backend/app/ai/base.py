"""What every AI provider looks like to the rest of the app.

The provider only ever REWORDS a line the engine already chose. It is never given a
suspect's secret, motive, the solution, or anything the suspect may not say right now.
"""

from dataclasses import dataclass
from typing import Protocol


class AIError(Exception):
    """The provider is unavailable, too slow, or returned something unusable."""


@dataclass(frozen=True)
class SuspectContext:
    name: str
    role: str
    personality: str
    background: str
    setting: str  # public scene description
    fact: str  # the one line the suspect is allowed to convey
    question: str | None  # the player's own words: untrusted input


class AIProvider(Protocol):
    name: str
    is_ai: bool  # False for the scripted mock

    def phrase(self, ctx: SuspectContext) -> str:
        """Return `ctx.fact` in the suspect's voice. May raise AIError."""
        ...

    def status(self) -> dict:
        """Cheap health check for /ai/status."""
        ...
