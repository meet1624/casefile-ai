import copy

from app.casebook import BUNDLED
from .conftest import register_and_login


def setup(client):
    admin = register_and_login(client, "boss")  # the first account is the admin
    other = register_and_login(client, "player")
    return admin, other


def new_case(client, admin, **changes):
    case = copy.deepcopy(client.get("/admin/cases/midnight-gala", headers=admin).json())
    case.update(id="the-second-case", title="The Second Case", **changes)
    return case


def test_me_says_who_is_admin(client):
    admin, other = setup(client)
    assert client.get("/auth/me", headers=admin).json()["is_admin"] is True
    assert client.get("/auth/me", headers=other).json()["is_admin"] is False


def test_players_cannot_manage_cases(client):
    _, other = setup(client)
    assert client.get("/admin/cases", headers=other).status_code == 403
    assert client.post("/admin/cases", json={"case": {}}, headers=other).status_code == 403
    assert client.get("/admin/cases").status_code == 401


def test_add_validate_and_play_a_custom_case(client):
    admin, other = setup(client)
    case = new_case(client, admin)
    assert client.post("/admin/cases/validate", json={"case": case}, headers=admin).json() == {"ok": True, "problems": []}
    assert client.post("/admin/cases", json={"case": case}, headers=admin).status_code == 201
    assert [c["id"] for c in client.get("/cases", headers=other).json()] == [*(c.id for c in BUNDLED), "the-second-case"]
    room = client.post("/rooms", json={"case_id": "the-second-case"}, headers=other).json()
    assert room["case"]["title"] == "The Second Case"
    assert "solution" not in str(room)


def test_default_room_still_uses_the_built_in_case(client):
    _, other = setup(client)
    assert client.post("/rooms", headers=other).json()["case"]["id"] == "midnight-gala"


def test_broken_cases_are_rejected_with_reasons(client):
    admin, _ = setup(client)
    case = new_case(client, admin)
    case["solution"]["culprit"] = "nobody"
    r = client.post("/admin/cases", json={"case": case}, headers=admin)
    assert r.status_code == 422 and any("nobody" in p for p in r.json()["detail"]["problems"])
    r = client.post("/admin/cases/validate", json={"case": {"id": "x"}}, headers=admin)
    assert r.json()["ok"] is False and r.json()["problems"]


def test_duplicate_and_bad_ids(client):
    admin, _ = setup(client)
    case = new_case(client, admin)
    case["id"] = "midnight-gala"
    assert client.post("/admin/cases", json={"case": case}, headers=admin).status_code == 409
    case["id"] = "Bad Id!"
    assert client.post("/admin/cases", json={"case": case}, headers=admin).status_code == 422


def test_disabled_cases_cannot_start_new_rooms(client):
    admin, other = setup(client)
    client.post("/admin/cases", json={"case": new_case(client, admin)}, headers=admin)
    client.patch("/admin/cases/the-second-case", json={"enabled": False}, headers=admin)
    assert [c["id"] for c in client.get("/cases", headers=other).json()] == [c.id for c in BUNDLED]
    assert client.post("/rooms", json={"case_id": "the-second-case"}, headers=other).status_code == 404


def test_cannot_delete_a_case_rooms_use_or_the_built_in(client):
    admin, other = setup(client)
    client.post("/admin/cases", json={"case": new_case(client, admin)}, headers=admin)
    client.post("/rooms", json={"case_id": "the-second-case"}, headers=other)
    assert client.delete("/admin/cases/the-second-case", headers=admin).status_code == 409
    assert client.delete("/admin/cases/midnight-gala", headers=admin).status_code == 400
    assert client.get("/admin/cases", headers=admin).json()[len(BUNDLED)]["rooms"] == 1


def test_unused_case_can_be_deleted(client):
    admin, _ = setup(client)
    client.post("/admin/cases", json={"case": new_case(client, admin)}, headers=admin)
    assert client.delete("/admin/cases/the-second-case", headers=admin).status_code == 204
    assert len(client.get("/admin/cases", headers=admin).json()) == len(BUNDLED)
