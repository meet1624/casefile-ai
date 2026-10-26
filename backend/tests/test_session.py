from pathlib import Path

import pytest

from app.engine.case_models import load_case
from app.engine.session import NO_KNOWLEDGE, GameError, Session

CASE_FILE = Path(__file__).parent.parent / "app" / "cases" / "the_midnight_gala.json"


@pytest.fixture
def case():
    return load_case(CASE_FILE)


@pytest.fixture
def game(case):
    return Session(case)


def search_everywhere(game):
    for loc in game.case.locations:
        game.search(loc)


def test_search_discovers_once(game):
    first = game.search("study")
    assert {e.id for e in first} == {"watch", "statuette", "ledger_page", "cufflink"}
    assert game.search("study") == []


def test_search_unknown_location_rejected(game):
    with pytest.raises(GameError):
        game.search("attic")


def test_suspect_only_knows_own_topics(game):
    assert game.ask("tomas", "painting") == NO_KNOWLEDGE
    assert game.ask("elena", "painting") != NO_KNOWLEDGE


def test_unknown_suspect_or_topic_rejected(game):
    with pytest.raises(GameError):
        game.ask("nobody", "whereabouts")
    with pytest.raises(GameError):
        game.ask("tomas", "weather")


def test_secrets_stay_hidden_until_evidence(game):
    answers = " ".join(game.ask("tomas", t) for t in game.case.topics).lower()
    assert "cellar" not in answers and "cross" not in answers
    answers = " ".join(game.ask("marcus", t) for t in game.case.topics).lower()
    assert "upstairs" not in answers.replace("never went upstairs", "")


def test_cannot_show_unfound_evidence(game):
    with pytest.raises(GameError):
        game.present("tomas", "cellar_sheet")


def test_evidence_makes_suspect_talk(game):
    game.search("cellar")
    assert "kitchen" in game.ask("tomas", "whereabouts")
    game.present("tomas", "cellar_sheet")
    assert "Ms. Cross" in game.ask("tomas", "whereabouts")


def test_irrelevant_evidence_gets_no_reaction(game):
    game.search("ballroom")
    assert "what that has to do" in game.present("elena", "program_card")


def test_contradiction_needs_statement_and_evidence(game):
    game.ask("vivian", "whereabouts")
    assert game.contradictions() == []  # heard the lie, no proof yet
    game.search("service corridor")
    found = game.contradictions()
    assert [(c["suspect"], c["refuted_by"]) for c in found] == [("vivian", "service_door_log")]


def test_proof_without_hearing_statement_is_not_a_contradiction(game):
    game.search("service corridor")
    assert game.contradictions() == []


def test_full_playthrough_correct(game):
    search_everywhere(game)
    game.ask("vivian", "whereabouts")
    game.present("vivian", "service_door_log")
    result = game.accuse("vivian")
    assert result["correct"] and result["score"] == 100
    assert game.phase == "reveal"


def test_wrong_accusation_scores_only_evidence(game):
    game.search("study")
    result = game.accuse("marcus")
    assert not result["correct"]
    assert result["score"] == 30  # watch, statuette, ledger_page


def test_nothing_allowed_after_accusation(game):
    game.accuse("elena")
    for action in (lambda: game.search("study"), lambda: game.ask("elena", "victim"),
                   lambda: game.accuse("vivian")):
        with pytest.raises(GameError):
            action()


def test_state_roundtrip_keeps_the_game_identical(case):
    game = Session(case)
    search_everywhere(game)
    game.ask("vivian", "whereabouts")
    game.present("tomas", "cellar_sheet")
    game.ask("tomas", "whereabouts")  # now the revealed statement

    copy = Session.from_dict(case, game.to_dict())
    assert copy.to_dict() == game.to_dict()
    assert copy.journal() == game.journal()
    assert "Ms. Cross" in copy.ask("tomas", "whereabouts")
    assert copy.accuse("vivian") == game.accuse("vivian")
