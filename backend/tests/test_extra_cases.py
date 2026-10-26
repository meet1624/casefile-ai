"""The extra cases in /cases must load, be consistent, and be solvable by playing them."""
from pathlib import Path

import pytest

from app.engine.case_models import load_case
from app.engine.session import Session
from app.engine.voting import score_player

FILES = sorted((Path(__file__).parents[2] / "cases").glob("*.json"))


def test_the_extra_cases_exist():
    assert len(FILES) >= 2


@pytest.mark.parametrize("path", FILES, ids=lambda p: p.stem)
def test_case_is_solvable_by_playing_it(path):
    case = load_case(path)
    s = Session(case)
    for loc in case.locations:
        s.search(loc)
    assert set(s.found) == {e.id for e in case.evidence}  # every exhibit is findable
    culprit = case.solution.culprit
    for sus in case.suspects:
        s.ask(sus.id, "whereabouts")
        for r in sus.reactions:  # show everything that makes them react
            s.present(sus.id, r.evidence_id)
    caught = {c["suspect"] for c in s.contradictions()}
    assert culprit in caught  # the culprit can always be caught in a lie
    assert score_player(case, s.found, culprit)["score"] == 100  # a perfect game is exactly 100
