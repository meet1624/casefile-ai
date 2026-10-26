from datetime import datetime, timedelta, timezone

import jwt
import pytest
from sqlalchemy import select

from app.config import SECRET_KEY
from app.db import get_db
from app.main import app
from app.models import User
from app.security import ALGORITHM, create_token, decode_token, hash_password, verify_password

from .conftest import PASSWORD, register_and_login


def test_password_hash_is_salted_and_verifies():
    a, b = hash_password(PASSWORD), hash_password(PASSWORD)
    assert a != b and PASSWORD not in a
    assert verify_password(PASSWORD, a)
    assert not verify_password("wrong-password", a)


def test_register_stores_only_a_hash(client):
    client.post("/auth/register", json={"username": "Meet_1", "password": PASSWORD})
    db = next(app.dependency_overrides[get_db]())
    user = db.scalar(select(User))
    assert user.username == "meet_1"  # case-insensitive usernames
    assert PASSWORD not in user.password_hash


def test_duplicate_username_is_409_even_with_different_case(client):
    body = {"username": "Meet", "password": PASSWORD}
    assert client.post("/auth/register", json=body).status_code == 201
    assert client.post("/auth/register", json={**body, "username": "MEET"}).status_code == 409


@pytest.mark.parametrize("body", [
    {"username": "ab", "password": PASSWORD},
    {"username": "has space", "password": PASSWORD},
    {"username": "x" * 31, "password": PASSWORD},
    {"username": "fine_name", "password": "short"},
    {"username": "fine_name"},
])
def test_bad_registrations_are_422(client, body):
    assert client.post("/auth/register", json=body).status_code == 422


def test_login_failures_look_the_same(client):
    client.post("/auth/register", json={"username": "meet", "password": PASSWORD})
    wrong = client.post("/auth/login", data={"username": "meet", "password": "wrong-password"})
    unknown = client.post("/auth/login", data={"username": "ghost", "password": PASSWORD})
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json() == unknown.json()


def test_me_needs_a_valid_token(client):
    headers = register_and_login(client, "meet")
    assert client.get("/auth/me", headers=headers).json()["username"] == "meet"
    assert client.get("/auth/me").status_code == 401
    assert client.get("/auth/me", headers={"Authorization": "Bearer garbage"}).status_code == 401


def test_expired_and_forged_tokens_are_rejected(client):
    register_and_login(client, "meet")
    expired = jwt.encode({"sub": "1", "exp": datetime.now(timezone.utc) - timedelta(minutes=1)},
                         SECRET_KEY, algorithm=ALGORITHM)
    forged = jwt.encode({"sub": "1"}, "some-other-key-that-is-long-enough-32b", algorithm=ALGORITHM)
    unsigned = jwt.encode({"sub": "1"}, None, algorithm="none")
    for token in (expired, forged, unsigned):
        assert decode_token(token) is None
        assert client.get("/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401


def test_token_for_deleted_user_is_rejected(client):
    assert client.get("/auth/me", headers={"Authorization": f"Bearer {create_token(999)}"}).status_code == 401
