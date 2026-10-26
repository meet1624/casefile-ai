import re

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.orm.attributes import flag_modified

from app.api.rooms import MAX_PLAYERS, act
from app.api.games import CASE
from app.db import Base
from app.engine.session import Session
from app.models import Room, RoomMember, User
from app.security import hash_password

from .conftest import register_and_login

ALL_PLACES = ("study", "ballroom", "cellar", "service corridor")


class Table:
    """A host plus guests, all logged in, with small helpers for calling the room API."""

    def __init__(self, client):
        self.client = client
        self.headers = {"host": register_and_login(client, "host")}
        self.code = client.post("/rooms", headers=self.headers["host"]).json()["code"]

    def add(self, name):
        self.headers[name] = register_and_login(self.client, name)
        r = self.client.post("/rooms/join", json={"code": self.code}, headers=self.headers[name])
        assert r.status_code == 200
        return self.headers[name]

    def post(self, who, path, **body):
        return self.client.post(f"/rooms/{self.code}/{path}", json=body or None, headers=self.headers[who])

    def get(self, who):
        return self.client.get(f"/rooms/{self.code}", headers=self.headers[who])

    def search_all(self, who="host"):
        for place in ALL_PLACES:
            assert self.post(who, "search", location=place).status_code == 200

    def to_voting(self):
        assert self.post("host", "start").status_code == 200
        assert self.post("host", "voting").status_code == 200


@pytest.fixture
def table(client):
    return Table(client)


# ---- creating and joining ----------------------------------------------------------------

def test_create_room(client):
    auth = register_and_login(client, "host")
    body = client.post("/rooms", headers=auth).json()
    assert re.fullmatch(r"[A-HJ-NP-Z2-9]{6}", body["code"])
    assert body["phase"] == "lobby" and body["host"] == "host"
    assert body["players"] == [{"username": "host", "online": False, "voted": False}]
    assert client.post("/rooms").status_code == 401


def test_join_by_code_is_case_insensitive_and_idempotent(table):
    guest = register_and_login(table.client, "guest")
    for code in (table.code.lower(), table.code, table.code):
        r = table.client.post("/rooms/join", json={"code": code}, headers=guest)
        assert r.status_code == 200
    assert [p["username"] for p in r.json()["players"]] == ["host", "guest"]


def test_unknown_code_and_bad_codes(table):
    guest = register_and_login(table.client, "guest")
    assert table.client.post("/rooms/join", json={"code": "ZZZZZZ"}, headers=guest).status_code == 404
    assert table.client.post("/rooms/join", json={"code": "ab"}, headers=guest).status_code == 422
    assert table.client.post("/rooms/join", json={"code": table.code}).status_code == 401


def test_room_has_a_player_limit(table):
    for i in range(MAX_PLAYERS - 1):
        table.add(f"player{i}")
    late = register_and_login(table.client, "late")
    r = table.client.post("/rooms/join", json={"code": table.code}, headers=late)
    assert r.status_code == 409 and "full" in r.json()["detail"]


def test_no_joining_once_voting_has_started(table):
    table.to_voting()
    late = register_and_login(table.client, "late")
    assert table.client.post("/rooms/join", json={"code": table.code}, headers=late).status_code == 409


def test_my_rooms_lists_only_mine(table):
    table.add("guest")
    other = register_and_login(table.client, "other")
    table.client.post("/rooms", headers=other)
    mine = table.client.get("/rooms", headers=table.headers["guest"]).json()
    assert mine == [{"code": table.code, "phase": "lobby", "players": 2}]


# ---- room isolation ----------------------------------------------------------------------

def test_outsiders_cannot_see_or_touch_a_room(table):
    outsider = register_and_login(table.client, "outsider")
    missing = table.client.get("/rooms/ZZZZZZ", headers=outsider)
    assert missing.status_code == 404
    attempts = [
        table.client.get(f"/rooms/{table.code}", headers=outsider),
        table.client.post(f"/rooms/{table.code}/start", headers=outsider),
        table.client.post(f"/rooms/{table.code}/search", json={"location": "study"}, headers=outsider),
        table.client.post(f"/rooms/{table.code}/ask", json={"suspect": "tomas", "topic": "victim"}, headers=outsider),
        table.client.post(f"/rooms/{table.code}/vote", json={"suspect": "vivian"}, headers=outsider),
    ]
    for r in attempts:
        assert r.status_code == 404 and r.json() == missing.json()  # same as a room that does not exist
    assert table.get("host").json()["phase"] == "lobby"  # and nothing changed


