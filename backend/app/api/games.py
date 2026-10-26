"""HTTP layer. Thin: it validates input and delegates every rule to the engine.

Every game route needs a login, and a game can only be reached by the user who created it.
"""

from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DbSession

from ..ai import get_provider
from ..ai.base import AIProvider
from ..ai.speaker import speak
from ..db import get_db
from ..engine.case_models import load_case
from ..engine.session import GameError, Session
from ..models import Game, User
from ..schemas import AccuseRequest, AskRequest, PresentRequest, SearchRequest
from .auth import current_user

CASE = load_case(Path(__file__).parent.parent / "cases" / "the_midnight_gala.json")

router = APIRouter()


def play(game_id: str, user: User, db: DbSession, action):
    """Load the user's game, run one engine action, save the new state.

    Someone else's game looks exactly like a missing one (404), so ids cannot be probed.
    shortcut: two simultaneous requests on one game can overwrite each other, add row locking later.
    """
    row = db.get(Game, game_id)
    if row is None or row.user_id != user.id:
        raise HTTPException(404, "game not found")
    session = Session.from_dict(CASE, row.state)
    try:
        result = action(session)
    except GameError as err:
        raise HTTPException(400, str(err)) from err
    row.state = session.to_dict()
    db.commit()
    return result


@router.get("/case")
def case_briefing():
    return CASE.public_briefing()


@router.post("/games", status_code=201)
def new_game(user: User = Depends(current_user), db: DbSession = Depends(get_db)):
    game_id = uuid4().hex
    db.add(Game(id=game_id, user_id=user.id, case_id=CASE.id, state=Session(CASE).to_dict()))
    db.commit()
    return {"game_id": game_id, "case": CASE.public_briefing()}


@router.post("/games/{game_id}/search")
def search(game_id: str, body: SearchRequest, user: User = Depends(current_user),
           db: DbSession = Depends(get_db)):
    found = play(game_id, user, db, lambda g: g.search(body.location))
    return {"found": [e.model_dump() for e in found]}


@router.post("/games/{game_id}/ask")
def ask(game_id: str, body: AskRequest, user: User = Depends(current_user),
        db: DbSession = Depends(get_db), provider: AIProvider = Depends(get_provider)):
    fact = play(game_id, user, db, lambda g: g.ask(body.suspect, body.topic))
    answer, source = speak(CASE, CASE.suspect(body.suspect), fact, body.question, provider)
    return {"suspect": body.suspect, "topic": body.topic, "answer": answer, "source": source}


@router.post("/games/{game_id}/present")
def present(game_id: str, body: PresentRequest, user: User = Depends(current_user),
            db: DbSession = Depends(get_db), provider: AIProvider = Depends(get_provider)):
    fact = play(game_id, user, db, lambda g: g.present(body.suspect, body.evidence))
    answer, source = speak(CASE, CASE.suspect(body.suspect), fact, None, provider)
    return {"suspect": body.suspect, "evidence": body.evidence, "answer": answer, "source": source}


@router.get("/games/{game_id}/journal")
def journal(game_id: str, user: User = Depends(current_user), db: DbSession = Depends(get_db)):
    return play(game_id, user, db, lambda g: g.journal())


@router.post("/games/{game_id}/accuse")
def accuse(game_id: str, body: AccuseRequest, user: User = Depends(current_user),
           db: DbSession = Depends(get_db)):
    return play(game_id, user, db, lambda g: g.accuse(body.suspect))
