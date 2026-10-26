"""Multiplayer rooms. The team shares one investigation, then everyone votes.

Phases: lobby -> investigation -> voting -> reveal (and replay goes back to lobby).
Non-members cannot tell a room they are not in from a room that does not exist (404).
"""

import asyncio
import secrets

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DbSession
from sqlalchemy.orm.attributes import flag_modified
from sqlalchemy.orm.exc import StaleDataError

from ..ai import get_provider
from ..ai.base import AIProvider
from ..ai.speaker import speak
from ..db import get_db
from ..engine.session import GameError, Session
from ..engine.voting import score_player, verdict
from ..hub import hub, publish
from ..models import Room, RoomMember, User, Vote
from ..casebook import get_case, playable
from ..schemas import AskRequest, CreateRoomRequest, JoinRequest, PresentRequest, SearchRequest, VoteRequest
from ..security import decode_token
from .auth import current_user

router = APIRouter(tags=["rooms"])

MAX_PLAYERS = 6
CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no 0/O or 1/I, easy to read out loud
RETRIES = 5


# ---- helpers -----------------------------------------------------------------------------

def find_room(db: DbSession, code: str, user: User) -> Room:
    room = db.scalar(select(Room).where(Room.code == code.upper()))
    if room is None or db.get(RoomMember, (room.id, user.id)) is None:
        raise HTTPException(404, "room not found")
    return room


def case_of(db: DbSession, room: Room):
    case = get_case(db, room.case_id)
    if case is None:  # only if someone deleted a case straight from the database
        raise HTTPException(500, "this room's case is missing")
    return case


def transact(db: DbSession, run):
    """Run `run()` then commit. If another request changed the room in between (StaleDataError),
    throw this attempt away and run it again on the fresh data."""
    for _ in range(RETRIES):
        try:
            result = run()
            db.commit()
            return result
        except StaleDataError:
            db.rollback()
    raise HTTPException(409, "the room is busy, please try again")


def act(db: DbSession, code: str, user: User, phases: set[str], change, host_only: bool = False):
    """Load the room, check access and phase, apply one change to the shared investigation, save.
    `change(room, session)` may change the room, the session, or votes. Returns (room, its result)."""

    def run():
        room = find_room(db, code, user)
        if room.phase not in phases:
            raise HTTPException(409, f"not possible during the {room.phase} phase")
        if host_only and room.host_id != user.id:
            raise HTTPException(403, "only the host can do that")
        session = Session.from_dict(case_of(db, room), room.state)
        try:
            result = change(room, session)
        except GameError as err:
            raise HTTPException(400, str(err)) from err
        room.state = session.to_dict()
        flag_modified(room, "state")  # always write, so the version moves and concurrent changes collide
        return room, result

    return transact(db, run)


def result_of(db: DbSession, room: Room) -> dict:
    """The final reveal. Only ever built once the room is in the reveal phase."""
    case = case_of(db, room)
    found = Session.from_dict(case, room.state).found
    votes = dict(db.execute(
        select(User.username, Vote.suspect_id).join(Vote, Vote.user_id == User.id).where(Vote.room_id == room.id)
    ).all())
    players = [u for u, in db.execute(
        select(User.username).join(RoomMember, RoomMember.user_id == User.id)
        .where(RoomMember.room_id == room.id).order_by(RoomMember.joined_at, User.id))]
    winner = verdict(votes)
    sol = case.solution
    return {
        "verdict": winner,
        "tie": winner is None and bool(votes),
        "correct": winner == sol.culprit,
        "solution": {"culprit": sol.culprit, "motive": sol.motive, "method": sol.method,
                     "explanation": sol.explanation},
        "votes": [{"username": u, "suspect": s} for u, s in votes.items()],
        "scores": [{"username": u, **score_player(case, found, votes.get(u))} for u in players],
        "key_evidence_found": f"{sum(e in found for e in sol.key_evidence)}/{len(sol.key_evidence)}",
    }


def view(db: DbSession, room: Room) -> dict:
    """What any member may see. Nothing about the solution before the reveal, and nobody's
    vote is shown until then (only who has voted)."""
    members = db.execute(
        select(User.id, User.username).join(RoomMember, RoomMember.user_id == User.id)
        .where(RoomMember.room_id == room.id).order_by(RoomMember.joined_at, User.id)).all()
    voted = set(db.scalars(select(Vote.user_id).where(Vote.room_id == room.id)))
    online = hub.online(room.code)
    case = case_of(db, room)
    out = {
        "code": room.code,
        "phase": room.phase,
        "host": next(name for uid, name in members if uid == room.host_id),
        "players": [{"username": name, "online": name in online, "voted": uid in voted}
                    for uid, name in members],
        "case": case.public_briefing(),
    }
    if room.phase != "lobby":
        out["journal"] = Session.from_dict(case, room.state).journal()
    if room.phase == "reveal":
        out["result"] = result_of(db, room)
    return out


