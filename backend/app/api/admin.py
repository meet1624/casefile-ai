"""Case management for admins, and the public list of playable cases."""

import json
import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session as DbSession

from ..casebook import BUILTIN, BUNDLED, check, get_case, playable
from ..config import ADMIN_USERNAMES
from ..db import get_db
from ..models import CaseRecord, Room, User
from .auth import current_user

router = APIRouter(tags=["admin"])

MAX_CASE_BYTES = 100_000
ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]{2,39}$")


def is_admin(db: DbSession, user: User) -> bool:
    if ADMIN_USERNAMES:
        return user.username in ADMIN_USERNAMES
    return user.id == db.scalar(select(func.min(User.id)))


def require_admin(user: User = Depends(current_user), db: DbSession = Depends(get_db)) -> User:
    if not is_admin(db, user):
        raise HTTPException(403, "admins only")
    return user


class CaseBody(BaseModel):
    case: dict


class EnabledBody(BaseModel):
    enabled: bool


def _parsed(body: CaseBody):
    if len(json.dumps(body.case)) > MAX_CASE_BYTES:
        raise HTTPException(413, "that case file is too large")
    return check(body.case)


@router.get("/cases")
def list_playable(user: User = Depends(current_user), db: DbSession = Depends(get_db)):
    return [{"id": c.id, "title": c.title, "setting": c.setting, "suspects": len(c.suspects)} for c in playable(db)]


@router.get("/admin/cases", dependencies=[Depends(require_admin)])
def list_cases(db: DbSession = Depends(get_db)):
    used = dict(db.execute(select(Room.case_id, func.count()).group_by(Room.case_id)).all())
    rows = [{"id": c.id, "title": c.title, "builtin": True, "enabled": True,
             "problems": c.problems(), "rooms": used.get(c.id, 0)} for c in BUNDLED]
    for r in db.scalars(select(CaseRecord).order_by(CaseRecord.created_at)):
        _, problems = check(r.data)
        rows.append({"id": r.id, "title": r.title, "builtin": False, "enabled": r.enabled,
                     "problems": problems, "rooms": used.get(r.id, 0)})
    return rows


@router.get("/admin/cases/{case_id}", dependencies=[Depends(require_admin)])
def read_case(case_id: str, db: DbSession = Depends(get_db)):
    case = get_case(db, case_id)
    if case is None:
        raise HTTPException(404, "no such case")
    return case.model_dump()


@router.post("/admin/cases/validate", dependencies=[Depends(require_admin)])
def validate(body: CaseBody):
    case, problems = _parsed(body)
    return {"ok": case is not None and not problems, "problems": problems}


@router.post("/admin/cases", status_code=201, dependencies=[Depends(require_admin)])
def add_case(body: CaseBody, db: DbSession = Depends(get_db)):
    case, problems = _parsed(body)
    if case is None or problems:
        raise HTTPException(422, {"message": "the case has problems", "problems": problems})
    if not ID_PATTERN.match(case.id):
        raise HTTPException(422, {"message": "bad id", "problems": ["id: use 3 to 40 lowercase letters, digits or dashes"]})
    if get_case(db, case.id) is not None:
        raise HTTPException(409, f"a case with id '{case.id}' already exists")
    db.add(CaseRecord(id=case.id, title=case.title, data=case.model_dump(), enabled=True))
    db.commit()
    return {"id": case.id}


def _custom(db: DbSession, case_id: str) -> CaseRecord:
    row = db.get(CaseRecord, case_id)
    if row is None:
        raise HTTPException(404 if all(c.id != case_id for c in BUNDLED) else 400, "no such custom case" if all(c.id != case_id for c in BUNDLED) else "the built-in case cannot be changed")
    return row


@router.patch("/admin/cases/{case_id}", dependencies=[Depends(require_admin)])
def set_enabled(case_id: str, body: EnabledBody, db: DbSession = Depends(get_db)):
    row = _custom(db, case_id)
    row.enabled = body.enabled
    db.commit()
    return {"id": row.id, "enabled": row.enabled}


@router.delete("/admin/cases/{case_id}", status_code=204, dependencies=[Depends(require_admin)])
def delete_case(case_id: str, db: DbSession = Depends(get_db)):
    row = _custom(db, case_id)
    if db.scalar(select(func.count()).select_from(Room).where(Room.case_id == case_id)):
        raise HTTPException(409, "rooms already use this case. Disable it instead.")
    db.delete(row)
    db.commit()
