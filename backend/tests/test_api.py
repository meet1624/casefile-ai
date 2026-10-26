import pytest

from .conftest import register_and_login


@pytest.fixture
def gid(client, auth):
    r = client.post("/games", headers=auth)
    assert r.status_code == 201
    return r.json()["game_id"]


@pytest.fixture
def post(client, auth):
    def _post(gid, path, **body):
        return client.post(f"/games/{gid}/{path}", json=body, headers=auth)
    return _post


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_game_routes_require_login(client, gid):
    assert client.post("/games").status_code == 401
    assert client.get(f"/games/{gid}/journal").status_code == 401
    assert client.post(f"/games/{gid}/search", json={"location": "study"}).status_code == 401
    assert client.get("/case").status_code == 200  # the briefing is public


def test_no_private_data_before_the_reveal(client, auth, gid, post):
    post(gid, "search", location="study")
    post(gid, "ask", suspect="tomas", topic="whereabouts")
    texts = [
        client.get("/case").text,
        client.post("/games", headers=auth).text,
        client.get(f"/games/{gid}/journal", headers=auth).text,
    ]
    for text in texts:
        assert "solution" not in text and "culprit" not in text
        assert "secret" not in text and "motive" not in text


def test_search_ask_present_flow(gid, post):
    assert len(post(gid, "search", location="cellar").json()["found"]) == 1
    assert post(gid, "search", location="cellar").json()["found"] == []
    first = post(gid, "ask", suspect="tomas", topic="whereabouts").json()["answer"]
    assert "kitchen" in first
    post(gid, "present", suspect="tomas", evidence="cellar_sheet")
    assert "Ms. Cross" in post(gid, "ask", suspect="tomas", topic="whereabouts").json()["answer"]


def test_state_survives_between_requests(client, auth, gid, post):
    post(gid, "search", location="service corridor")
    post(gid, "ask", suspect="vivian", topic="whereabouts")
    journal = client.get(f"/games/{gid}/journal", headers=auth).json()
    assert [e["id"] for e in journal["evidence"]] == ["service_door_log"]
    assert journal["contradictions"][0]["suspect"] == "vivian"


def test_games_of_one_user_are_separate(client, auth):
    a = client.post("/games", headers=auth).json()["game_id"]
    b = client.post("/games", headers=auth).json()["game_id"]
    client.post(f"/games/{a}/search", json={"location": "study"}, headers=auth)
    assert client.get(f"/games/{a}/journal", headers=auth).json()["evidence"] != []
    assert client.get(f"/games/{b}/journal", headers=auth).json()["evidence"] == []


def test_other_users_cannot_touch_my_game(client, auth, gid):
    other = register_and_login(client, "intruder")
    missing = client.get("/games/nope/journal", headers=other)
    assert missing.status_code == 404
    for response in (
        client.get(f"/games/{gid}/journal", headers=other),
        client.post(f"/games/{gid}/search", json={"location": "study"}, headers=other),
        client.post(f"/games/{gid}/accuse", json={"suspect": "vivian"}, headers=other),
    ):
        assert response.status_code == 404
        assert response.json() == missing.json()  # indistinguishable from a game that does not exist
    # and the intruder's attempts changed nothing
    assert client.get(f"/games/{gid}/journal", headers=auth).json()["evidence"] == []


def test_unknown_game_is_404(client, auth):
    assert client.get("/games/nope/journal", headers=auth).status_code == 404
    assert client.post("/games/nope/search", json={"location": "study"}, headers=auth).status_code == 404


@pytest.mark.parametrize("path,body", [
    ("search", {"location": "attic"}),
    ("ask", {"suspect": "nobody", "topic": "whereabouts"}),
    ("ask", {"suspect": "tomas", "topic": "weather"}),
    ("present", {"suspect": "tomas", "evidence": "cellar_sheet"}),  # not found yet
    ("accuse", {"suspect": "nobody"}),
])
def test_rule_violations_are_400(gid, post, path, body):
    assert post(gid, path, **body).status_code == 400


@pytest.mark.parametrize("path,body", [
    ("search", {}),
    ("search", {"location": ""}),
    ("search", {"location": "x" * 51}),
    ("ask", {"suspect": "tomas"}),
    ("accuse", {"suspect": 5}),
])
def test_malformed_bodies_are_422(gid, post, path, body):
    assert post(gid, path, **body).status_code == 422


def test_full_game_and_locked_afterwards(client, auth, gid, post):
    for loc in ("study", "ballroom", "cellar", "service corridor"):
        post(gid, "search", location=loc)
    post(gid, "ask", suspect="vivian", topic="whereabouts")

    result = post(gid, "accuse", suspect="vivian").json()
    assert result["correct"] is True and result["score"] == 100
    assert "keycard" in result["explanation"]

    assert post(gid, "accuse", suspect="marcus").status_code == 400
    assert post(gid, "search", location="study").status_code == 400
    # the finished game is still readable
    assert client.get(f"/games/{gid}/journal", headers=auth).status_code == 200


# ---- AI layer through the API ------------------------------------------------------------

from app.ai import get_provider  # noqa: E402
from app.main import app  # noqa: E402

from .test_speaker import Fake  # noqa: E402

WORDED = "I spent the whole night in the kitchen, running the service line."


def use(provider):
    app.dependency_overrides[get_provider] = lambda: provider


def test_ai_answer_is_shown_but_the_journal_keeps_the_official_wording(client, auth, gid, post):
    use(Fake(WORDED))
    body = post(gid, "ask", suspect="tomas", topic="whereabouts", question="Where were you?").json()
    assert body["answer"] == WORDED and body["source"] == "ai"
    journal = client.get(f"/games/{gid}/journal", headers=auth).json()
    assert journal["statements"][0]["text"] == "I was in the kitchen running the service line all night."


def test_game_still_works_when_the_model_is_down(post, gid):
    from app.ai.base import AIError
    use(Fake(AIError("ollama not running")))
    body = post(gid, "ask", suspect="tomas", topic="whereabouts").json()
    assert body["source"] == "scripted" and "kitchen" in body["answer"]


def test_mock_default_is_scripted(post, gid):
    assert post(gid, "ask", suspect="tomas", topic="whereabouts").json()["source"] == "scripted"


def test_present_goes_through_the_ai_layer_too(post, gid):
    post(gid, "search", location="cellar")
    use(Fake("Please... don't tell the owners about this."))
    body = post(gid, "present", suspect="tomas", evidence="cellar_sheet").json()
    assert body["source"] == "ai" and "owners" in body["answer"]


@pytest.mark.parametrize("question", ["x" * 201, 5, ["a"]])
def test_bad_questions_are_422(post, gid, question):
    assert post(gid, "ask", suspect="tomas", topic="whereabouts", question=question).status_code == 422


def test_ai_status(client):
    assert client.get("/ai/status").json()["provider"] == "mock"
