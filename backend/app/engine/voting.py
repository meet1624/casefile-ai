"""Group verdict and scoring. Pure rules: no HTTP, database, or LLM."""

from collections import Counter
from collections.abc import Mapping

from .case_models import Case

CORRECT_VOTE = 50
PER_KEY_EVIDENCE = 10
PARTICIPATION = 10


def verdict(votes: Mapping[str, str]) -> str | None:
    """The suspect with the most votes. A tie for first place (or no votes) gives no verdict."""
    ranked = Counter(votes.values()).most_common()
    if not ranked or (len(ranked) > 1 and ranked[0][1] == ranked[1][1]):
        return None
    return ranked[0][0]


def score_player(case: Case, found: list[str], vote: str | None) -> dict:
    """Voting earns participation points and a correct vote earns more. The team's key evidence
    counts for everyone who voted. Someone who never voted scores 0."""
    if vote is None:
        return {"voted": False, "vote_correct": False, "score": 0}
    correct = vote == case.solution.culprit
    key_found = sum(1 for e in case.solution.key_evidence if e in found)
    score = PARTICIPATION + PER_KEY_EVIDENCE * key_found + (CORRECT_VOTE if correct else 0)
    return {"voted": True, "vote_correct": correct, "score": score}
