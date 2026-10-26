"""Treat everything an AI says as untrusted. A reply is accepted only if it passes every rule.

The model is never told secrets, so leaks should not happen; these checks exist because a
small local model (or a clever player question) can still go off script.
"""

import re

from ..engine.case_models import Case, Suspect

MAX_LEN = 400
MIN_OVERLAP = 0.4  # share of the fact's key words the reply must still contain

BANNED = [
    r"\bas an ai\b", r"\blanguage model\b", r"\bsystem prompt\b",
    r"\bignore (all |any )?(previous|prior|your)\b",
    r"\bi (did it|killed|murdered)\b", r"\bthe (killer|culprit|murderer)\b", r"\bgame\b",
]
STOPWORDS = frozenset(
    "that this with have from they were been what when your there about which would could "
    "their them then than into only over just also some more very".split()
)


class Rejected(Exception):
    """The AI reply broke a rule. The message says which one (for logs and tests)."""


def _words(text: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", text.lower())


def _numbers(text: str) -> set[str]:
    return set(re.findall(r"\d+(?::\d+)?", text))


def _stems(text: str) -> set[str]:
    return {w[:5] for w in _words(text) if len(w) >= 4 and w not in STOPWORDS}


def _shingles(text: str, size: int = 4) -> set[tuple[str, ...]]:
    words = _words(text)
    return {tuple(words[i:i + size]) for i in range(len(words) - size + 1)}


def _hidden_texts(case: Case, fact: str) -> list[str]:
    """Everything the suspect must not reveal by accident: secrets, the solution, locked lines."""
    hidden = [case.solution.motive, case.solution.method, case.solution.explanation]
    hidden += [event.text for event in case.timeline]
    for s in case.suspects:
        hidden += [s.secret, s.motive]
        for st in s.statements:
            hidden.append(st.text)
        for r in s.reactions:
            hidden.append(r.text)
            if r.reveals:
                hidden.append(r.reveals.text)
    return [t for t in hidden if t != fact]


def _forbidden_names(case: Case, suspect: Suspect, fact: str) -> set[str]:
    """Names a suspect may not bring up on their own (that would point fingers)."""
    names = set(_words(case.victim.split(",")[0]))
    for s in case.suspects:
        names |= set(_words(s.name))
    allowed = set(_words(suspect.name)) | set(_words(fact)) | set(_words(case.setting))
    return {n for n in names - allowed if len(n) >= 3}


def clean(reply: str, suspect: Suspect) -> str:
    text = re.sub(r"\*[^*]{1,40}\*", " ", reply)  # *sighs*
    text = re.sub(r"\([^)]{1,40}\)", " ", text)  # (nervously)
    text = " ".join(text.split())
    first = suspect.name.split()[0]
    text = re.sub(rf"^(?:{re.escape(suspect.name)}|{re.escape(first)})\s*:\s*", "", text, flags=re.I)
    return text.strip('"“”').strip()


def validate(reply: str, fact: str, case: Case, suspect: Suspect) -> str:
    """Return the cleaned reply, or raise Rejected."""
    text = clean(reply, suspect)
    if not text:
        raise Rejected("empty reply")
    if len(text) > MAX_LEN:
        raise Rejected("reply too long")
    if re.search(r"[*#`]", text):
        raise Rejected("markdown in reply")

    for pattern in BANNED:
        if re.search(pattern, text, re.I) and not re.search(pattern, fact, re.I):
            raise Rejected(f"banned phrase: {pattern}")

    if _numbers(text) != _numbers(fact):
        raise Rejected("times or numbers changed")

    fact_stems = _stems(fact)
    if fact_stems and len(fact_stems & _stems(text)) / len(fact_stems) < MIN_OVERLAP:
        raise Rejected("reply no longer says what the fact says")

    named = set(_words(text)) & _forbidden_names(case, suspect, fact)
    if named:
        raise Rejected(f"mentions names not in the fact: {sorted(named)}")

    hidden = set().union(*(_shingles(t) for t in _hidden_texts(case, fact)))
    if (_shingles(text) - _shingles(fact)) & hidden:
        raise Rejected("repeats text the suspect must not reveal")

    return text
