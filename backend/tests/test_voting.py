from pathlib import Path

import pytest

from app.engine.case_models import load_case
from app.engine.voting import score_player, verdict

CASE = load_case(Path(__file__).parent.parent / "app" / "cases" / "the_midnight_gala.json")
KEY = CASE.solution.key_evidence


def test_majority_wins():
    assert verdict({"a": "vivian", "b": "vivian", "c": "marcus"}) == "vivian"


def test_single_vote_wins():
    assert verdict({"a": "elena"}) == "elena"


@pytest.mark.parametrize("votes", [
    {},
    {"a": "vivian", "b": "marcus"},
    {"a": "vivian", "b": "marcus", "c": "vivian", "d": "marcus"},
    {"a": "vivian", "b": "marcus", "c": "elena"},
])
def test_ties_and_no_votes_give_no_verdict(votes):
    assert verdict(votes) is None


def test_a_tie_for_second_place_does_not_matter():
    assert verdict({"a": "vivian", "b": "vivian", "c": "marcus", "d": "elena"}) == "vivian"


def test_correct_vote_with_all_key_evidence_is_a_perfect_score():
    assert score_player(CASE, KEY, "vivian") == {"voted": True, "vote_correct": True, "score": 100}


def test_wrong_vote_still_earns_participation_and_evidence():
    assert score_player(CASE, KEY[:2], "marcus") == {"voted": True, "vote_correct": False, "score": 30}
    assert score_player(CASE, [], "marcus")["score"] == 10


def test_not_voting_scores_nothing():
    assert score_player(CASE, KEY, None) == {"voted": False, "vote_correct": False, "score": 0}


def test_irrelevant_evidence_earns_nothing():
    assert score_player(CASE, ["cufflink", "program_card"], "vivian")["score"] == 60