def test_two_rooms_do_not_share_an_investigation(client):
    a = Table(client)
    other_headers = register_and_login(client, "other")
    code_b = client.post("/rooms", headers=other_headers).json()["code"]
    a.post("host", "start")
    a.post("host", "search", location="study")
    client.post(f"/rooms/{code_b}/start", headers=other_headers)
    journal = client.get(f"/rooms/{code_b}", headers=other_headers).json()["journal"]
    assert journal["evidence"] == []


# ---- phases ------------------------------------------------------------------------------

def test_only_the_host_moves_the_phase(table):
    table.add("guest")
    assert table.post("guest", "start").status_code == 403
    assert table.post("host", "start").status_code == 200
    assert table.post("guest", "voting").status_code == 403
    assert table.get("guest").json()["phase"] == "investigation"


def test_phases_cannot_be_skipped_or_repeated(table):
    assert table.post("host", "voting").status_code == 409  # lobby -> voting
    assert table.post("host", "reveal").status_code == 409  # lobby -> reveal
    assert table.post("host", "replay").status_code == 409
    assert table.post("host", "start").status_code == 200
    assert table.post("host", "start").status_code == 409  # twice
    assert table.post("host", "reveal").status_code == 409  # investigation -> reveal
    assert table.post("host", "voting").status_code == 200


def test_investigation_only_works_in_the_investigation_phase(table):
    assert table.post("host", "search", location="study").status_code == 409  # lobby
    assert table.post("host", "ask", suspect="tomas", topic="victim").status_code == 409
    table.to_voting()
    assert table.post("host", "search", location="study").status_code == 409  # voting
    assert table.post("host", "present", suspect="tomas", evidence="cellar_sheet").status_code == 409


# ---- the shared investigation ------------------------------------------------------------

def test_everyone_sees_what_anyone_finds(table):
    table.add("guest")
    table.post("host", "start")
    assert len(table.post("guest", "search", location="cellar").json()["found"]) == 1
    assert table.post("host", "search", location="cellar").json()["found"] == []  # already found by the guest
    table.post("host", "ask", suspect="tomas", topic="whereabouts")
    for who in ("host", "guest"):
        journal = table.get(who).json()["journal"]
        assert [e["id"] for e in journal["evidence"]] == ["cellar_sheet"]
        assert journal["statements"][0]["suspect"] == "tomas"


def test_room_rule_violations_are_400_and_bad_bodies_422(table):
    table.post("host", "start")
    assert table.post("host", "search", location="attic").status_code == 400
    assert table.post("host", "ask", suspect="nobody", topic="victim").status_code == 400
    assert table.post("host", "present", suspect="tomas", evidence="cellar_sheet").status_code == 400
    assert table.post("host", "search").status_code == 422
    assert table.post("host", "ask", suspect="tomas", topic="victim", question="x" * 201).status_code == 422


def test_lobby_view_hides_the_investigation_and_solution(table):
    text = table.get("host").text
    assert "journal" not in text and "result" not in text
    assert "culprit" not in text and "secret" not in text and "motive" not in text


# ---- voting ------------------------------------------------------------------------------

def test_no_solution_or_votes_leak_before_the_reveal(table):
    table.add("guest")
    table.to_voting()
    table.post("host", "vote", suspect="vivian")
    body = table.get("guest").json()
    assert "result" not in body
    assert [p["voted"] for p in body["players"]] == [True, False]
    for text in (table.get("guest").text, table.get("host").text):
        assert "culprit" not in text and "explanation" not in text


def test_vote_rules(table):
    table.add("guest")
    assert table.post("host", "vote", suspect="vivian").status_code == 409  # lobby
    table.post("host", "start")
    assert table.post("host", "vote", suspect="vivian").status_code == 409  # investigation
    table.post("host", "voting")
    assert table.post("host", "vote", suspect="nobody").status_code == 400
    assert table.post("host", "vote").status_code == 422
    assert table.post("host", "vote", suspect="vivian").status_code == 201
    again = table.post("host", "vote", suspect="marcus")
    assert again.status_code == 409 and "already" in again.json()["detail"]


def test_everyone_voting_reveals_automatically(table):
    table.add("guest")
    table.post("host", "start")
    table.search_all()
    table.post("host", "voting")
    assert table.post("host", "vote", suspect="vivian").json()["phase"] == "voting"
    last = table.post("guest", "vote", suspect="vivian").json()
    assert last == {"votes_cast": 2, "players": 2, "phase": "reveal"}

    result = table.get("host").json()["result"]
    assert result["verdict"] == "vivian" and result["correct"] is True and not result["tie"]
    assert result["solution"]["culprit"] == "vivian" and "keycard" in result["solution"]["explanation"]
    assert {v["username"]: v["suspect"] for v in result["votes"]} == {"host": "vivian", "guest": "vivian"}
    assert [s["score"] for s in result["scores"]] == [100, 100]
    assert result["key_evidence_found"] == "4/4"
    assert table.post("host", "vote", suspect="vivian").status_code == 409  # closed


