from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DbSession

from ..db import get_db
from ..models import User
from ..ratelimit import login_failures, registrations
from ..schemas import RegisterRequest
from ..security import DUMMY_HASH, create_token, decode_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2 = OAuth2PasswordBearer(tokenUrl="/auth/login")


def current_user(token: str = Depends(oauth2), db: DbSession = Depends(get_db)) -> User:
    user_id = decode_token(token)
    user = db.get(User, user_id) if user_id is not None else None
    if user is None:
        raise HTTPException(401, "invalid or expired token", headers={"WWW-Authenticate": "Bearer"})
    return user


@router.post("/register", status_code=201)
def register(body: RegisterRequest, request: Request, db: DbSession = Depends(get_db)):
    ip = request.client.host if request.client else "?"
    registrations.check(ip)
    registrations.hit(ip)
    user = User(username=body.username.lower(), password_hash=hash_password(body.password))
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "username already taken") from None
    return {"id": user.id, "username": user.username}


@router.post("/login")
def login(request: Request, form: OAuth2PasswordRequestForm = Depends(), db: DbSession = Depends(get_db)):
    key = f"{request.client.host if request.client else '?'}|{form.username.lower()}"
    login_failures.check(key)
    user = db.scalar(select(User).where(User.username == form.username.lower()))
    ok = verify_password(form.password, user.password_hash if user else DUMMY_HASH)
    if not (user and ok):
        login_failures.hit(key)
        raise HTTPException(401, "wrong username or password", headers={"WWW-Authenticate": "Bearer"})
    login_failures.reset(key)
    return {"access_token": create_token(user.id), "token_type": "bearer"}


@router.get("/me")
def me(user: User = Depends(current_user), db: DbSession = Depends(get_db)):
    from .admin import is_admin  # imported here: admin.py imports this module
    return {"id": user.id, "username": user.username, "is_admin": is_admin(db, user)}