# ---- creating and joining ----------------------------------------------------------------

@router.post("/rooms", status_code=201)
def create_room(body: CreateRoomRequest | None = None, user: User = Depends(current_user),
                db: DbSession = Depends(get_db)):
    chosen = next((c for c in playable(db) if body is None or c.id == body.case_id), None)
    if chosen is None:
        raise HTTPException(404, "that case is not available")
    for _ in range(RETRIES):
        code = "".join(secrets.choice(CODE_ALPHABET) for _ in range(6))
        room = Room(code=code, host_id=user.id, phase="lobby", case_id=chosen.id, state=Session(chosen).to_dict())
        db.add(room)
        try:
            db.flush()  # the unique code is checked here
        except IntegrityError:
            db.rollback()
            continue
        db.add(RoomMember(room_id=room.id, user_id=user.id))
        db.commit()
        return view(db, room)
    raise HTTPException(500, "could not create a room, try again")


@router.get("/rooms")
def my_rooms(user: User = Depends(current_user), db: DbSession = Depends(get_db)):
    rows = db.execute(
        select(Room.code, Room.phase, func.count(RoomMember.user_id))
        .join(RoomMember, RoomMember.room_id == Room.id)
        .where(Room.id.in_(select(RoomMember.room_id).where(RoomMember.user_id == user.id)))
        .group_by(Room.id).order_by(Room.id.desc())).all()
    return [{"code": c, "phase": p, "players": n} for c, p, n in rows]


@router.post("/rooms/join")
def join_room(body: JoinRequest, user: User = Depends(current_user), db: DbSession = Depends(get_db)):
    def run():
        room = db.scalar(select(Room).where(Room.code == body.code.upper()))
        if room is None:
            raise HTTPException(404, "room not found")
        if db.get(RoomMember, (room.id, user.id)) is not None:
            return room, False  # joining twice is harmless
        if room.phase in ("voting", "reveal"):
            raise HTTPException(409, "voting has started, the room is closed to new players")
        if db.scalar(select(func.count()).select_from(RoomMember).where(RoomMember.room_id == room.id)) >= MAX_PLAYERS:
            raise HTTPException(409, f"the room is full ({MAX_PLAYERS} players)")
        db.add(RoomMember(room_id=room.id, user_id=user.id))
        flag_modified(room, "state")  # moves the version, so two last-seat joins cannot both succeed
        return room, True

    room, joined = transact(db, run)
    if joined:
        publish(room.code, {"type": "player_joined", "username": user.username})
    return view(db, room)


@router.get("/rooms/{code}")
def get_room(code: str, user: User = Depends(current_user), db: DbSession = Depends(get_db)):
    return view(db, find_room(db, code, user))


# ---- phases (host only) ------------------------------------------------------------------

def _move(code: str, user: User, db: DbSession, phases: set[str], to: str, extra=None):
    def change(room, session):
        room.phase = to
        if extra:
            extra(room, session)

    room, _ = act(db, code, user, phases, change, host_only=True)
    event = {"type": "phase", "phase": to}
    if to == "reveal":
        event["result"] = result_of(db, room)
    publish(room.code, event)
    return view(db, room)


@router.post("/rooms/{code}/start")
def start(code: str, user: User = Depends(current_user), db: DbSession = Depends(get_db)):
    return _move(code, user, db, {"lobby"}, "investigation")


@router.post("/rooms/{code}/voting")
def open_voting(code: str, user: User = Depends(current_user), db: DbSession = Depends(get_db)):
    return _move(code, user, db, {"investigation"}, "voting")


@router.post("/rooms/{code}/reveal")
def reveal(code: str, user: User = Depends(current_user), db: DbSession = Depends(get_db)):
    """Close voting now, even if some players have not voted."""
    return _move(code, user, db, {"voting"}, "reveal")


@router.post("/rooms/{code}/replay")
def replay(code: str, user: User = Depends(current_user), db: DbSession = Depends(get_db)):
    """Same room and players, fresh investigation and no votes."""
    def reset(room, session):
        session.restart()
        db.execute(delete(Vote).where(Vote.room_id == room.id))

    return _move(code, user, db, {"reveal"}, "lobby", extra=reset)


# ---- investigating (any member, investigation phase only) --------------------------------

@router.post("/rooms/{code}/search")
def room_search(code: str, body: SearchRequest, user: User = Depends(current_user),
                db: DbSession = Depends(get_db)):
    room, found = act(db, code, user, {"investigation"}, lambda r, s: s.search(body.location))
    evidence = [e.model_dump() for e in found]
    if evidence:
        publish(room.code, {"type": "evidence_found", "by": user.username, "evidence": evidence})
    return {"found": evidence}


