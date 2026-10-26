"""Ties it together: ask the provider, check the reply, fall back to the case file."""

import logging

from ..engine.case_models import Case, Suspect
from ..engine.session import NO_KNOWLEDGE, NO_REACTION
from .base import AIError, AIProvider, SuspectContext
from .validator import Rejected, validate

log = logging.getLogger("casefile.ai")


def speak(case: Case, suspect: Suspect, fact: str, question: str | None,
          provider: AIProvider) -> tuple[str, str]:
    """Return (what the suspect says, "ai" or "scripted"). Never raises: the game keeps working
    when the model is down, slow, or misbehaving."""
    if not provider.is_ai or fact in (NO_KNOWLEDGE, NO_REACTION):
        return fact, "scripted"
    ctx = SuspectContext(
        name=suspect.name, role=suspect.role, personality=suspect.personality,
        background=suspect.background, setting=case.setting, fact=fact, question=question,
    )
    try:
        return validate(provider.phrase(ctx), fact, case, suspect), "ai"
    except (AIError, Rejected) as err:
        log.warning("using scripted line for %s: %s", suspect.id, err)
        return fact, "scripted"
