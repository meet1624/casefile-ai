"""Password hashing (stdlib scrypt) and JWT tokens."""

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

import jwt

from .config import SECRET_KEY, TOKEN_MINUTES

ALGORITHM = "HS256"
_SCRYPT = dict(n=2**14, r=8, p=1)


def _digest(password: str, salt: bytes) -> bytes:
    return hashlib.scrypt(password.encode(), salt=salt, **_SCRYPT)


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    return f"{salt.hex()}${_digest(password, salt).hex()}"


def verify_password(password: str, stored: str) -> bool:
    salt_hex, _, digest_hex = stored.partition("$")
    return hmac.compare_digest(_digest(password, bytes.fromhex(salt_hex)), bytes.fromhex(digest_hex))


# Verified against when the username does not exist, so both failures take equally long.
DUMMY_HASH = hash_password(secrets.token_hex(8))


def create_token(user_id: int) -> str:
    expires = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_MINUTES)
    return jwt.encode({"sub": str(user_id), "exp": expires}, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> int | None:
    """Return the user id, or None if the token is invalid or expired."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])  # algorithm pinned
        return int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        return None