@router.post("/rooms/{code}/ask")
def room_ask(code: str, body: AskRequest, user: User = Depends(current_user),
             db: DbSession = Depends(get_db), provider: AIProvider = Depends(get_provider)):
    room, fact = act(db, code, user, {"investigation"}, lambda r, s: s.ask(body.suspect, body.topic))
    answer, source = speak(case_of(db, room), case_of(db, room).suspect(body.suspect), fact, body.question, provider)
    publish(room.code, {"type": "statement", "by": user.username, "suspect": body.suspect,
                        "topic": body.topic, "answer": answer, "source": source})
    return {"suspect": body.suspect, "topic": body.topic, "answer": answer, "source": source}


@router.post("/rooms/{code}/present")
def room_present(code: str, body: PresentRequest, user: User = Depends(current_user),
                 db: DbSession = Depends(get_db), provider: AIProvider = Depends(get_provider)):
    room, fact = act(db, code, user, {"investigation"}, lambda r, s: s.present(body.suspect, body.evidence))
    answer, source = speak(case_of(db, room), case_of(db, room).suspect(body.suspect), fact, None, provider)
    publish(room.code, {"type": "statement", "by": user.username, "suspect": body.suspect,
                        "evidence": body.evidence, "answer": answer, "source": source})
    return {"suspect": body.suspect, "evidence": body.evidence, "answer": answer, "source": source}


# ---- voting ------------------------------------------------------------------------------

@router.post("/rooms/{code}/vote", status_code=201)
def vote(code: str, body: VoteRequest, user: User = Depends(current_user), db: DbSession = Depends(get_db)):
    def cast(room, session):
        if session.case.suspect(body.suspect) is None:
            raise GameError(f"unknown suspect '{body.suspect}'")
        if db.get(Vote, (room.id, user.id)) is not None:
            raise HTTPException(409, "you have already voted")
        db.add(Vote(room_id=room.id, user_id=user.id, suspect_id=body.suspect))
        try:
            db.flush()
        except IntegrityError:  # a double-click that raced past the check above
            db.rollback()
            raise HTTPException(409, "you have already voted") from None
        cast_votes = db.scalar(select(func.count()).select_from(Vote).where(Vote.room_id == room.id))
        players = db.scalar(select(func.count()).select_from(RoomMember).where(RoomMember.room_id == room.id))
        if cast_votes == players:
            room.phase = "reveal"  # everyone has voted
        return cast_votes, players

    room, (cast_votes, players) = act(db, code, user, {"voting"}, cast)
    publish(room.code, {"type": "vote_cast", "username": user.username,
                        "votes_cast": cast_votes, "players": players})  # never who they voted for
    if room.phase == "reveal":
        publish(room.code, {"type": "phase", "phase": "reveal", "result": result_of(db, room)})
    return {"votes_cast": cast_votes, "players": players, "phase": room.phase}


# ---- live updates ------------------------------------------------------------------------

def _user_for_token(db: DbSession, token) -> User | None:
    user_id = decode_token(token) if isinstance(token, str) else None
    return db.get(User, user_id) if user_id is not None else None


def _member_room(db: DbSession, code: str, user: User) -> Room | None:
    room = db.scalar(select(Room).where(Room.code == code.upper()))
    return room if room and db.get(RoomMember, (room.id, user.id)) else None


@router.websocket("/ws/rooms/{code}")
async def room_socket(ws: WebSocket, code: str, db: DbSession = Depends(get_db)):
    """Connect, then send {"token": "<login token>"} as the first message (so the token never
    appears in a URL). You then get the full room state, and an event for every change.
    Reconnecting is safe: you always start from a fresh full state."""
    await ws.accept()
    try:
        token = (await asyncio.wait_for(ws.receive_json(), timeout=5))["token"]
    except (asyncio.TimeoutError, WebSocketDisconnect, ValueError, KeyError, TypeError):
        await ws.close(code=4401)
        return
    user = await run_in_threadpool(_user_for_token, db, token)
    if user is None:
        await ws.close(code=4401)  # not logged in
        return
    room = await run_in_threadpool(_member_room, db, code, user)
    if room is None:
        await ws.close(code=4403)  # no such room, or you are not in it (same answer for both)
        return

    snapshot = await run_in_threadpool(view, db, room)
    await run_in_threadpool(db.close)  # give the connection back: a socket can stay open for hours
    hub.add(room.code, user.username, ws)
    try:
        await ws.send_json({"type": "state", "room": snapshot})
        await hub.broadcast(room.code, hub.presence(room.code))
        while True:
            await ws.receive_text()  # clients only listen; this just notices when they leave
    except WebSocketDisconnect:
        pass
    finally:
        hub.remove(room.code, user.username, ws)
        await hub.broadcast(room.code, hub.presence(room.code))
