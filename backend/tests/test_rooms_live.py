import asyncio

import pytest
from starlette.websockets import WebSocketDisconnect

from app.hub import RoomHub

from .conftest import register_and_login
from .test_rooms import Table


def token(headers) -> str:
    return headers["Authorization"].split()[1]


def connect(table, who):
    """Open a socket for `who`, log in, and swallow the two opening messages."""
    ws = table.client.websocket_connect(f"/ws/rooms/{table.code}")
    return ws


def open_socket(stack, table, who):
    ws = stack.enter_context(connect(table, who))
    ws.send_json({"token": token(table.headers[who])})
    state = ws.receive_json()
    assert state["type"] == "state" and state["room"]["code"] == table.code
    return ws, state["room"]


@pytest.fixture
def stack():
    from contextlib import ExitStack
    with ExitStack() as s:
        yield s


# ---- who may connect ---------------------------------------------------------------------

def refused(client, code, first_message):
    with pytest.raises(WebSocketDisconnect) as err:
        with client.websocket_connect(f"/ws/rooms/{code}") as ws:
            if first_message is not None:
                ws.send_json(first_message)
            ws.receive_json()
    return err.value.code


def test_connection_needs_a_valid_login(client):
    table = Table(client)
    assert refused(client, table.code, {"token": "garbage"}) == 4401
    assert refused(client, table.code, {"nothing": "useful"}) == 4401
    assert refused(client, table.code, {"token": 12345}) == 4401


def test_non_members_and_unknown_rooms_are_refused_the_same_way(client):
    table = Table(client)
    outsider = register_and_login(client, "outsider")
    assert refused(client, table.code, {"token": token(outsider)}) == 4403
    assert refused(client, "ZZZZZZ", {"token": token(outsider)}) == 4403
    assert refused(client, "ZZZZZZ", {"token": token(table.headers["host"])}) == 4403


# ---- what a connected player receives ----------------------------------------------------

def test_connecting_gives_full_state_then_presence(client, stack):
    table = Table(client)
    ws, room = open_socket(stack, table, "host")
    assert room["phase"] == "lobby" and room["players"][0]["username"] == "host"
    assert ws.receive_json() == {"type": "presence", "online": ["host"]}
    assert table.get("host").json()["players"][0]["online"] is True  # REST sees presence too


def test_events_reach_everyone_in_the_room(client, stack):
    table = Table(client)
    host_ws, _ = open_socket(stack, table, "host")
    host_ws.receive_json()  # own presence
    table.add("guest")
    assert host_ws.receive_json() == {"type": "player_joined", "username": "guest"}
    guest_ws, _ = open_socket(stack, table, "guest")
    guest_ws.receive_json()  # own presence
    assert host_ws.receive_json() == {"type": "presence", "online": ["guest", "host"]}

    table.post("host", "start")
    for ws in (host_ws, guest_ws):
        assert ws.receive_json() == {"type": "phase", "phase": "investigation"}

    table.post("guest", "search", location="cellar")
    for ws in (host_ws, guest_ws):
        event = ws.receive_json()
        assert event["type"] == "evidence_found" and event["by"] == "guest"
        assert event["evidence"][0]["id"] == "cellar_sheet"

    table.post("host", "ask", suspect="tomas", topic="whereabouts")
    for ws in (host_ws, guest_ws):
        event = ws.receive_json()
        assert event["type"] == "statement" and event["by"] == "host" and "kitchen" in event["answer"]


def test_votes_are_announced_without_saying_who_for_and_the_reveal_follows(client, stack):
    table = Table(client)
    table.add("guest")
    table.to_voting()
    ws, _ = open_socket(stack, table, "guest")
    ws.receive_json()  # presence

    table.post("host", "vote", suspect="vivian")
    assert ws.receive_json() == {"type": "vote_cast", "username": "host", "votes_cast": 1, "players": 2}
    table.post("guest", "vote", suspect="marcus")
    assert ws.receive_json() == {"type": "vote_cast", "username": "guest", "votes_cast": 2, "players": 2}
    reveal = ws.receive_json()
    assert reveal["type"] == "phase" and reveal["phase"] == "reveal"
    assert reveal["result"]["solution"]["culprit"] == "vivian"


def test_no_solution_travels_over_the_socket_before_the_reveal(client, stack):
    table = Table(client)
    ws, snapshot = open_socket(stack, table, "host")
    assert "result" not in snapshot and "culprit" not in str(snapshot)
    ws.receive_json()
    table.post("host", "start")
    assert "culprit" not in str(ws.receive_json())


def test_leaving_updates_presence(client, stack):
    table = Table(client)
    table.add("guest")
    host_ws, _ = open_socket(stack, table, "host")
    host_ws.receive_json()
    with client.websocket_connect(f"/ws/rooms/{table.code}") as guest_ws:
        guest_ws.send_json({"token": token(table.headers["guest"])})
        guest_ws.receive_json()
        assert host_ws.receive_json() == {"type": "presence", "online": ["guest", "host"]}
    assert host_ws.receive_json() == {"type": "presence", "online": ["host"]}  # guest left


def test_reconnecting_catches_up_on_everything_missed(client, stack):
    table = Table(client)
    table.add("guest")
    table.post("host", "start")
    with client.websocket_connect(f"/ws/rooms/{table.code}") as ws:
        ws.send_json({"token": token(table.headers["guest"])})
        assert ws.receive_json()["room"]["journal"]["evidence"] == []
    # the guest is offline while the host keeps playing
    table.post("host", "search", location="cellar")
    table.post("host", "ask", suspect="tomas", topic="whereabouts")
    with client.websocket_connect(f"/ws/rooms/{table.code}") as ws:
        ws.send_json({"token": token(table.headers["guest"])})
        journal = ws.receive_json()["room"]["journal"]
    assert [e["id"] for e in journal["evidence"]] == ["cellar_sheet"]
    assert journal["statements"][0]["suspect"] == "tomas"


# ---- the hub itself ----------------------------------------------------------------------

class FakeSocket:
    def __init__(self, broken=False):
        self.sent, self.broken = [], broken

    async def send_json(self, event):
        if self.broken:
            raise RuntimeError("connection is gone")
        self.sent.append(event)


def test_hub_only_reaches_its_own_room_and_drops_dead_sockets():
    hub = RoomHub()
    ann, bob, dead = FakeSocket(), FakeSocket(), FakeSocket(broken=True)
    hub.add("AAAAAA", "ann", ann)
    hub.add("AAAAAA", "dave", dead)
    hub.add("BBBBBB", "bob", bob)

    asyncio.run(hub.broadcast("AAAAAA", {"n": 1}))
    assert ann.sent == [{"n": 1}] and bob.sent == []  # room B heard nothing
    assert hub.online("AAAAAA") == {"ann"}  # the broken connection was removed
    assert hub.online("BBBBBB") == {"bob"}
    asyncio.run(hub.broadcast("ZZZZZZ", {"n": 2}))  # nobody there: not an error


def test_hub_keeps_a_user_online_until_their_last_tab_closes():
    hub = RoomHub()
    tab1, tab2 = FakeSocket(), FakeSocket()
    hub.add("AAAAAA", "ann", tab1)
    hub.add("AAAAAA", "ann", tab2)
    hub.remove("AAAAAA", "ann", tab1)
    assert hub.online("AAAAAA") == {"ann"}
    hub.remove("AAAAAA", "ann", tab2)
    assert hub.online("AAAAAA") == set()
