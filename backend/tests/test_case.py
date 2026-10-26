import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.engine.case_models import Case, Statement, load_case

CASE_FILE = Path(__file__).parent.parent / "app" / "cases" / "the_midnight_gala.json"


@pytest.fixture
def raw():
    return json.loads(CASE_FILE.read_text(encoding="utf-8"))


def test_shipped_case_is_consistent():
    assert load_case(CASE_FILE).problems() == []


def test_public_briefing_leaks_no_private_data():
    case = load_case(CASE_FILE)
    dump = json.dumps(case.public_briefing())
    assert "solution" not in dump
    for s in case.suspects:
        assert s.motive not in dump
        assert s.secret not in dump
        assert all(st.text not in dump for st in s.statements)
    assert all(e.description not in dump for e in case.evidence)


def test_lie_without_proof_is_rejected():
    with pytest.raises(ValidationError):
        Statement(topic="whereabouts", text="I was home.", truthful=False)


def test_airtight_culprit_is_flagged(raw):
    for st in raw["suspects"][0]["statements"]:  # vivian, the culprit
        st["truthful"], st["refuted_by"] = True, None
    problems = Case.model_validate(raw).problems()
    assert any("airtight" in p for p in problems)


def test_dangling_references_are_flagged(raw):
    raw["suspects"][1]["statements"][0]["refuted_by"] = "no_such_evidence"
    raw["solution"]["key_evidence"].append("ghost")
    raw["evidence"][0]["location"] = "moon"
    problems = " ".join(Case.model_validate(raw).problems())
    assert "no_such_evidence" in problems
    assert "ghost" in problems
    assert "moon" in problems


def test_out_of_order_timeline_is_flagged(raw):
    raw["timeline"][0], raw["timeline"][1] = raw["timeline"][1], raw["timeline"][0]
    raw["timeline"][0]["time"] = "23:59"
    assert any("chronological" in p for p in Case.model_validate(raw).problems())


def test_bad_time_format_is_rejected(raw):
    raw["timeline"][0]["time"] = "9pm"
    with pytest.raises(ValidationError):
        Case.model_validate(raw)


def test_every_topic_needs_a_label(raw):
    del raw["topic_labels"]["money"]
    assert any("label" in p for p in Case.model_validate(raw).problems())
    raw["topic_labels"].update(money="Tell me about the money.", extra="Not a topic")
    assert any("label" in p for p in Case.model_validate(raw).problems())


def test_public_briefing_includes_the_question_labels():
    case = load_case(CASE_FILE)
    assert case.public_briefing()["topic_labels"]["whereabouts"] == "Where were you tonight?"
