"""Finding cases: the built-in one (a file) plus any an admin added (database)."""

from pathlib import Path

from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from .api.games import CASE as BUILTIN
from .engine.case_models import Case
from .models import CaseRecord

# Every .json file in app/cases ships with the game and is playable by everyone.
_DIR = Path(__file__).parent / "cases"
BUNDLED = [BUILTIN, *(c for c in (Case.model_validate_json(p.read_text(encoding="utf-8")) for p in sorted(_DIR.glob("*.json"))) if c.id != BUILTIN.id)]


def get_case(db: DbSession, case_id: str) -> Case | None:
    for c in BUNDLED:
        if c.id == case_id:
            return c
    row = db.get(CaseRecord, case_id)
    return Case.model_validate(row.data) if row else None


def playable(db: DbSession) -> list[Case]:
    rows = db.scalars(select(CaseRecord).where(CaseRecord.enabled).order_by(CaseRecord.created_at)).all()
    return [*BUNDLED, *(Case.model_validate(r.data) for r in rows)]


def check(raw: dict) -> tuple[Case | None, list[str]]:
    """Parse and check a case. Returns (case, problems); the case is None if it did not even parse."""
    try:
        case = Case.model_validate(raw)
    except ValidationError as err:
        return None, [f"{'.'.join(str(x) for x in e['loc'])}: {e['msg']}" for e in err.errors()]
    return case, case.problems()
