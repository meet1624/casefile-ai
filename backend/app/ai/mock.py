from .base import SuspectContext


class MockProvider:
    """Deterministic and offline: the suspect says exactly what the case file says.

    This is the default, the fallback when a real model fails, and what the tests use.
    """

    name = "mock"
    is_ai = False

    def phrase(self, ctx: SuspectContext) -> str:
        return ctx.fact

    def status(self) -> dict:
        return {"provider": "mock", "available": True, "detail": "scripted answers, no model needed"}