def test_a_tie_gives_no_verdict_and_no_group_win(table):
    table.add("guest")
    table.post("host", "start")
    table.search_all()
    table.post("host", "voting")
    table.post("host", "vote", suspect="vivian")
    table.post("guest", "vote", suspect="marcus")
    result = table.get("host").json()["result"]
    assert result["tie"] is True and result["verdict"] is None and result["correct"] is False
    scores = {s["username"]: s for s in result["scores"]}
    assert scores["host"]["score"] == 100 and scores["guest"]["score"] == 50  # individual votes still count


def test_host_can_close_voting_early(table):
    table.add("guest")
    table.post("host", "start")
    table.post("host", "voting")
    table.post("host", "vote", suspect="vivian")
    assert table.post("guest", "reveal").status_code == 403
    assert table.post("host", "reveal").status_code == 200
    result = table.get("guest").json()["result"]
    scores = {s["username"]: s for s in result["scores"]}
    assert result["verdict"] == "vivian"  # the only vote cast
    assert scores["guest"] == {"username": "guest", "voted": False, "vote_correct": False, "score": 0}
    assert scores["host"]["score"] == 60  # participation + correct, no evidence found


def test_closing_voting_with_no_votes_is_not_a_tie(table):
    table.to_voting()
    table.post("host", "reveal")
    result = table.get("host").json()["result"]
    assert result["verdict"] is None and result["tie"] is False and result["correct"] is False


def test_replay_resets_everything_but_the_players(table):
    table.add("guest")
    table.post("host", "start")
    table.search_all()
    table.post("host", "voting")
    table.post("host", "vote", suspect="vivian")
    table.post("guest", "vote", suspect="vivian")
    assert table.post("guest", "replay").status_code == 403

    again = table.post("host", "replay").json()
    assert again["phase"] == "lobby" and [p["voted"] for p in again["players"]] == [False, False]
    assert [p["username"] for p in again["players"]] == ["host", "guest"]
    table.post("host", "start")
    assert table.get("host").json()["journal"]["evidence"] == []
    table.post("host", "voting")
    assert table.post("guest", "vote", suspect="elena").status_code == 201  # may vote again


# ---- two players at the same moment ------------------------------------------------------

def test_conflicting_updates_are_retried_not_lost(tmp_path):
    """Someone else saves the room between our read and our write. We must redo our change
    on top of theirs, so both changes survive."""
    engine = create_engine(f"sqlite:///{tmp_path / 'race.db'}")
    Base.metadata.create_all(engine)
    maker = sessionmaker(engine, expire_on_commit=False)
    with maker() as db:
        user = User(username="host", password_hash=hash_password("x" * 8))
        db.add(user)
        db.flush()
        room = Room(code="RACE22", host_id=user.id, phase="lobby", state=Session(CASE).to_dict())
        db.add(room)
        db.flush()
        db.add(RoomMember(room_id=room.id, user_id=user.id))
        db.commit()

    attempts = []

    def my_change(room, session):
        attempts.append(1)
        if len(attempts) == 1:  # the rival saves first, in the middle of our first attempt
            with maker() as rival_db:
                rival_room = rival_db.scalar(select(Room))
                rival = Session.from_dict(CASE, rival_room.state)
                rival.search("study")
                rival_room.state = rival.to_dict()
                rival_db.commit()
        session.search("cellar")

    with maker() as db:
        act(db, "RACE22", db.get(User, 1), {"lobby"}, my_change)

    with maker() as db:
        found = Session.from_dict(CASE, db.scalar(select(Room)).state).found
    assert len(attempts) == 2  # first attempt collided, second succeeded
    assert set(found) == {"watch", "statuette", "ledger_page", "cufflink", "cellar_sheet"}  # nothing lost


def test_a_room_that_never_settles_gives_409_not_a_hang(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'busy.db'}")
    Base.metadata.create_all(engine)
    maker = sessionmaker(engine, expire_on_commit=False)
    with maker() as db:
        user = User(username="host", password_hash=hash_password("x" * 8))
        db.add(user)
        db.flush()
        room = Room(code="BUSY22", host_id=user.id, phase="lobby", state=Session(CASE).to_dict())
        db.add(room)
        db.flush()
        db.add(RoomMember(room_id=room.id, user_id=user.id))
        db.commit()

    def always_collides(room, session):
        with maker() as rival_db:
            r = rival_db.scalar(select(Room))
            flag_modified(r, "state")  # any write moves the version
            rival_db.commit()

    with maker() as db, pytest.raises(HTTPException) as err:
        act(db, "BUSY22", db.get(User, 1), {"lobby"}, always_collides)
    assert err.value.status_code == 409
