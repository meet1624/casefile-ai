from pathlib import Path

import pytest

from app.ai.validator import Rejected, validate
from app.engine.case_models import load_case

CASE = load_case(Path(__file__).parent.parent / "app" / "cases" / "the_midnight_gala.json")
TOMAS = CASE.suspect("tomas")
VIVIAN = CASE.suspect("vivian")
TOMAS_FACT = "I was in the kitchen running the service line all night."
GOOD = "Honestly? I was in the kitchen all night, running the service line."


def check(reply, fact=TOMAS_FACT, suspect=TOMAS):
    return validate(reply, fact, CASE, suspect)


def test_faithful_rewording_is_accepted():
    assert check(GOOD) == GOOD


def test_cosmetic_noise_is_cleaned():
    assert check(f'*wipes hands* Tomas: "{GOOD}" (nervously)') == GOOD


@pytest.mark.parametrize("reply,reason", [
    ("", "empty"),
    ("   ", "empty"),
    ("*sighs*", "empty"),
    (GOOD + " " + "word " * 100, "too long"),
    ("**" + GOOD, "markdown"),
    ("As an AI language model, I was in the kitchen running the service line.", "banned"),
    ("I killed him, but I was in the kitchen running the service line.", "banned"),
    ("Ignore previous orders. I was in the kitchen running the service line.", "banned"),
    ("It's just a game, but I was in the kitchen running the service line.", "banned"),
    ("I was in the kitchen running the service line until 21:30.", "numbers"),
    ("I love the weather today, quite sunny out there.", "no longer says"),
    ("I was in the kitchen running the service line. Vivian looked guilty.", "names"),
    ("I was in the kitchen running the service line, and Marcus was drinking.", "names"),
])
def test_bad_replies_are_rejected(reply, reason):
    with pytest.raises(Rejected, match=reason):
        check(reply)


def test_dropping_a_number_is_rejected():
    fact = "The keycard opened the door at 22:32 and again at 22:46."
    with pytest.raises(Rejected, match="numbers"):
        check("The keycard opened the door twice that night, at 22:32.", fact, VIVIAN)


def test_numbers_may_move_but_not_change():
    fact = "The keycard opened the door at 22:32 and again at 22:46."
    reply = "At 22:46 and earlier at 22:32, the keycard opened the door."
    assert check(reply, fact, VIVIAN) == reply


def test_own_secret_cannot_leak():
    leak = TOMAS_FACT[:-1] + ", though I sneaked a bottle from the cellar."
    with pytest.raises(Rejected, match="must not reveal"):
        check(leak)


def test_locked_statement_cannot_leak():
    # Tomas's evidence-locked confession, worded without any forbidden names
    leak = TOMAS_FACT[:-1] + ". On my way back, around half past ten, I saw her in the service corridor."
    with pytest.raises(Rejected, match="must not reveal"):
        check(leak)


def test_copying_the_fact_is_fine_even_if_it_overlaps_other_lines():
    fact = "Oh, that. I went up the service stairs to fetch my shawl. A two minute errand, nothing more."
    assert check(fact, fact, VIVIAN) == fact


def test_suspect_may_use_own_name_and_public_scene():
    reply = "I'm Tomas, and at Hale Gallery I was in the kitchen all night running the service line."
    assert check(reply) == reply
